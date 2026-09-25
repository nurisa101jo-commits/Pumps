import type {AuditEvent} from "@pumps/domain/audit";
export type CatalogStore={series:Map<string,any>;models:Map<string,any>;motors:Map<string,any>;configurations:Map<string,any>;curves:Map<string,any>;dimensions:Map<string,any>;audit:AuditEvent[]};
export function createCatalogStore():CatalogStore{return{series:new Map(),models:new Map(),motors:new Map(),configurations:new Map(),curves:new Map(),dimensions:new Map(),audit:[]}}
export function assertUnique(store:CatalogStore,collection:keyof Pick<CatalogStore,"series"|"models"|"motors"|"configurations"|"curves"|"dimensions">,field:string,value:unknown,ignoreId?:string){for(const [id,item] of store[collection])if(id!==ignoreId&&item[field]===value)throw new Error("Duplicate "+collection+"."+field+": "+String(value))}
export function recordAudit(store:CatalogStore,event:AuditEvent){store.audit.push(event)}
