import {mkdir,writeFile,readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
import {randomUUID,createHash} from "node:crypto";
import type {CatalogStore} from "./catalog-service";
import {loadCatalog,restoreCatalogToDatabase} from "./catalog-service";
import type {EngineeringOptionStore} from "./engineering-options";

export type BackupRecord={id:string;type:"manual"|"automatic";startedAt:string;completedAt?:string;status:"running"|"completed"|"failed";location?:string;checksum?:string};

export async function createCatalogBackup(store:CatalogStore,type:"manual"|"automatic"="manual",directory=process.env.BACKUP_DIR??"./backups",engineering?:EngineeringOptionStore){
 const id=randomUUID(),startedAt=new Date().toISOString(),record:BackupRecord={id,type,startedAt,status:"running"};
 try{
  await mkdir(directory,{recursive:true});
  const payload={version:3,createdAt:startedAt,catalog:{series:[...store.series.values()],models:[...store.models.values()],motors:[...store.motors.values()],configurations:[...store.configurations.values()],dimensions:[...store.dimensions.values()],curves:[...store.curves.values()],rules:[...store.rules.values()]},engineering:engineering?{options:Object.fromEntries([...engineering.options.entries()].map(([kind,map])=>[kind,[...map.values()]])),links:[...engineering.links.entries()]}:undefined,audit:store.audit};
  const location=join(directory,id+".json");const text=JSON.stringify(payload);const checksum=createHash("sha256").update(text).digest("hex");
  await writeFile(location,text,"utf8");
  record.status="completed";record.completedAt=new Date().toISOString();record.location=location;record.checksum=checksum;
  return record;
 }catch(error){record.status="failed";record.completedAt=new Date().toISOString();throw error}
}

export async function listCatalogBackups(directory=process.env.BACKUP_DIR??"./backups"){
 try{return(await readdir(directory)).filter(x=>x.endsWith(".json")).sort().reverse()}catch{return[]}
}
export async function readCatalogBackup(fileName:string,directory=process.env.BACKUP_DIR??"./backups"){
 if(fileName.includes("/")||fileName.includes("\\")||!fileName.endsWith(".json"))throw new Error("Invalid backup file");
 return JSON.parse(await readFile(join(directory,fileName),"utf8"));
}

export async function restoreCatalogBackup(store:CatalogStore,backup:any,engineering?:EngineeringOptionStore){
 if(!backup||!([1,2,3] as number[]).includes(backup.version)||!backup.catalog)throw new Error("Invalid catalog backup");
 const required=["series","models","motors","configurations","dimensions","curves","rules"];
 for(const key of required)if(!Array.isArray(backup.catalog[key]))throw new Error("Invalid backup catalog."+key);
 const snapshot=backup.catalog;
 if(engineering&&backup.engineering?.options){for(const kind of ["material","seal","connection","impeller","accessory"] as const){const values=Array.isArray(backup.engineering.options[kind])?backup.engineering.options[kind]:[];const map=engineering.options.get(kind)!;map.clear();for(const x of values)map.set(x.id,{...x,kind});}engineering.links=new Map((Array.isArray(backup.engineering.links)?backup.engineering.links:[]));}
 store.series=new Map(snapshot.series.map((x:any)=>[x.id,x]));
 store.models=new Map(snapshot.models.map((x:any)=>[x.id,x]));
 store.motors=new Map(snapshot.motors.map((x:any)=>[x.id,x]));
 store.configurations=new Map(snapshot.configurations.map((x:any)=>[x.id,x]));
 store.dimensions=new Map(snapshot.dimensions.map((x:any)=>[x.id,x]));
 store.curves=new Map(snapshot.curves.map((x:any)=>[x.id,x])); store.rules=new Map(snapshot.rules.map((x:any)=>[x.id,x]));
 if(Array.isArray(backup.audit))store.audit=backup.audit;
 if(store.pool){await restoreCatalogToDatabase(store,snapshot,engineering);await loadCatalog(store)}
 return {restoredAt:new Date().toISOString(),counts:Object.fromEntries(required.map(k=>[k,snapshot[k].length]))};
}
