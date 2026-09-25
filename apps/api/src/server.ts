import Fastify from "fastify";
import {selectionEngine,selectFromCatalog} from "@pumps/selection-engine";
import {evaluateRules} from "@pumps/selection-engine/rules";
import {createCatalogStore,loadCatalog} from "@pumps/db/catalog-service";
import {createProjectStore,loadProjects} from "@pumps/db/project-service";
import {createPool,pingDatabase} from "@pumps/db/postgres";
import {registerCatalogRoutes} from "./catalog-routes.js";
import {registerProjectRoutes} from "./project-routes.js";
import {createEngineeringOptionStore,loadEngineeringOptions} from "@pumps/db/engineering-options";
import {createDocumentStore,loadDocuments,linkEntitySource} from "@pumps/db/document-service";

const app=Fastify({logger:true});
const pool=process.env.DATABASE_URL?createPool():undefined;
const catalogStore=createCatalogStore(pool);
const projectStore=createProjectStore(pool);
const engineeringStore=createEngineeringOptionStore(pool);
const documentStore=createDocumentStore(pool);
let databaseReady=false;

async function start(){
 if(pool){await pingDatabase(pool);await loadCatalog(catalogStore);await loadProjects(projectStore);await loadEngineeringOptions(engineeringStore);await loadDocuments(documentStore);databaseReady=true}
 registerCatalogRoutes(app,catalogStore,engineeringStore);
 registerProjectRoutes(app,projectStore);
 app.get("/health",async()=>({status:"ok",service:"pumps-api",version:"0.5.0",database:pool?(databaseReady?"ready":"not-ready"):"memory"}));
 

app.post("/api/v1/source-links",async(request,reply)=>{try{return reply.code(201).send(await linkEntitySource(documentStore,request.body as any))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid source link"})}});
app.get("/api/v1/source-links/:entityType/:entityId",async(request)=>{if(!documentStore.pool)return [];const p=request.params as any;const rows=await documentStore.pool.query("SELECT esr.entity_type AS \"entityType\",esr.entity_id AS \"entityId\",esr.source_reference_id AS \"sourceReferenceId\",esr.field_name AS \"fieldName\",sr.document_id AS \"documentId\",sr.page,sr.table_name AS \"table\",sr.region,sr.excerpt FROM entity_source_references esr JOIN source_references sr ON sr.id=esr.source_reference_id WHERE esr.entity_type=$1 AND esr.entity_id=$2",[p.entityType,p.entityId]);return rows.rows});
app.get("/api/v1/documents",async()=>[...documentStore.documents.values()]);
app.post("/api/v1/documents",async(request,reply)=>{try{const x=request.body as any;if(!x.name||!x.fileName||!x.mimeType||!x.storageKey||!x.uploadedBy)throw new Error("Document metadata is incomplete");return reply.code(201).send(await (await import("@pumps/db/document-service")).createDocument(documentStore,{name:x.name,fileName:x.fileName,mimeType:x.mimeType,storageKey:x.storageKey,checksum:x.checksum,uploadedAt:new Date().toISOString(),uploadedBy:x.uploadedBy,description:x.description}))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid document"})}});
app.get("/api/v1/documents/:documentId/references",async(req)=>[...documentStore.references.values()].filter(x=>x.documentId===(req.params as any).documentId));
app.post("/api/v1/documents/:documentId/references",async(req,reply)=>{try{return reply.code(201).send(await (await import("@pumps/db/document-service")).createSourceReference(documentStore,{documentId:(req.params as any).documentId,...(req.body as any)}))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid source reference"})}});
app.get("/api/v1/catalog/status",async()=>({status:"ready",source:pool?"postgresql":"memory",catalogLoaded:catalogStore.configurations.size>0,series:catalogStore.series.size,models:catalogStore.models.size,configurations:catalogStore.configurations.size}));
 app.post("/api/v1/selections/preview",async(request,reply)=>reply.send(selectionEngine.select(request.body as any)));
 app.post("/api/v1/selections/run",async(request,reply)=>{const body=request.body as any;const catalog=[...catalogStore.configurations.values()].map(c=>({id:c.id,modelId:c.modelId,motorId:c.motorId,motor:catalogStore.motors.get(c.motorId),optionIds:Object.fromEntries((engineeringStore.links.get(c.id)??[]).map(link=>[link.kind,(engineeringStore.links.get(c.id)??[]).filter(x=>x.kind===link.kind).map(x=>x.optionId)])),rules:[...catalogStore.rules.values()].filter(rule=>!rule.configurationIds||rule.configurationIds.includes(c.id)),curves:[...catalogStore.curves.values()].filter(x=>x.configurationId===c.id)}));return reply.send(selectFromCatalog(body.request??body,catalog))});
 app.post("/api/v1/rules/evaluate",async(request,reply)=>reply.send(evaluateRules((request.body as any).context,(request.body as any).rules??[])));
 app.get("/api/v1/metadata/curve-kinds",async()=>({items:["head","efficiency","power","npsh"]}));
 await app.listen({host:"0.0.0.0",port:Number(process.env.PORT??4000)});
}
start().catch(e=>{app.log.error(e);process.exit(1)});
