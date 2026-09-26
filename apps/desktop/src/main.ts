import {app,BrowserWindow,dialog} from "electron";
import {spawn,ChildProcess} from "node:child_process";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {createServer,Server} from "node:http";

let api:ChildProcess|undefined;
let local:Server|undefined;
const apiPort=4000;
const webPort=4174;

function startApi(){
 const server=join(process.resourcesPath,"api","server.js");
 if(!existsSync(server))throw new Error("Packaged API was not found");
 api=spawn(process.execPath,[server],{env:{...process.env,ELECTRON_RUN_AS_NODE:"1",PORT:String(apiPort),AUTH_REQUIRED:process.env.AUTH_REQUIRED??"true",MIGRATIONS_DIR:join(process.resourcesPath,"api","migrations")},stdio:"ignore",windowsHide:true});
}
async function waitForApi(){
 const deadline=Date.now()+30000;
 while(Date.now()<deadline){
  try{const response=await fetch(`http://127.0.0.1:${apiPort}/health`);if(response.ok)return; }catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 throw new Error("API did not start within 30 seconds");
}
function startWeb(){
 const root=join(process.resourcesPath,"selection");
 local=createServer(async(req,res)=>{
  const path=(req.url??"/").split("?")[0];
  const safe=path===" /" ? "/index.html" : (path==="/"?"/index.html":path);
  const file=join(root,safe.replace(/^\//,""));
  const fallback=join(root,"index.html");
  const target=existsSync(file)?file:fallback;
  const ext=target.split(".").pop();
  const type=ext==="js"?"text/javascript":ext==="css"?"text/css":ext==="svg"?"image/svg+xml":"text/html";
  try{const {readFile}=await import("node:fs/promises");const data=await readFile(target);res.writeHead(200,{"Content-Type":type});res.end(data)}catch{res.writeHead(404);res.end("Not found")};
 }).listen(webPort,"127.0.0.1");
}
async function createWindow(){
 const win=new BrowserWindow({width:1440,height:900,minWidth:1100,minHeight:700,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 await win.loadURL(`http://127.0.0.1:${webPort}/`);
}
app.whenReady().then(async()=>{
 try{startApi();await waitForApi();startWeb();await createWindow()}catch(error){await dialog.showMessageBox({type:"error",title:"Pumps Platform",message:"The application could not start.",detail:error instanceof Error?error.message:String(error)});app.quit()}
});
app.on("window-all-closed",()=>{api?.kill();local?.close();if(process.platform!=="darwin")app.quit()});
app.on("before-quit",()=>{api?.kill();local?.close()});
