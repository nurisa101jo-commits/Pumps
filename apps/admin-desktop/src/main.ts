import {app,BrowserWindow} from "electron";
import {spawn,ChildProcess} from "node:child_process";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {createServer,Server} from "node:http";

let api:ChildProcess|undefined;
let local:Server|undefined;
let mainWindow:BrowserWindow|undefined;
const apiPort=4000;
const webPort=4175;

function startApi(){
  const server=join(process.resourcesPath,"api","server.js");
  if(!existsSync(server)){console.warn("[Pumps Admin] Packaged API was not found:",server);return undefined;}
  const child=spawn(process.execPath,[server],{
    env:{...process.env,ELECTRON_RUN_AS_NODE:"1",PORT:String(apiPort),HOST:"127.0.0.1",AUTH_REQUIRED:"false",MIGRATIONS_DIR:join(process.resourcesPath,"api","migrations")},
    stdio:["ignore","ignore","pipe"],windowsHide:true
  });
  child.on("error",e=>console.error("[Pumps Admin] API process error:",e));
  child.stderr?.on("data",d=>console.error("[Pumps Admin] API:",String(d).trim()));
  child.on("exit",(code,signal)=>{if(code!==0)console.error("[Pumps Admin] API exited:",code,signal??"");});
  api=child;return child;
}
async function waitForApi(child:ChildProcess){
  for(let attempt=0;attempt<120;attempt++){
    try{const r=await fetch(`http://127.0.0.1:${apiPort}/health`);if(r.ok)return true;}catch{}
    if(child.exitCode!==null)return false;
    await new Promise(r=>setTimeout(r,500));
  }
  return false;
}
function startWeb(){
  const root=join(process.resourcesPath,"admin");
  local=createServer(async(req,res)=>{
    let path=(req.url??"/").split("?")[0];
    if(path.startsWith("/admin"))path=path.slice(6)||"/";
    const safe=path==="/"?"/index.html":path;
    const file=join(root,safe.replace(/^\//,""));
    const fallback=join(root,"index.html");
    const target=existsSync(file)?file:fallback;
    const ext=target.split(".").pop();
    const type=ext==="js"?"text/javascript":ext==="css"?"text/css":ext==="svg"?"image/svg+xml":ext==="json"?"application/json":"text/html";
    try{const {readFile}=await import("node:fs/promises");const data=await readFile(target);res.writeHead(200,{"Content-Type":type});res.end(data);}
    catch{res.writeHead(404);res.end("Not found");}
  }).listen(webPort,"127.0.0.1");
}
async function createWindow(){
  mainWindow=new BrowserWindow({width:1500,height:950,minWidth:1150,minHeight:720,webPreferences:{contextIsolation:true,nodeIntegration:false}});
  await mainWindow.loadURL(`http://127.0.0.1:${webPort}/admin/`);
}
app.setAppUserModelId("com.company.pumps.admin");
app.whenReady().then(async()=>{
  startWeb();await createWindow();
  const child=startApi();
  if(!child)return;
  const ready=await waitForApi(child);
  console.info("[Pumps Admin] Local API",ready?"is ready":"is unavailable; UI remains open");
});
app.on("window-all-closed",()=>{api?.kill();local?.close();if(process.platform!=="darwin")app.quit();});
app.on("before-quit",()=>{api?.kill();local?.close();});