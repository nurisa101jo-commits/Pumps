import Fastify from "fastify";
import {parseIngestionFile,HttpAiIngestionProvider,validateExtractedCatalog,validateTargetedScope} from "@pumps/ai";
import {selectionEngine,selectFromCatalog} from "@pumps/selection-engine";
import {evaluateRules} from "@pumps/selection-engine/rules";
import {createCatalogStore,loadCatalog} from "@pumps/db/catalog-service";
import {createProjectStore,loadProjects} from "@pumps/db/project-service";
import {createPool,pingDatabase} from "@pumps/db/postgres";
import {registerCatalogRoutes} from "./catalog-routes.js";
import {registerProjectRoutes} from "./project-routes.js";
import {createEngineeringOptionStore,loadEngineeringOptions} from "@pumps/db/engineering-options";
import {createDocumentStore,loadDocuments,linkEntitySource} from "@pumps/db/document-service";
import {createIngestionStore,loadIngestion,createIngestionJob,createCandidate,updateCandidate,approveCandidate} from "@pumps/db/ingestion-service";
import {createPublicationStore,loadPublications,publishCandidate} from "@pumps/db/publication-service";

const app=Fastify({logger:true});
const pool=process.env.DATABASE_URL?createPool():undefined;
const catalogStore=createCatalogStore(pool);
const projectStore=createProjectStore(pool);
const engineeringStore=createEngineeringOptionStore(pool);
const documentStore=createDocumentStore(pool);
const ingestionStore=createIngestionStore(pool);
const publicationStore=createPublicationStore(pool);
let databaseReady=false;

async function start(){
 if(pool){await pingDatabase(pool);await loadCatalog(catalogStore);await loadProjects(projectStore);await loadEngineeringOptions(engineeringStore);await loadDocuments(documentStore);await loadIngestion(ingestionStore);await loadPublications(publicationStore);databaseReady=true}
 registerCatalogRoutes(app,catalogStore,engineeringStore);
 registerProjectRoutes(app,projectStore);
 app.get("/health",async()=>({status:"ok",service:"pumps-api",version:"0.5.0",database:pool?(databaseReady?"ready":"not-ready"):"memory"}));
 


app.post("/api/v1/ingestion/import",async(request,reply)=>{try{const body=request.body as any;if(!body.documentId||!body.fileName||!body.mimeType||!body.contentBase64)throw new Error("documentId, fileName, mimeType and contentBase64 are required");const bytes=Buffer.from(body.contentBase64,"base64");const parsed=await parseIngestionFile({documentId:body.documentId,fileName:body.fileName,mimeType:body.mimeType,bytes});const job=await createIngestionJob(ingestionStore,{sourceDocumentId:body.documentId,sourceName:body.fileName,sourceType:body.mimeType.includes("pdf")?"pdf":body.mimeType.startsWith("image/")?"image":body.mimeType.includes("spreadsheet")||/\.(xlsx|xls|csv)$/i.test(body.fileName)?"spreadsheet":"document",createdBy:body.createdBy??"system"});if(!process.env.AI_INGESTION_URL)throw new Error("AI_INGESTION_URL is not configured");const provider=new HttpAiIngestionProvider(process.env.AI_INGESTION_URL,process.env.AI_INGESTION_API_KEY);const scope=body.importScope??"catalog";const candidate=await provider.extract({mimeType:parsed.mimeType,fileName:parsed.fileName,documentId:parsed.documentId,content:parsed.rawText,pages:parsed.pages,scope});const scopedData=validateTargetedScope(scope,candidate.data);const schemaIssues=scope==="catalog"?validateExtractedCatalog(scopedData as any):[];const generatedConflicts=[...candidate.conflicts,...schemaIssues.filter(x=>x.severity==="error").map(x=>({field:x.field,values:[],reason:x.message,source:x.source}))];const stored=await createCandidate(ingestionStore,{jobId:job.id,payload:scopedData,confidence:candidate.confidence,sources:candidate.sources,conflicts:generatedConflicts});return reply.code(201).send({job,candidate:stored})}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Import failed"})}});
 app.get("/api/v1/ingestion/jobs",async()=>[...ingestionStore.jobs.values()]);
app.post("/api/v1/ingestion/jobs",async(request,reply)=>{try{return reply.code(201).send(await createIngestionJob(ingestionStore,request.body as any))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid ingestion job"})}});
app.get("/api/v1/ingestion/jobs/:jobId/candidates",async(req)=>[...ingestionStore.candidates.values()].filter(x=>x.jobId===(req.params as any).jobId));
app.post("/api/v1/ingestion/jobs/:jobId/candidates",async(req,reply)=>{try{return reply.code(201).send(await createCandidate(ingestionStore,{jobId:(req.params as any).jobId,...(req.body as any)}))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid candidate"})}});
app.patch("/api/v1/ingestion/candidates/:candidateId",async(req,reply)=>{try{return reply.send(await updateCandidate(ingestionStore,(req.params as any).candidateId,req.body as any))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Candidate update rejected"})}});
app.get("/api/v1/ingestion/publications",async()=>[...publicationStore.publications.values()]);
app.post("/api/v1/ingestion/candidates/:candidateId/publish",async(req,reply)=>{try{return reply.code(201).send(await publishCandidate(ingestionStore,publicationStore,catalogStore,documentStore,(req.params as any).candidateId,req.body as any))}catch(e){return reply.code(409).send({error:e instanceof Error?e.message:"Publication rejected"})}});
app.post("/api/v1/ingestion/candidates/:candidateId/approve",async(req,reply)=>{try{return reply.send(await approveCandidate(ingestionStore,(req.params as any).candidateId,req.body as any))}catch(e){return reply.code(409).send({error:e instanceof Error?e.message:"Approval rejected"})}});
app.post("/api/v1/source-links",async(request,reply)=>{try{return reply.code(201).send(await linkEntitySource(documentStore,request.body as any))}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid source link"})}});
app.get("/api/v1/source-links/:entityType/:entityId",async(request)=>{if(!documentStore.pool)return documentStore.links.filter(x=>x.entityType===(request.params as any).entityType&&x.entityId===(request.params as any).entityId);const p=request.params as any;const rows=await documentStore.pool.query("SELECT esr.entity_type AS \"entityType\",esr.entity_id AS \"entityId\",esr.source_reference_id AS \"sourceReferenceId\",esr.field_name AS \"fieldName\",sr.document_id AS \"documentId\",sr.page,sr.table_name AS \"table\",sr.region,sr.excerpt FROM entity_source_references esr JOIN source_references sr ON sr.id=esr.source_reference_id WHERE esr.entity_type=$1 AND esr.entity_id=$2",[p.entityType,p.entityId]);return rows.rows});
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
