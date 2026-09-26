import {app,BrowserWindow,Menu} from "electron";
import {spawn,ChildProcess} from "node:child_process";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {createServer,Server} from "node:http";

let api:ChildProcess|undefined;
let local:Server|undefined;
let mainWindow:BrowserWindow|undefined;
const apiPort=4000;
const webPort=4174;

function startApi(){
 const server=join(process.resourcesPath,"api","server.js");
 if(!existsSync(server)){
  console.warn("[Pumps] Packaged API was not found:",server);
  return undefined;
 }
 const child=spawn(process.execPath,[server],{
  env:{...process.env,ELECTRON_RUN_AS_NODE:"1",PORT:String(apiPort),HOST:"127.0.0.1",AUTH_REQUIRED:"false",MIGRATIONS_DIR:join(process.resourcesPath,"api","migrations")},
  stdio:["ignore","ignore","pipe"],
  windowsHide:true
 });
 child.on("error",error=>console.error("[Pumps] Local API process error:",error));
 child.stderr?.on("data",data=>console.error("[Pumps] Local API:",String(data).trim()));
 child.on("exit",(code,signal)=>{
  if(code!==0)console.error("[Pumps] Local API exited:",code,signal??"");
 });
 api=child;
 return child;
}

async function waitForApi(child:ChildProcess){
 for(let attempt=0;attempt<120;attempt++){
  try{
   const response=await fetch(`http://127.0.0.1:${apiPort}/health`);
   if(response.ok)return true;
  }catch{}
  if(child.exitCode!==null)return false;
  await new Promise(r=>setTimeout(r,500));
 }
 return false;
}

function startWeb(){
 const root=join(process.resourcesPath,"selection");
 local=createServer(async(req,res)=>{
  const path=(req.url??"/").split("?")[0];
  const safe=path==="/" ? "/index.html" : path;
  const file=join(root,safe.replace(/^\//,""));
  const fallback=join(root,"index.html");
  const target=existsSync(file)?file:fallback;
  const ext=target.split(".").pop();
  const type=ext==="js"?"text/javascript":ext==="css"?"text/css":ext==="svg"?"image/svg+xml":"text/html";
  try{
   const {readFile}=await import("node:fs/promises");
   const data=await readFile(target);
   res.writeHead(200,{"Content-Type":type});
   res.end(data);
  }catch{
   res.writeHead(404);
   res.end("Not found");
  }
 }).listen(webPort,"127.0.0.1");
}

async function createWindow(){
 mainWindow=new BrowserWindow({
  width:1440,
  height:900,
  minWidth:1100,
  minHeight:700,
  webPreferences:{contextIsolation:true,nodeIntegration:false}
 });
 await mainWindow.loadURL(`http://127.0.0.1:${webPort}/`);
}

app.setAppUserModelId("com.company.pumps");

app.whenReady().then(async()=>{
 // The desktop UI must remain available even when the optional local API
 // cannot start. API-dependent features will report their connection error
 // inside the web application instead of terminating the desktop app.
 startWeb();
 await createWindow();

 const child=startApi();
 if(!child){
  console.warn("[Pumps] Starting without local API.");
  return;
 }

 const ready=await waitForApi(child);
 if(ready){
  console.info("[Pumps] Local API is ready on port",apiPort);
 }else{
  console.warn("[Pumps] Local API is unavailable; desktop UI remains open.");
 }
});

app.on("window-all-closed",()=>{
 api?.kill();
 local?.close();
 if(process.platform!=="darwin")app.quit();
});
app.on("before-quit",()=>{
 api?.kill();
 local?.close();
});