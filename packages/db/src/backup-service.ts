import {mkdir,writeFile,readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import type {CatalogStore} from "./catalog-service";

export type BackupRecord={id:string;type:"manual"|"automatic";startedAt:string;completedAt?:string;status:"running"|"completed"|"failed";location?:string;checksum?:string};

export async function createCatalogBackup(store:CatalogStore,type:"manual"|"automatic"="manual",directory=process.env.BACKUP_DIR??"./backups"){
 const id=randomUUID(),startedAt=new Date().toISOString(),record:BackupRecord={id,type,startedAt,status:"running"};
 try{
  await mkdir(directory,{recursive:true});
  const payload={version:1,createdAt:startedAt,catalog:{series:[...store.series.values()],models:[...store.models.values()],motors:[...store.motors.values()],configurations:[...store.configurations.values()],dimensions:[...store.dimensions.values()],curves:[...store.curves.values()]},audit:store.audit};
  const location=join(directory,id+".json");const text=JSON.stringify(payload);
  await writeFile(location,text,"utf8");
  record.status="completed";record.completedAt=new Date().toISOString();record.location=location;
  return record;
 }catch(error){record.status="failed";record.completedAt=new Date().toISOString();throw error}
}

export async function listCatalogBackups(directory=process.env.BACKUP_DIR??"./backups"){
 try{return(await readdir(directory)).filter(x=>x.endsWith(".json")).sort().reverse()}catch{return[]}
}
export async function readCatalogBackup(fileName:string,directory=process.env.BACKUP_DIR??"./backups"){
 if(fileName.includes("/")||fileName.includes("\")||!fileName.endsWith(".json"))throw new Error("Invalid backup file");
 return JSON.parse(await readFile(join(directory,fileName),"utf8"));
}
