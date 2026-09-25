import type {FastifyInstance} from "fastify";
import {createProjectStore,loadProjects,createProject,addDutyPoint,selectConfiguration} from "@pumps/db/project-service";
import type {Project,ProjectDutyPoint,ProjectSelection} from "@pumps/domain/project";

const makeId=()=>crypto.randomUUID();

export function registerProjectRoutes(app:FastifyInstance,store=createProjectStore()){
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
      const selection:ProjectSelection={id:makeId(),projectId,createdAt:new Date().toISOString(),...(req.body as any)};
      return reply.code(201).send(await selectConfiguration(store,selection));
    }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid selection"})}
  });
}
