import type {AuditEvent} from "@pumps/domain/audit";
import type {Pool} from "pg";
import {randomUUID} from "node:crypto";
import type {EngineeringRule} from "@pumps/domain/rules";
import type {EngineeringOptionStore} from "./engineering-options";

export type CatalogStore={series:Map<string,any>;models:Map<string,any>;motors:Map<string,any>;configurations:Map<string,any>;curves:Map<string,any>;dimensions:Map<string,any>;rules:Map<string,EngineeringRule>;audit:AuditEvent[];pool?:Pool | undefined};
export function createCatalogStore(pool?:Pool | undefined):CatalogStore{return{series:new Map(),models:new Map(),motors:new Map(),configurations:new Map(),curves:new Map(),dimensions:new Map(),rules:new Map(),audit:[],pool}}
export function assertUnique(store:CatalogStore,collection:keyof Pick<CatalogStore,"series"|"models"|"motors"|"configurations"|"curves"|"dimensions">,field:string,value:unknown,ignoreId?:string){for(const [id,item] of store[collection])if(id!==ignoreId&&item[field]===value)throw new Error("Duplicate "+collection+"."+field+": "+String(value))}
export function undoLastAudit(store:CatalogStore,entityType:string,entityId:string){
 const events=store.audit.filter(x=>x.entityType===entityType&&x.entityId===entityId);
 const last=events.at(-1); if(!last)throw new Error("No reversible audit event found");
 const target=entityType==="pump_configuration"?store.configurations:entityType==="pump_model"?store.models:entityType==="pump_series"?store.series:entityType==="motor"?store.motors:null;
 if(!target)throw new Error("Entity type is not reversible");
 if(last.before===undefined)target.delete(entityId);else target.set(entityId,last.before as any); return last;
}
export function redoLastAudit(store:CatalogStore,entityType:string,entityId:string){
 const events=store.audit.filter(x=>x.entityType===entityType&&x.entityId===entityId);
 const last=events.at(-1); if(!last||last.after===undefined)throw new Error("No redoable audit event found");
 const target=entityType==="pump_configuration"?store.configurations:entityType==="pump_model"?store.models:entityType==="pump_series"?store.series:entityType==="motor"?store.motors:null;
 if(!target)throw new Error("Entity type is not redoable");
 target.set(entityId,last.after as any); return last;
}
export function recordAudit(store:CatalogStore,event:AuditEvent){store.audit.push(event)}
export async function recordAuditPersistent(store:CatalogStore,event:AuditEvent){recordAudit(store,event);if(store.pool)await store.pool.query("INSERT INTO audit_events(id,entity_type,entity_id,action,actor_id,timestamp,before_json,after_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[event.id,event.entityType,event.entityId,event.action,event.actorId,event.timestamp,event.before===undefined?null:JSON.stringify(event.before),event.after===undefined?null:JSON.stringify(event.after)])}
export function snapshotCatalog(store:CatalogStore){return{series:[...store.series.values()],models:[...store.models.values()],motors:[...store.motors.values()],configurations:[...store.configurations.values()],dimensions:[...store.dimensions.values()],curves:[...store.curves.values()]}}
export function restoreCatalogSnapshot(store:CatalogStore,snapshot:any){store.series=new Map(snapshot.series.map((x:any)=>[x.id,x]));store.models=new Map(snapshot.models.map((x:any)=>[x.id,x]));store.motors=new Map(snapshot.motors.map((x:any)=>[x.id,x]));store.configurations=new Map(snapshot.configurations.map((x:any)=>[x.id,x]));store.dimensions=new Map(snapshot.dimensions.map((x:any)=>[x.id,x]));store.curves=new Map(snapshot.curves.map((x:any)=>[x.id,x]))}
export async function restoreCatalogToDatabase(store:CatalogStore,snapshot:any,engineering?:EngineeringOptionStore){
 if(!store.pool)return;
 const required=["series","models","motors","configurations","dimensions","curves","rules"];
 for(const key of required)if(!Array.isArray(snapshot?.[key]))throw new Error("Invalid catalog snapshot."+key);
 const client=await store.pool.connect();
 try{
  await client.query("BEGIN");
  await client.query("DELETE FROM curve_points");
  await client.query("DELETE FROM performance_curves");
  await client.query("DELETE FROM dimensions");
  await client.query("DELETE FROM pump_configurations");
  await client.query("DELETE FROM pump_models");
  await client.query("DELETE FROM pump_series");
  await client.query("DELETE FROM motors");
  await client.query("DELETE FROM engineering_rules");
  if(engineering){
   for(const table of ["configuration_options","materials","seals","connections","impellers","accessories"])await client.query(`DELETE FROM ${table}`);
  }
  for(const x of snapshot.series)await client.query("INSERT INTO pump_series(id,code,name,description) VALUES($1,$2,$3,$4)",[x.id,x.code,x.name,x.description??null]);
  for(const x of snapshot.models)await client.query("INSERT INTO pump_models(id,series_id,code,name) VALUES($1,$2,$3,$4)",[x.id,x.seriesId,x.code,x.name]);
  for(const x of snapshot.motors)await client.query("INSERT INTO motors(id,power_kw,voltage_v,phase,frequency_hz,speed_rpm) VALUES($1,$2,$3,$4,$5,$6)",[x.id,x.powerKw,x.voltageV??null,x.phase??null,x.frequencyHz??null,x.speedRpm??null]);
  for(const x of snapshot.configurations)await client.query("INSERT INTO pump_configurations(id,model_id,code,motor_id,seal,connection,materials_json,weight_kg,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[x.id,x.modelId,x.code,x.motorId,x.seal??null,x.connection??null,JSON.stringify(x.materials??{}),x.weightKg??null,x.active!==false]);
  for(const x of snapshot.dimensions)await client.query("INSERT INTO dimensions(id,configuration_id,length_mm,width_mm,height_mm,weight_kg) VALUES($1,$2,$3,$4,$5,$6)",[x.id,x.configurationId,x.lengthMm??null,x.widthMm??null,x.heightMm??null,x.weightKg??null]);
  for(const x of snapshot.curves){await client.query("INSERT INTO performance_curves(id,configuration_id,kind,unit,speed_rpm,frequency_hz,source_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[x.id,x.configurationId,x.kind,x.unit,x.speedRpm,x.frequencyHz,x.sourceId??null]);for(const p of x.points??[])await client.query("INSERT INTO curve_points(id,curve_id,q,value) VALUES($1,$2,$3,$4)",[randomUUID(),x.id,p.q,p.value])}
  for(const x of snapshot.rules)await client.query("INSERT INTO engineering_rules(id,code,name,enabled,severity,kind,expression,parameters_json,configuration_ids_json,option_kind,option_ids_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[x.id,x.code,x.name,x.enabled,x.severity,x.kind,x.expression??"",JSON.stringify(x.parameters??{}),JSON.stringify(x.configurationIds??null),x.optionKind??null,JSON.stringify(x.optionIds??null)]);
  if(engineering){for(const kind of ["material","seal","connection","impeller","accessory"] as const){for(const x of engineering.options.get(kind)?.values()??[])await client.query(`INSERT INTO ${kind==="material"?"materials":kind==="seal"?"seals":kind==="connection"?"connections":kind==="impeller"?"impellers":"accessories"}(id,code,name,description,active) VALUES($1,$2,$3,$4,$5)`,[x.id,x.code,x.name,x.description??null,x.active!==false]);}for(const [configurationId,links] of engineering.links){for(const link of links)await client.query("INSERT INTO configuration_options(configuration_id,option_kind,option_id) VALUES($1,$2,$3)",[configurationId,link.kind,link.optionId]);}}
  await client.query("COMMIT");
  await loadCatalog(store);
  if(engineering){const {loadEngineeringOptions}=await import("./engineering-options");await loadEngineeringOptions(engineering)}
 }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

export async function persistCatalogItem(store:CatalogStore,kind:"series"|"model"|"motor"|"configuration"|"dimension"|"curve",item:any){
 if(!store.pool)return;
 const q=store.pool;
 if(kind==="series")await q.query("INSERT INTO pump_series(id,code,name,description) VALUES($1,$2,$3,$4)",[item.id,item.code,item.name,item.description??null]);
 if(kind==="model")await q.query("INSERT INTO pump_models(id,series_id,code,name) VALUES($1,$2,$3,$4)",[item.id,item.seriesId,item.code,item.name]);
 if(kind==="motor")await q.query("INSERT INTO motors(id,power_kw,voltage_v,phase,frequency_hz,speed_rpm) VALUES($1,$2,$3,$4,$5,$6)",[item.id,item.powerKw,item.voltageV??null,item.phase??null,item.frequencyHz??null,item.speedRpm??null]);
 if(kind==="configuration")await q.query("INSERT INTO pump_configurations(id,model_id,code,motor_id,seal,connection,materials_json,weight_kg,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[item.id,item.modelId,item.code,item.motorId,item.seal??null,item.connection??null,JSON.stringify(item.materials??{}),item.weightKg??null,item.active!==false]);
 if(kind==="dimension")await q.query("INSERT INTO dimensions(id,configuration_id,length_mm,width_mm,height_mm,weight_kg) VALUES($1,$2,$3,$4,$5,$6)",[item.id,item.configurationId,item.lengthMm??null,item.widthMm??null,item.heightMm??null,item.weightKg??null]);
 if(kind==="curve"){await q.query("INSERT INTO performance_curves(id,configuration_id,kind,unit,speed_rpm,frequency_hz,source_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[item.id,item.configurationId,item.kind,item.unit,item.speedRpm,item.frequencyHz,item.sourceId??null]);for(const p of item.points??[])await q.query("INSERT INTO curve_points(id,curve_id,q,value) VALUES($1,$2,$3,$4)",[randomUUID(),item.id,p.q,p.value])}
}
export async function loadCatalog(store:CatalogStore){
 if(!store.pool)return;
 const q=store.pool;
 for(const x of (await q.query("SELECT id,code,name,description FROM pump_series")).rows)store.series.set(x.id,{id:x.id,code:x.code,name:x.name,description:x.description});
 for(const x of (await q.query("SELECT id,series_id AS \"seriesId\",code,name FROM pump_models")).rows)store.models.set(x.id,x);
 for(const x of (await q.query("SELECT id,power_kw AS \"powerKw\",voltage_v AS \"voltageV\",phase,frequency_hz AS \"frequencyHz\",speed_rpm AS \"speedRpm\" FROM motors")).rows)store.motors.set(x.id,x);
 for(const x of (await q.query("SELECT id,model_id AS \"modelId\",code,motor_id AS \"motorId\",seal,connection,materials_json,weight_kg AS \"weightKg\",active FROM pump_configurations")).rows){x.materials=JSON.parse(x.materials_json??"{}");delete x.materials_json;store.configurations.set(x.id,x)}
 for(const x of (await q.query("SELECT id,configuration_id AS \"configurationId\",length_mm AS \"lengthMm\",width_mm AS \"widthMm\",height_mm AS \"heightMm\",weight_kg AS \"weightKg\" FROM dimensions")).rows)store.dimensions.set(x.id,x);
 for(const x of (await q.query("SELECT id,configuration_id AS \"configurationId\",kind,unit,speed_rpm AS \"speedRpm\",frequency_hz AS \"frequencyHz\",source_id AS \"sourceId\" FROM performance_curves")).rows){const points=(await q.query("SELECT q,value FROM curve_points WHERE curve_id=$1 ORDER BY q",[x.id])).rows;store.curves.set(x.id,{...x,points})}
 const auditRows=(await q.query("SELECT id,entity_type AS \"entityType\",entity_id AS \"entityId\",action,actor_id AS \"actorId\",timestamp,before_json,after_json FROM audit_events ORDER BY timestamp,id")).rows;store.audit=auditRows.map((x:any)=>({...x,before:x.before_json?JSON.parse(x.before_json):undefined,after:x.after_json?JSON.parse(x.after_json):undefined}));
 for(const x of (await q.query("SELECT id,code,name,enabled,severity,kind,expression,parameters_json FROM engineering_rules WHERE enabled=TRUE")).rows)store.rules.set(x.id,{...x,parameters:JSON.parse(x.parameters_json??"{}")});
}