import type {AuditEvent} from "@pumps/domain/audit";
import type {Pool} from "pg";

export type CatalogStore={series:Map<string,any>;models:Map<string,any>;motors:Map<string,any>;configurations:Map<string,any>;curves:Map<string,any>;dimensions:Map<string,any>;audit:AuditEvent[];pool?:Pool};
export function createCatalogStore(pool?:Pool):CatalogStore{return{series:new Map(),models:new Map(),motors:new Map(),configurations:new Map(),curves:new Map(),dimensions:new Map(),audit:[],pool}}
export function assertUnique(store:CatalogStore,collection:keyof Pick<CatalogStore,"series"|"models"|"motors"|"configurations"|"curves"|"dimensions">,field:string,value:unknown,ignoreId?:string){for(const [id,item] of store[collection])if(id!==ignoreId&&item[field]===value)throw new Error("Duplicate "+collection+"."+field+": "+String(value))}
export function recordAudit(store:CatalogStore,event:AuditEvent){store.audit.push(event)}
export async function persistCatalogItem(store:CatalogStore,kind:"series"|"model"|"motor"|"configuration"|"dimension"|"curve",item:any){
 if(!store.pool)return;
 const q=store.pool;
 if(kind==="series")await q.query("INSERT INTO pump_series(id,code,name,description) VALUES($1,$2,$3,$4)",[item.id,item.code,item.name,item.description??null]);
 if(kind==="model")await q.query("INSERT INTO pump_models(id,series_id,code,name) VALUES($1,$2,$3,$4)",[item.id,item.seriesId,item.code,item.name]);
 if(kind==="motor")await q.query("INSERT INTO motors(id,power_kw,voltage_v,phase,frequency_hz,speed_rpm) VALUES($1,$2,$3,$4,$5,$6)",[item.id,item.powerKw,item.voltageV??null,item.phase??null,item.frequencyHz??null,item.speedRpm??null]);
 if(kind==="configuration")await q.query("INSERT INTO pump_configurations(id,model_id,code,motor_id,seal,connection,materials_json,weight_kg,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[item.id,item.modelId,item.code,item.motorId,item.seal??null,item.connection??null,JSON.stringify(item.materials??{}),item.weightKg??null,item.active!==false]);
 if(kind==="dimension")await q.query("INSERT INTO dimensions(id,configuration_id,length_mm,width_mm,height_mm,weight_kg) VALUES($1,$2,$3,$4,$5,$6)",[item.id,item.configurationId,item.lengthMm??null,item.widthMm??null,item.heightMm??null,item.weightKg??null]);
 if(kind==="curve"){await q.query("INSERT INTO performance_curves(id,configuration_id,kind,unit,speed_rpm,frequency_hz,source_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[item.id,item.configurationId,item.kind,item.unit,item.speedRpm,item.frequencyHz,item.sourceId??null]);for(const p of item.points??[])await q.query("INSERT INTO curve_points(id,curve_id,q,value) VALUES(gen_random_uuid()::text,$1,$2,$3)",[item.id,p.q,p.value])}
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
}