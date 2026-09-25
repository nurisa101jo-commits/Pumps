import type {FastifyInstance} from "fastify";
import {assertUnique,recordAudit,persistCatalogItem} from "@pumps/db/catalog-service";
import {validateConfiguration,validateCurve,validateDimension} from "@pumps/db/catalog-validation";
import {createEngineeringOption,linkConfigurationOption,type EngineeringOptionStore} from "@pumps/db/engineering-options";
import type {EngineeringOptionKind} from "@pumps/domain/configuration-options";
import type {CatalogStore} from "@pumps/db/catalog-service";
const makeId=()=>crypto.randomUUID();
function enrichConfiguration(store:CatalogStore,engineeringStore:EngineeringOptionStore|undefined,x:any){const links=engineeringStore?.links.get(x.id)??[];const options=links.map(link=>engineeringStore?.options.get(link.kind)?.get(link.optionId)).filter(Boolean);return{...x,model:store.models.get(x.modelId)??null,motor:store.motors.get(x.motorId)??null,dimensions:[...store.dimensions.values()].find(d=>d.configurationId===x.id)??null,curves:[...store.curves.values()].filter(c=>c.configurationId===x.id),options}}\nexport function registerCatalogRoutes(app:FastifyInstance,store:CatalogStore,engineeringStore?:EngineeringOptionStore){

app.get("/api/v1/catalog/options/:kind",async(req,reply)=>{
 const kind=(req.params as any).kind as EngineeringOptionKind;
 if(!engineeringStore||!["material","seal","connection","impeller","accessory"].includes(kind))return reply.code(400).send({error:"Invalid option kind"});
 return [...engineeringStore.options.get(kind)!.values()];
});
app.post("/api/v1/catalog/options",async(req,reply)=>{
 try{
  if(!engineeringStore)return reply.code(503).send({error:"Engineering option store unavailable"});
  const x=req.body as any;
  if(!["material","seal","connection","impeller","accessory"].includes(x.kind))throw new Error("Invalid option kind");
  if(!x.code||!x.name)throw new Error("Option code and name are required");
  return reply.code(201).send(await createEngineeringOption(engineeringStore,{kind:x.kind,code:x.code,name:x.name,description:x.description,active:x.active!==false}));
 }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid option"})}
});
app.get("/api/v1/catalog/series",async()=>[...store.series.values()]);
app.post("/api/v1/catalog/series",async(req,reply)=>{const x=req.body as any;const item={id:makeId(),...x};assertUnique(store,"series","code",item.code);store.series.set(item.id,item);await persistCatalogItem(store,"series",item);recordAudit(store,{id:makeId(),entityType:"pump_series",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)});
app.get("/api/v1/catalog/models",async(req)=>{const seriesId=(req.query as any)?.seriesId as string|undefined;return[...store.models.values()].filter(x=>!seriesId||x.seriesId===seriesId)});
app.post("/api/v1/catalog/models",async(req,reply)=>{const x=req.body as any;if(!store.series.has(x.seriesId))return reply.code(400).send({error:"seriesId does not exist"});const item={id:makeId(),...x};assertUnique(store,"models","code",item.code);store.models.set(item.id,item);await persistCatalogItem(store,"model",item);return reply.code(201).send(item)});
app.get("/api/v1/catalog/motors",async()=>[...store.motors.values()]);
app.post("/api/v1/catalog/motors",async(req,reply)=>{const item={id:makeId(),...(req.body as any)};store.motors.set(item.id,item);await persistCatalogItem(store,"motor",item);return reply.code(201).send(item)});
app.get("/api/v1/catalog/configurations",async(req)=>{const modelId=(req.query as any)?.modelId as string|undefined;return[...store.configurations.values()].filter(x=>!modelId||x.modelId===modelId).map(x=>enrichConfiguration(store,engineeringStore,x))});
app.get("/api/v1/catalog/configurations/:configurationId",async(req,reply)=>{const id=(req.params as any).configurationId;const x=store.configurations.get(id);if(!x)return reply.code(404).send({error:"Configuration not found"});return enrichConfiguration(store,engineeringStore,x)});
app.post("/api/v1/catalog/configurations",async(req,reply)=>{try{const x=req.body as any;validateConfiguration(store,x);const item={id:makeId(),...x};assertUnique(store,"configurations","code",item.code);store.configurations.set(item.id,item);await persistCatalogItem(store,"configuration",item);if(engineeringStore)for(const option of (x.optionIds??[])){await linkConfigurationOption(engineeringStore,item.id,option.kind as EngineeringOptionKind,option.id)}return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid configuration"})}});
app.post("/api/v1/catalog/curves",async(req,reply)=>{try{const x=req.body as any;validateCurve(store,x);const item={id:makeId(),...x};store.curves.set(item.id,item);await persistCatalogItem(store,"curve",item);return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid curve"})}});
app.post("/api/v1/catalog/dimensions",async(req,reply)=>{try{const x=req.body as any;validateDimension(store,x);const item={id:makeId(),...x};store.dimensions.set(item.id,item);await persistCatalogItem(store,"dimension",item);return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid dimensions"})}});
}