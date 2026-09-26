import {mkdir,writeFile,readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
import {randomUUID,createHash} from "node:crypto";
import type {CatalogStore} from "./catalog-service";
import {loadCatalog,restoreCatalogToDatabase} from "./catalog-service";
import type {EngineeringOptionStore} from "./engineering-options";
import type {DocumentStore} from "./document-service";

export type BackupRecord={id:string;type:"manual"|"automatic";startedAt:string;completedAt?:string;status:"running"|"completed"|"failed";location?:string;checksum?:string};

export async function createCatalogBackup(store:CatalogStore,type:"manual"|"automatic"="manual",directory=process.env.BACKUP_DIR??"./backups",engineering?:EngineeringOptionStore,documents?:DocumentStore){
 const id=randomUUID(),startedAt=new Date().toISOString(),record:BackupRecord={id,type,startedAt,status:"running"};
 try{
  await mkdir(directory,{recursive:true});
  const payload={version:3,createdAt:startedAt,catalog:{series:[...store.series.values()],models:[...store.models.values()],motors:[...store.motors.values()],configurations:[...store.configurations.values()],dimensions:[...store.dimensions.values()],curves:[...store.curves.values()],rules:[...store.rules.values()]},engineering:engineering?{options:Object.fromEntries([...engineering.options.entries()].map(([kind,map])=>[kind,[...map.values()]])),links:[...engineering.links.entries()]}:undefined,documents:documents?{items:[...documents.documents.values()],references:[...documents.references.values()],links:documents.links}:undefined,audit:store.audit};
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

export async function restoreCatalogBackup(store:CatalogStore,backup:any,engineering?:EngineeringOptionStore,documents?:DocumentStore){
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
 if(store.pool){await restoreCatalogToDatabase(store,snapshot,engineering);if(documents&&backup.documents){const client=await store.pool.connect();try{await client.query("BEGIN");for(const d of backup.documents.items??[])await client.query("INSERT INTO product_documents(id,name,file_name,mime_type,storage_key,checksum,uploaded_at,uploaded_by,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,file_name=EXCLUDED.file_name,mime_type=EXCLUDED.mime_type,storage_key=EXCLUDED.storage_key,checksum=EXCLUDED.checksum,uploaded_at=EXCLUDED.uploaded_at,uploaded_by=EXCLUDED.uploaded_by,description=EXCLUDED.description",[d.id,d.name,d.fileName,d.mimeType,d.storageKey,d.checksum??null,d.uploadedAt,d.uploadedBy,d.description??null]);for(const r of backup.documents.references??[])await client.query("INSERT INTO source_references(id,document_id,page,table_name,region,excerpt) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET document_id=EXCLUDED.document_id,page=EXCLUDED.page,table_name=EXCLUDED.table_name,region=EXCLUDED.region,excerpt=EXCLUDED.excerpt",[r.id,r.documentId,r.page??null,r.table??null,r.region??null,r.excerpt??null]);for(const l of backup.documents.links??[])await client.query("INSERT INTO entity_source_references(entity_type,entity_id,source_reference_id,field_name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",[l.entityType,l.entityId,l.sourceReferenceId,l.fieldName??null]);await client.query("COMMIT")}catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}}await loadCatalog(store);if(documents){const {loadDocuments}=await import("./document-service");await loadDocuments(documents)}}
 return {restoredAt:new Date().toISOString(),counts:Object.fromEntries(required.map(k=>[k,snapshot[k].length]))};
}
