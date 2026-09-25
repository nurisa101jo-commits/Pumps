import type {Pool} from "pg";
import {randomUUID} from "node:crypto";
import {persistCatalogItem,recordAudit,type CatalogStore} from "./catalog-service";
import type {IngestionStore} from "./ingestion-service";
import type {SourceReference} from "@pumps/domain/source";

function sourceOf(x:any):SourceReference[]{if(!x)return[];if(Array.isArray(x.sources))return x.sources;return x.source?[x.source]:[]}

export type PublicationStore={pool?:Pool;publications:Map<string,any>};
export function createPublicationStore(pool?:Pool):PublicationStore{return{pool,publications:new Map()}};
export async function loadPublications(store:PublicationStore){if(!store.pool)return;const rows=await store.pool.query('SELECT id,candidate_id AS "candidateId",approved_record_id AS "approvedRecordId",published_by AS "publishedBy",published_at AS "publishedAt",entity_type AS "entityType",entity_id AS "entityId",created_entity AS "createdEntity",payload_json FROM ingestion_publications ORDER BY published_at DESC');store.publications.clear();for(const x of rows.rows)store.publications.set(x.id,{...x,payload:JSON.parse(x.payload_json)})}

function value<T>(x:any):T{return x&&typeof x==="object"&&"value" in x?x.value:x}
function idFrom(code:string|undefined,fallback:string){return code?code.replace(/[^a-zA-Z0-9_-]+/g,"-").toLowerCase()||fallback:fallback}

async function publishCatalogPayload(ingestion:IngestionStore,catalog:CatalogStore,candidate:any,publishedBy:string,linkSource:(entityType:string,entityId:string,fieldName:string,source:SourceReference)=>Promise<void>){
 const raw=candidate.payload as any;
 const data=raw.catalog??raw;
 if(!data.series||!Array.isArray(data.models))throw new Error("Catalog candidate requires series and models");
 const seriesId=idFrom(value<string>(data.series.code),randomUUID());
 const series={id:seriesId,code:value<string>(data.series.code),name:value<string>(data.series.name),description:value<string|undefined>(data.series.description)};
 if(catalog.series.has(seriesId))throw new Error("Catalog series already exists: "+seriesId);
 catalog.series.set(seriesId,series);for(const s of sourceOf(data.series.code))await linkSource("pump_series",seriesId,"code",s);for(const s of sourceOf(data.series.name))await linkSource("pump_series",seriesId,"name",s);
 const created:any={series,models:[],motors:[],configurations:[],dimensions:[],curves:[]};
 for(const m of data.models){
  const modelId=randomUUID();
  const model={id:modelId,seriesId,code:value<string>(m.code),name:value<string>(m.name),description:value<string|undefined>(m.description)};
  catalog.models.set(modelId,model);created.models.push(model);for(const s of sourceOf(m.code))await linkSource("pump_model",modelId,"code",s);for(const s of sourceOf(m.name))await linkSource("pump_model",modelId,"name",s);
  for(const c of m.configurations??[]){
   const configId=randomUUID();
   let motorId:string|undefined;
   if(c.motor){
    motorId=randomUUID();
    const motor={id:motorId,code:value<string|undefined>(c.motor.code),powerKw:value<number>(c.motor.powerKw),voltageV:value<number|undefined>(c.motor.voltageV),phase:value<1|3|undefined>(c.motor.phase),frequencyHz:value<50|60|undefined>(c.motor.frequencyHz),speedRpm:value<number|undefined>(c.motor.speedRpm)};
    catalog.motors.set(motorId,motor);created.motors.push(motor);for(const [field,v] of Object.entries(c.motor)){if(field==="source")continue;for(const s of sourceOf(v))await linkSource("motor",motorId,field,s)}
   }
   if(!motorId)throw new Error("Configuration "+value<string>(c.code)+" is missing motor data");
   const config={id:configId,modelId,code:value<string>(c.code),name:value<string|undefined>(c.name),motorId,seal:value<string|undefined>(c.seal),connection:value<string|undefined>(c.connection),impeller:value<string|undefined>(c.impeller),materials:Object.fromEntries(Object.entries(c.materials??{}).map(([k,v]:any)=>[k,value<string>(v)])),active:true};
   catalog.configurations.set(configId,config);created.configurations.push(config);for(const [field,v] of Object.entries(c)){if(["curves","dimensions","motor","source"].includes(field))continue;for(const s of sourceOf(v))await linkSource("configuration",configId,field,s)}
   if(c.dimensions){
    const d={id:randomUUID(),configurationId:configId,lengthMm:value<number|undefined>(c.dimensions.lengthMm),widthMm:value<number|undefined>(c.dimensions.widthMm),heightMm:value<number|undefined>(c.dimensions.heightMm),weightKg:value<number|undefined>(c.dimensions.weightKg)};
    catalog.dimensions.set(d.id,d);created.dimensions.push(d);for(const [field,v] of Object.entries(c.dimensions)){if(field==="source")continue;for(const s of sourceOf(v))await linkSource("dimension",d.id,field,s)}
   }
   for(const cv of c.curves??[]){
    const curveId=randomUUID();
    const curve={id:curveId,configurationId:configId,kind:cv.kind,unit:value<string>(cv.unit),speedRpm:value<number>(cv.speedRpm),frequencyHz:value<number>(cv.frequencyHz),points:(cv.points??[]).map((p:any)=>({q:value<number>(p.q),value:value<number>(p.value)}))};
    catalog.curves.set(curveId,curve);created.curves.push(curve);for(const field of ["unit","speedRpm","frequencyHz"]){for(const s of sourceOf((cv as any)[field]))await linkSource("curve",curveId,field,s)}for(let pi=0;pi<(cv.points??[]).length;pi++){for(const s of sourceOf((cv.points as any)[pi].q))await linkSource("curve",curveId,"points."+pi+".q",s);for(const s of sourceOf((cv.points as any)[pi].value))await linkSource("curve",curveId,"points."+pi+".value",s)}
   }
  }
 }
 if(catalog.pool){
  const client=await catalog.pool.connect();
  try{
   await client.query("BEGIN");
   await client.query("INSERT INTO pump_series(id,code,name,description) VALUES($1,$2,$3,$4)",[series.id,series.code,series.name,series.description??null]);
   for(const m of created.models)await client.query("INSERT INTO pump_models(id,series_id,code,name) VALUES($1,$2,$3,$4)",[m.id,m.seriesId,m.code,m.name]);
   for(const motor of created.motors)await client.query("INSERT INTO motors(id,power_kw,voltage_v,phase,frequency_hz,speed_rpm) VALUES($1,$2,$3,$4,$5,$6)",[motor.id,motor.powerKw,motor.voltageV??null,motor.phase??null,motor.frequencyHz??null,motor.speedRpm??null]);
   for(const c of created.configurations)await client.query("INSERT INTO pump_configurations(id,model_id,code,motor_id,seal,connection,materials_json,weight_kg,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[c.id,c.modelId,c.code,c.motorId,c.seal??null,c.connection??null,JSON.stringify(c.materials??{}),c.weightKg??null,c.active]);
   for(const d of created.dimensions)await client.query("INSERT INTO dimensions(id,configuration_id,length_mm,width_mm,height_mm,weight_kg) VALUES($1,$2,$3,$4,$5,$6)",[d.id,d.configurationId,d.lengthMm??null,d.widthMm??null,d.heightMm??null,d.weightKg??null]);
   for(const cv of created.curves){await client.query("INSERT INTO performance_curves(id,configuration_id,kind,unit,speed_rpm,frequency_hz) VALUES($1,$2,$3,$4,$5,$6)",[cv.id,cv.configurationId,cv.kind,cv.unit,cv.speedRpm,cv.frequencyHz]);for(const p of cv.points)await client.query("INSERT INTO curve_points(id,curve_id,q,value) VALUES($1,$2,$3,$4)",[randomUUID(),cv.id,p.q,p.value])}
   await client.query("COMMIT");
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
 }
 recordAudit(catalog,{id:randomUUID(),entityType:"pump_series",entityId:series.id,action:"publish_catalog_from_ingestion",actorId:publishedBy,timestamp:new Date().toISOString(),after:created});
 return created;
}

export async function publishCandidate(ingestion:IngestionStore,publication:PublicationStore,catalog:CatalogStore,candidateId:string,input:{publishedBy:string;entityType:"pump_series"|"pump_model"|"motor"|"configuration"|"catalog";entityId?:string}){
 const c=ingestion.candidates.get(candidateId);if(!c)throw new Error("Candidate not found");
 if(c.status!=="approved")throw new Error("Candidate must be approved before publication");
 const approval=[...ingestion.approvals.values()].find(x=>x.candidateId===candidateId);if(!approval)throw new Error("Approval record not found");
 if(input.entityType==="catalog"){
  const linkSource=async(entityType:string,entityId:string,fieldName:string,source:SourceReference)=>{const documentStore=(catalog as any).documentStore;const sourceId=(source as any).id;if(documentStore&&sourceId)await documentStore.links.push({entityType,entityId,sourceReferenceId:sourceId,fieldName});if(publication.pool&&sourceId)await publication.pool.query("INSERT INTO entity_source_references(entity_type,entity_id,source_reference_id,field_name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",[entityType,entityId,sourceId,fieldName])};
  const created=await publishCatalogPayload(ingestion,catalog,c,input.publishedBy,linkSource);
  const id=randomUUID(),publishedAt=new Date().toISOString();
  const item={id,candidateId,approvedRecordId:approval.id,publishedBy:input.publishedBy,publishedAt,entityType:"catalog",entityId:created.series.id,createdEntity:true,payload:created};
  if(publication.pool)await publication.pool.query("INSERT INTO ingestion_publications(id,candidate_id,approved_record_id,published_by,published_at,entity_type,entity_id,created_entity,payload_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id,candidateId,approval.id,input.publishedBy,publishedAt,"catalog",created.series.id,true,JSON.stringify(created)]);
  publication.publications.set(id,item);return item;
 }
 const id=input.entityId??randomUUID(),payload={...(c.payload as any),id};
 const kind=input.entityType==="pump_series"?"series":input.entityType==="pump_model"?"model":input.entityType==="motor"?"motor":"configuration";
 if(kind==="series")catalog.series.set(id,payload);else if(kind==="model")catalog.models.set(id,payload);else if(kind==="motor")catalog.motors.set(id,payload);else catalog.configurations.set(id,payload);
 await persistCatalogItem(catalog,kind,payload);
 const item={id,candidateId,approvedRecordId:approval.id,publishedBy:input.publishedBy,publishedAt:new Date().toISOString(),entityType:input.entityType,entityId:id,createdEntity:!input.entityId,payload};
 if(publication.pool)await publication.pool.query("INSERT INTO ingestion_publications(id,candidate_id,approved_record_id,published_by,published_at,entity_type,entity_id,created_entity,payload_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id,candidateId,approval.id,item.publishedBy,item.publishedAt,item.entityType,item.entityId,item.createdEntity,JSON.stringify(c.payload)]);
 publication.publications.set(id,item);recordAudit(catalog,{id:randomUUID(),entityType:item.entityType,entityId:item.entityId,action:"publish_from_ingestion",actorId:input.publishedBy,timestamp:item.publishedAt,after:payload});return item;
}
