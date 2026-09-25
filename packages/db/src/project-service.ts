import type {Project,ProjectDutyPoint,ProjectSelection} from "@pumps/domain/project";
import type {Pool} from "pg";

export type ProjectStore={
  projects:Map<string,Project>;
  dutyPoints:Map<string,ProjectDutyPoint>;
  selections:Map<string,ProjectSelection>;
  pool?:Pool;
};

export function createProjectStore(pool?:Pool):ProjectStore{
  return{projects:new Map(),dutyPoints:new Map(),selections:new Map(),pool};
}

export async function loadProjects(store:ProjectStore){
  if(!store.pool)return;
  const q=store.pool;
  const projects=await q.query(`SELECT id,number,customer_name AS "customerName",customer_company AS "customerCompany",title,application,status,created_at AS "createdAt",updated_at AS "updatedAt" FROM selection_projects ORDER BY created_at DESC`);
  const points=await q.query(`SELECT id,project_id AS "projectId",label,q,head,efficiency,npshr,power_kw AS "powerKw" FROM project_duty_points ORDER BY id`);
  const selections=await q.query(`SELECT id,project_id AS "projectId",configuration_id AS "configurationId",selected_option_ids_json AS "selectedOptionIdsJson",created_at AS "createdAt",duty_results_json AS "dutyResultsJson",warnings_json AS "warningsJson",engine_version AS "engineVersion" FROM project_selections ORDER BY created_at DESC`);
  store.projects.clear(); store.dutyPoints.clear(); store.selections.clear();
  for(const row of projects.rows)store.projects.set(row.id,row);
  for(const row of points.rows)store.dutyPoints.set(row.id,row);
  for(const row of selections.rows)store.selections.set(row.id,{id:row.id,projectId:row.projectId,configurationId:row.configurationId,selectedOptionIds:JSON.parse(row.selectedOptionIdsJson??"[]"),createdAt:row.createdAt,engineVersion:row.engineVersion,dutyResults:JSON.parse(row.dutyResultsJson??"[]"),warnings:JSON.parse(row.warningsJson??"[]")});
}

export async function createProject(store:ProjectStore,project:Project){
  if(store.projects.has(project.id))throw new Error("project id already exists");
  if(store.pool)await store.pool.query(`INSERT INTO selection_projects(id,number,customer_name,customer_company,title,application,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[project.id,project.number,project.customerName??null,project.customerCompany??null,project.title??null,project.application??null,project.status,project.createdAt,project.updatedAt]);
  store.projects.set(project.id,project); return project;
}

export async function addDutyPoint(store:ProjectStore,point:ProjectDutyPoint){
  if(!store.projects.has(point.projectId))throw new Error("projectId does not exist");
  if(point.q<=0||point.head<=0)throw new Error("Flow and head must be positive");
  if(store.pool)await store.pool.query(`INSERT INTO project_duty_points(id,project_id,label,q,head,efficiency,npshr,power_kw) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[point.id,point.projectId,point.label??null,point.q,point.head,point.efficiency??null,point.npshr??null,point.powerKw??null]);
  store.dutyPoints.set(point.id,point); return point;
}

export async function selectConfiguration(store:ProjectStore,selection:ProjectSelection){
  if(!store.projects.has(selection.projectId))throw new Error("projectId does not exist");
  if(store.pool){
    await store.pool.query(`INSERT INTO project_selections(id,project_id,configuration_id,selected_option_ids_json,created_at,duty_results_json,warnings_json,engine_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[selection.id,selection.projectId,selection.configurationId,JSON.stringify(selection.selectedOptionIds??[]),selection.createdAt,JSON.stringify(selection.dutyResults??[]),JSON.stringify(selection.warnings??[]),selection.engineVersion??null]);
    await store.pool.query(`UPDATE selection_projects SET status=$1,updated_at=$2 WHERE id=$3`,["selected",new Date().toISOString(),selection.projectId]);
  }
  store.selections.set(selection.id,selection);
  const p=store.projects.get(selection.projectId)!;
  store.projects.set(p.id,{...p,status:"selected",updatedAt:new Date().toISOString()});
  return selection;
}
