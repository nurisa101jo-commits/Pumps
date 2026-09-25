import type {Pool} from "pg";
import type {EngineeringOption,EngineeringOptionKind} from "@pumps/domain/configuration-options";
import {randomUUID} from "node:crypto";

const tableFor=(kind:EngineeringOptionKind)=>({material:"materials",seal:"seals",connection:"connections",impeller:"impellers",accessory:"accessories"} as const)[kind];

export type EngineeringOptionStore={options:Map<EngineeringOptionKind,Map<string,EngineeringOption>>;links:Map<string,Array<{kind:EngineeringOptionKind;optionId:string}>>;pool?:Pool};
export function createEngineeringOptionStore(pool?:Pool):EngineeringOptionStore{
  return{options:new Map(["material","seal","connection","impeller","accessory"].map(k=>[k,new Map()] as const)),links:new Map(),pool};
}
export async function loadEngineeringOptions(store:EngineeringOptionStore){
  if(!store.pool)return;
  for(const kind of ["material","seal","connection","impeller","accessory"] as const){
    const rows=await store.pool.query(`SELECT id,code,name,description,active FROM ${tableFor(kind)} ORDER BY code`);
    const map=store.options.get(kind)!; map.clear();
    for(const row of rows.rows)map.set(row.id,{...row,kind});
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
}
