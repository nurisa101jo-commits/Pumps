import type {FastifyInstance} from "fastify";
import {assertUnique,recordAudit} from "@pumps/db/catalog-service";
import {validateConfiguration,validateCurve,validateDimension} from "@pumps/db/catalog-validation";
import type {CatalogStore} from "@pumps/db/catalog-service";
const makeId=()=>crypto.randomUUID();
export function registerCatalogRoutes(app:FastifyInstance,store:CatalogStore){
app.get("/api/v1/catalog/series",async()=>[...store.series.values()]);
app.post("/api/v1/catalog/series",async(req,reply)=>{const x=req.body as any;const item={id:makeId(),...x};assertUnique(store,"series","code",item.code);store.series.set(item.id,item);recordAudit(store,{id:makeId(),entityType:"pump_series",entityId:item.id,action:"create",actorId:String((req.headers as any)["x-actor-id"]??"system"),timestamp:new Date().toISOString(),after:item});return reply.code(201).send(item)});
app.get("/api/v1/catalog/models",async()=>[...store.models.values()]);
app.post("/api/v1/catalog/models",async(req,reply)=>{const x=req.body as any;if(!store.series.has(x.seriesId))return reply.code(400).send({error:"seriesId does not exist"});const item={id:makeId(),...x};assertUnique(store,"models","code",item.code);store.models.set(item.id,item);return reply.code(201).send(item)});
app.get("/api/v1/catalog/motors",async()=>[...store.motors.values()]);
app.post("/api/v1/catalog/motors",async(req,reply)=>{const item={id:makeId(),...(req.body as any)};store.motors.set(item.id,item);return reply.code(201).send(item)});
app.get("/api/v1/catalog/configurations",async()=>[...store.configurations.values()]);
app.post("/api/v1/catalog/configurations",async(req,reply)=>{try{const x=req.body as any;validateConfiguration(store,x);const item={id:makeId(),...x};assertUnique(store,"configurations","code",item.code);store.configurations.set(item.id,item);return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid configuration"})}});
app.post("/api/v1/catalog/curves",async(req,reply)=>{try{const x=req.body as any;validateCurve(store,x);const item={id:makeId(),...x};store.curves.set(item.id,item);return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid curve"})}});
app.post("/api/v1/catalog/dimensions",async(req,reply)=>{try{const x=req.body as any;validateDimension(store,x);const item={id:makeId(),...x};store.dimensions.set(item.id,item);return reply.code(201).send(item)}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid dimensions"})}});
}
