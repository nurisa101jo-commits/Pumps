import type {FastifyInstance} from "fastify";
import {assertUnique,recordAuditPersistent,persistCatalogItem} from "@pumps/db/catalog-service";
import {validateConfiguration,validateCurve,validateDimension} from "@pumps/db/catalog-validation";
import {createEngineeringOption,linkConfigurationOption,type EngineeringOptionStore} from "@pumps/db/engineering-options";
import type {EngineeringOptionKind} from "@pumps/domain/configuration-options";
import type {CatalogStore} from "@pumps/db/catalog-service";
const makeId=()=>crypto.randomUUID();
function enrichConfiguration(store:CatalogStore,engineeringStore:EngineeringOptionStore|undefined,x:any){const links=engineeringStore?.links.get(x.id)??[];const options=links.map(link=>engineeringStore?.options.get(link.kind)?.get(link.optionId)).filter(Boolean);return{...x,model:store.models.get(x.modelId)??null,motor:store.motors.get(x.motorId)??null,dimensions:[...store.dimensions.values()].find(d=>d.configurationId===x.id)??null,curves:[...store.curves.values()].filter(c=>c.configurationId===x.id),options}}
type AuthHooks={authenticate:(request:any,reply:any)=>unknown;requireRole:(...roles:any[])=>any;actorOf:(request:any)=>{id:string;role:string}};
export function registerCatalogRoutes(app:FastifyInstance,store:CatalogStore,engineeringStore?:EngineeringOptionStore,auth?:AuthHooks){
 const engineer=auth?.requireRole("admin","engineer");
 const actor=(req:any)=>auth?.actorOf(req)?.id??String(req.headers["x-actor-id"]??"system");

function publishedConfigurationIds(store:CatalogStore){
 const ids=new Set<string>();
 for(const event of store.audit){
  if(event.action==="publish_catalog_from_ingestion"){
   for(const item of (event.after as any)?.configurations??[])if(item?.id)ids.add(item.id);
  }
  if(event.action==="publish_from_ingestion" && event.entityType==="configuration" && event.entityId)ids.add(event.entityId);
 }
 return ids;
}
function publicConfigurations(store:CatalogStore,engineeringStore:EngineeringOptionStore|undefined){
 const ids=publishedConfigurationIds(store);
 return [...store.configurations.values()].filter(x=>x.active!==false&&ids.has(x.id)).map(x=>enrichConfiguration(store,engineeringStore,x));
}


app.get("/api/v1/rules",async()=>[...store.rules.values()]);
app.post("/api/v1/rules",{preHandler:engineer},async(req,reply)=>{try{const x=req.body as any;if(!x.code||!x.name||!x.kind)throw new Error("Rule code, name and kind are required");if([...store.rules.values()].some(r=>r.code===x.code))throw new Error("Duplicate rule code");const severity:"warning"|"error"=x.severity==="warning"?"warning":"error";const item={id:makeId(),code:x.code,name:x.name,enabled:x.enabled!==false,severity,kind:x.kind,expression:x.expression??"",parameters:x.parameters??{},configurationIds:x.configurationIds,optionKind:x.optionKind,optionIds:x.optionIds};if(store.pool)await store.pool.query("INSERT INTO engineering_rules(id,code,name,kind,severity,enabled,parameters_json) VALUES($1,$2,$3,$4,$5,$6,$7)",[item.id,item.code,item.name,item.kind,item.severity,item.enabled,JSON.stringify(item.parameters)]);store.rules.set(item.id,item);return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid rule"})}});
app.get("/api/v1/catalog/options/:kind",async(req,reply)=>{
 const kind=(req.params as any).kind as EngineeringOptionKind;
 if(!engineeringStore||!["material","seal","connection","impeller","accessory"].includes(kind))return reply.code(400).send({error:"Invalid option kind"});
 return [...engineeringStore.options.get(kind)!.values()];
});
app.post("/api/v1/catalog/options",{preHandler:engineer},async(req,reply)=>{
 try{
  if(!engineeringStore)return reply.code(503).send({error:"Engineering option store unavailable"});
  const x=req.body as any;
  if(!["material","seal","connection","impeller","accessory"].includes(x.kind))throw new Error("Invalid option kind");
  if(!x.code||!x.name)throw new Error("Option code and name are required");
  return reply.code(201).send(await createEngineeringOption(engineeringStore,{kind:x.kind,code:x.code,name:x.name,description:x.description,active:x.active!==false}));
 }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid option"})}
});
app.get("/api/v1/catalog/public/series",async()=>{
 const configs=publicConfigurations(store,engineeringStore);
 const modelIds=new Set(configs.map(x=>x.modelId));
 const seriesIds=new Set([...modelIds].map(id=>store.models.get(id)?.seriesId).filter(Boolean));
 return [...store.series.values()].filter(x=>seriesIds.has(x.id));
});
app.get("/api/v1/catalog/public/models",async(req)=>{
 const seriesId=(req.query as any)?.seriesId as string|undefined;
 const configs=publicConfigurations(store,engineeringStore);
 const modelIds=new Set(configs.map(x=>x.modelId));
 return [...store.models.values()].filter(x=>modelIds.has(x.id)&&(!seriesId||x.seriesId===seriesId));
});
app.get("/api/v1/catalog/public/configurations",async(req)=>{
 const modelId=(req.query as any)?.modelId as string|undefined;
 return publicConfigurations(store,engineeringStore).filter(x=>!modelId||x.modelId===modelId);
});
app.get("/api/v1/catalog/public/configurations/:configurationId",async(req,reply)=>{
 const id=(req.params as any).configurationId;
 const x=publicConfigurations(store,engineeringStore).find(item=>item.id===id);
 if(!x)return reply.code(404).send({error:"Published configuration not found"});
 return x;
});
app.get("/api/v1/catalog/series",async()=>[...store.series.values()]);
app.post("/api/v1/catalog/series",{preHandler:engineer},async(req,reply)=>{const x=req.body as any;const item={id:makeId(),...x};assertUnique(store,"series","code",item.code);store.series.set(item.id,item);await persistCatalogItem(store,"series",item);await recordAuditPersistent(store,{id:makeId(),entityType:"pump_series",entityId:item.id,action:"create",actorId:actor(req),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)});
app.get("/api/v1/catalog/models",async(req)=>{const seriesId=(req.query as any)?.seriesId as string|undefined;return[...store.models.values()].filter(x=>!seriesId||x.seriesId===seriesId)});
app.post("/api/v1/catalog/models",{preHandler:engineer},async(req,reply)=>{const x=req.body as any;if(!store.series.has(x.seriesId))return reply.code(400).send({error:"seriesId does not exist"});const item={id:makeId(),...x};assertUnique(store,"models","code",item.code);store.models.set(item.id,item);await persistCatalogItem(store,"model",item);await recordAuditPersistent(store,{id:makeId(),entityType:"pump_model",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)});
app.get("/api/v1/catalog/motors",async()=>[...store.motors.values()]);
app.post("/api/v1/catalog/motors",{preHandler:engineer},async(req,reply)=>{const x=req.body as any;if(!Number.isFinite(x.powerKw)||x.powerKw<=0)return reply.code(400).send({error:"Motor powerKw must be positive"});if(x.voltageV!==undefined&&(!Number.isFinite(x.voltageV)||x.voltageV<=0))return reply.code(400).send({error:"Voltage must be positive"});if(x.phase!==undefined&&!([1,3].includes(Number(x.phase))))return reply.code(400).send({error:"Phase must be 1 or 3"});const item={id:makeId(),...x};store.motors.set(item.id,item);await persistCatalogItem(store,"motor",item);await recordAuditPersistent(store,{id:makeId(),entityType:"motor",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)});
app.get("/api/v1/catalog/configurations",async(req)=>{const modelId=(req.query as any)?.modelId as string|undefined;return[...store.configurations.values()].filter(x=>!modelId||x.modelId===modelId).map(x=>enrichConfiguration(store,engineeringStore,x))});
app.get("/api/v1/catalog/configurations/:configurationId",async(req,reply)=>{const id=(req.params as any).configurationId;const x=store.configurations.get(id);if(!x)return reply.code(404).send({error:"Configuration not found"});return enrichConfiguration(store,engineeringStore,x)});
app.post("/api/v1/catalog/configurations",{preHandler:engineer},async(req,reply)=>{try{const x=req.body as any;validateConfiguration(store,x);if(engineeringStore){const seen=new Set<string>();for(const option of (x.optionIds??[])){if(!["material","seal","connection","impeller","accessory"].includes(option.kind))throw new Error("Invalid option kind");if(!engineeringStore.options.get(option.kind)?.has(option.id))throw new Error("Option does not exist for kind: "+option.kind);if(option.kind!=="material" && seen.has(option.kind))throw new Error("Only one option is allowed for kind: "+option.kind);if(option.kind!=="material")seen.add(option.kind)}}const item={id:makeId(),...x};assertUnique(store,"configurations","code",item.code);store.configurations.set(item.id,item);await persistCatalogItem(store,"configuration",item);if(engineeringStore)for(const option of (x.optionIds??[])){await linkConfigurationOption(engineeringStore,item.id,option.kind as EngineeringOptionKind,option.id)}await recordAuditPersistent(store,{id:makeId(),entityType:"pump_configuration",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid configuration"})}});
app.post("/api/v1/catalog/curves",{preHandler:engineer},async(req,reply)=>{try{const x=req.body as any;validateCurve(store,x);const item={id:makeId(),...x};store.curves.set(item.id,item);await persistCatalogItem(store,"curve",item);await recordAuditPersistent(store,{id:makeId(),entityType:"performance_curve",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid curve"})}});
app.post("/api/v1/catalog/dimensions",{preHandler:engineer},async(req,reply)=>{try{const x=req.body as any;validateDimension(store,x);const item={id:makeId(),...x};store.dimensions.set(item.id,item);await persistCatalogItem(store,"dimension",item);await recordAuditPersistent(store,{id:makeId(),entityType:"dimension",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid dimensions"})}});
}