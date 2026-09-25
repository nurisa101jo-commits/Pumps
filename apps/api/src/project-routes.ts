import type {FastifyInstance} from "fastify";
import {createProjectStore,loadProjects,createProject,addDutyPoint,selectConfiguration} from "@pumps/db/project-service";
import type {Project,ProjectDutyPoint,ProjectSelection} from "@pumps/domain/project";
import {selectFromCatalog} from "@pumps/selection-engine";
import type {CatalogConfiguration} from "@pumps/selection-engine";

const makeId=()=>crypto.randomUUID();

export function registerProjectRoutes(app:FastifyInstance,store=createProjectStore(),catalog:CatalogConfiguration[]|(()=>CatalogConfiguration[])=[]){
  const getCatalog=()=>typeof catalog==="function"?catalog():catalog;
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
  app.get("/api/v1/projects/:projectId/selection-sheet",async(req,reply)=>{
    const projectId=(req.params as any).projectId;
    const project=store.projects.get(projectId);
    if(!project)return reply.code(404).send({error:"Project not found"});
    const selection=[...store.selections.values()].filter(x=>x.projectId===projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if(!selection)return reply.code(404).send({error:"No validated selection exists for this project"});
    const configuration=getCatalog().find(x=>x.id===selection.configurationId);
    if(!configuration)return reply.code(404).send({error:"Selected configuration is no longer available"});
    const esc=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const points=selection.dutyResults??[];
    const rows=points.map((p:any)=>`<tr><td>${esc(p.q)}</td><td>${esc(p.requiredHead)}</td><td>${esc(p.availableHead?.toFixed?.(2)??p.availableHead)}</td><td>${esc(p.efficiency?.toFixed?.(1)??"—")}</td><td>${esc(p.powerKw?.toFixed?.(2)??"—")}</td><td>${esc(p.motorLoadRatio!==undefined?(p.motorLoadRatio*100).toFixed(1)+"%":"—")}</td></tr>`).join("");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Selection Sheet ${esc(project.number)}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#17202a}h1{margin-bottom:4px}.muted{color:#667085}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.fact{border:1px solid #ddd;padding:12px;border-radius:8px}.warning{border:1px solid #d99b00;background:#fff8df;padding:14px;border-radius:8px;margin:20px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:9px;text-align:left}th{background:#f4f5f7}@media print{body{margin:15mm}.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">Print</button></div><h1>${esc(configuration.id)}</h1><p class="muted">Project ${esc(project.number)} • ${esc(project.customerCompany??project.customerName??"")}</p><div class="facts"><div class="fact"><b>Model</b><br>${esc(configuration.modelId)}</div><div class="fact"><b>Motor</b><br>${esc(configuration.motor?.powerKw)} kW</div><div class="fact"><b>Engine</b><br>${esc(selection.engineVersion)}</div></div><h2>Validated Duty Results</h2><table><thead><tr><th>Flow m³/h</th><th>Required Head m</th><th>Available Head m</th><th>Efficiency %</th><th>Power kW</th><th>Motor Load</th></tr></thead><tbody>${rows}</tbody></table>${selection.warnings?.length?`<div class="warning"><b>Engineering warnings</b><ul>${selection.warnings.map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>`:""}<div class="warning"><b>AI-Assisted Selection Notice</b><br>Selections and project organization may use AI assistance and must be reviewed and verified by a qualified engineer before final approval, purchase, installation, or operation.</div></body></html>`;
    return reply.type("text/html").send(html);
  });
  app.post("/api/v1/projects/:projectId/selection",async(req,reply)=>{
    try{
      const projectId=(req.params as any).projectId;
      const body=req.body as any; const selection:ProjectSelection={id:makeId(),projectId,createdAt:new Date().toISOString(),...(body)}; const points=[...store.dutyPoints.values()].filter(x=>x.projectId===projectId); const result=selectFromCatalog({...body.request,dutyPoints:body.request?.dutyPoints??points.map(x=>({q:x.q,head:x.head,label:x.label})),},getCatalog()); const candidate=result.candidates.find(x=>x.configurationId===selection.configurationId); if(!candidate)throw new Error("Selected configuration is not valid for the project duty points"); const config=getCatalog().find(x=>x.id===selection.configurationId)!; const allowed=new Set(Object.values(config.optionIds??{}).flat()); for(const optionId of selection.selectedOptionIds??[])if(!allowed.has(optionId))throw new Error("Selected option is not compatible with the configuration"); selection.engineVersion=result.engineVersion;selection.dutyResults=result.candidates.find(x=>x.configurationId===selection.configurationId)?.dutyResults;selection.warnings=result.warnings;
      return reply.code(201).send(await selectConfiguration(store,selection));
    }catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Invalid selection"})}
  });
}
