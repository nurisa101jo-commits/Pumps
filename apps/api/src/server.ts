import Fastify from "fastify";
import {selectionEngine,selectFromCatalog} from "@pumps/selection-engine";
import {evaluateRules} from "@pumps/selection-engine/rules";
import {createCatalogStore,loadCatalog} from "@pumps/db/catalog-service";
import {createProjectStore,loadProjects} from "@pumps/db/project-service";
import {createPool,pingDatabase} from "@pumps/db/postgres";
import {registerCatalogRoutes} from "./catalog-routes.js";
import {registerProjectRoutes} from "./project-routes.js";
import {createEngineeringOptionStore,loadEngineeringOptions} from "@pumps/db/engineering-options";

const app=Fastify({logger:true});
const pool=process.env.DATABASE_URL?createPool():undefined;
const catalogStore=createCatalogStore(pool);
const projectStore=createProjectStore(pool);
const engineeringStore=createEngineeringOptionStore(pool);
let databaseReady=false;

async function start(){
 if(pool){await pingDatabase(pool);await loadCatalog(catalogStore);await loadProjects(projectStore);await loadEngineeringOptions(engineeringStore);databaseReady=true}
 registerCatalogRoutes(app,catalogStore,engineeringStore);
 registerProjectRoutes(app,projectStore);
 app.get("/health",async()=>({status:"ok",service:"pumps-api",version:"0.5.0",database:pool?(databaseReady?"ready":"not-ready"):"memory"}));
 app.get("/api/v1/catalog/status",async()=>({status:"ready",source:pool?"postgresql":"memory",catalogLoaded:catalogStore.configurations.size>0,series:catalogStore.series.size,models:catalogStore.models.size,configurations:catalogStore.configurations.size}));
 app.post("/api/v1/selections/preview",async(request,reply)=>reply.send(selectionEngine.select(request.body as any)));
 app.post("/api/v1/selections/run",async(request,reply)=>{const body=request.body as any;const catalog=[...catalogStore.configurations.values()].map(c=>({id:c.id,modelId:c.modelId,motorId:c.motorId,motor:catalogStore.motors.get(c.motorId),optionIds:{},rules:[...catalogStore.rules.values()].filter(rule=>!rule.configurationIds||rule.configurationIds.includes(c.id)),curves:[...catalogStore.curves.values()].filter(x=>x.configurationId===c.id)}));return reply.send(selectFromCatalog(body.request??body,catalog))});
 app.post("/api/v1/rules/evaluate",async(request,reply)=>reply.send(evaluateRules((request.body as any).context,(request.body as any).rules??[])));
 app.get("/api/v1/metadata/curve-kinds",async()=>({items:["head","efficiency","power","npsh"]}));
 await app.listen({host:"0.0.0.0",port:Number(process.env.PORT??4000)});
}
start().catch(e=>{app.log.error(e);process.exit(1)});
