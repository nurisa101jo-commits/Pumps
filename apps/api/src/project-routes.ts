import type {FastifyInstance} from "fastify";
import {createProjectStore,loadProjects,createProject,addDutyPoint,selectConfiguration} from "@pumps/db/project-service";
import type {Project,ProjectDutyPoint,ProjectSelection} from "@pumps/domain/project";
import {selectFromCatalog} from "@pumps/selection-engine";
import type {CatalogConfiguration} from "@pumps/selection-engine";

const makeId=()=>crypto.randomUUID();

export function registerProjectRoutes(app:FastifyInstance,store=createProjectStore(),catalog:CatalogConfiguration[]=[]){
  app.get("/api/v1/projects",async()=>[...store.projects.values()]);
  app.post("/api/v1/projects",async(req,reply)=>{
    try{
      const now=new Date().toISOString(); const x=req.body as any;
      const p:Project={id:makeId(),number:x.number??("PRJ-"+Date.now()),customerName:x.customerName,customerCompany:x.customerCompany,title:x.title,application:x.application,status:"draft",createdAt:now,updatedAt:now};
      await createProject(store,p); return reply.code(201).send(p);
    }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid project"})}
  });
  app.get("/api/v1/projects/:projectId/duty-points",async(req)=>{
    const id=(req.params as any).projectId;
    return[...store.dutyPoints.values()].filter(x=>x.projectId===id);
  });
  app.post("/api/v1/projects/:projectId/duty-points",async(req,reply)=>{
    try{
      const projectId=(req.params as any).projectId;
      const point:ProjectDutyPoint={id:makeId(),projectId,...(req.body as any)};
      return reply.code(201).send(await addDutyPoint(store,point));
    }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid duty point"})}
  });
  app.post("/api/v1/projects/:projectId/selection",async(req,reply)=>{
    try{
      const projectId=(req.params as any).projectId;
      const body=req.body as any; const selection:ProjectSelection={id:makeId(),projectId,createdAt:new Date().toISOString(),...(body)}; const points=[...store.dutyPoints.values()].filter(x=>x.projectId===projectId); const result=selectFromCatalog({...body.request,dutyPoints:body.request?.dutyPoints??points.map(x=>({q:x.q,head:x.head,label:x.label})),},catalog); if(!result.candidates.some(x=>x.configurationId===selection.configurationId))throw new Error("Selected configuration is not valid for the project duty points"); selection.engineVersion=result.engineVersion;selection.dutyResults=result.candidates.find(x=>x.configurationId===selection.configurationId)?.dutyResults;selection.warnings=result.warnings;
      return reply.code(201).send(await selectConfiguration(store,selection));
    }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid selection"})}
  });
}
