import type {Pool} from "pg";
import type {EngineeringOption,EngineeringOptionKind} from "@pumps/domain/configuration-options";
import {randomUUID} from "node:crypto";

const tableFor=(kind:EngineeringOptionKind)=>({material:"materials",seal:"seals",connection:"connections",impeller:"impellers",accessory:"accessories"} as const)[kind];

export type EngineeringOptionStore={options:Map<EngineeringOptionKind,Map<string,EngineeringOption>>;links:Map<string,Array<{kind:EngineeringOptionKind;optionId:string}>>;pool?:Pool | undefined};
export function createEngineeringOptionStore(pool?:Pool | undefined):EngineeringOptionStore{
  const kinds:EngineeringOptionKind[]=["material","seal","connection","impeller","accessory"];
  return{options:new Map<EngineeringOptionKind,Map<string,EngineeringOption>>(kinds.map(k=>[k,new Map<string,EngineeringOption>()] as [EngineeringOptionKind,Map<string,EngineeringOption>])),links:new Map(),pool};
}
export async function loadEngineeringOptions(store:EngineeringOptionStore){
  if(!store.pool)return;
  store.links.clear();
  for(const kind of ["material","seal","connection","impeller","accessory"] as const){
    const rows=await store.pool.query(`SELECT id,code,name,description,active FROM ${tableFor(kind)} ORDER BY code`);
    const map=store.options.get(kind)!; map.clear();
    for(const row of rows.rows)map.set(row.id,{...row,kind});
    const links=await store.pool.query("SELECT configuration_id,option_id FROM configuration_options WHERE option_kind=$1",[kind]);
    for(const row of links.rows){const list=store.links.get(row.configuration_id)??[];list.push({kind,optionId:row.option_id});store.links.set(row.configuration_id,list)}
  }
}
export async function createEngineeringOption(store:EngineeringOptionStore,input:Omit<EngineeringOption,"id">){
  const id=randomUUID(); const table=tableFor(input.kind);
  if(store.pool)await store.pool.query(`INSERT INTO ${table}(id,code,name,description,active) VALUES($1,$2,$3,$4,$5)`,[id,input.code,input.name,input.description??null,input.active!==false]);
  const item={id,...input}; store.options.get(input.kind)!.set(id,item); return item;
}
export async function linkConfigurationOption(store:EngineeringOptionStore,configurationId:string,kind:EngineeringOptionKind,optionId:string){
  if(!store.options.get(kind)?.has(optionId))throw new Error("Option does not exist");
  if(store.pool)await store.pool.query("INSERT INTO configuration_options(configuration_id,option_kind,option_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[configurationId,kind,optionId]);
  const list=store.links.get(configurationId)??[]; if(!list.some(x=>x.kind===kind&&x.optionId===optionId)){list.push({kind,optionId});store.links.set(configurationId,list)}
}
