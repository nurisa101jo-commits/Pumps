import type {Project,ProjectDutyPoint,ProjectSelection} from "@pumps/domain/project";
export type ProjectStore={projects:Map<string,Project>;dutyPoints:Map<string,ProjectDutyPoint>;selections:Map<string,ProjectSelection>};
export function createProjectStore():ProjectStore{return{projects:new Map(),dutyPoints:new Map(),selections:new Map()}}
export function addDutyPoint(store:ProjectStore,point:ProjectDutyPoint){if(!store.projects.has(point.projectId))throw new Error("projectId does not exist");if(point.q<=0||point.head<=0)throw new Error("Flow and head must be positive");store.dutyPoints.set(point.id,point);return point}
export function selectConfiguration(store:ProjectStore,selection:ProjectSelection){if(!store.projects.has(selection.projectId))throw new Error("projectId does not exist");store.selections.set(selection.id,selection);const p=store.projects.get(selection.projectId)!;store.projects.set(p.id,{...p,status:"selected",updatedAt:new Date().toISOString()});return selection}
