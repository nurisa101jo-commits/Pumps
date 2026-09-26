import {randomUUID} from "node:crypto";
import type {CatalogStore} from "./catalog-service";
import {persistCatalogItem} from "./catalog-service";
import type {EngineeringOptionStore} from "./engineering-options";
import {createEngineeringOption,linkConfigurationOption} from "./engineering-options";

export async function seedDemoCatalog(store:CatalogStore,engineering:EngineeringOptionStore){
 if(store.series.size>0||store.models.size>0||store.configurations.size>0)return {seeded:false};
 const series={id:randomUUID(),code:"DP",name:"Demo Process Pumps",description:"Development/demo catalog only"};
 const model={id:randomUUID(),seriesId:series.id,code:"DP-10",name:"Demo 10 m3/h Pump"};
 const motor={id:randomUUID(),powerKw:2.2,voltageV:400,phase:3 as const,frequencyHz:50 as const,speedRpm:2900};
 const config={id:randomUUID(),modelId:model.id,code:"DP-10-2.2-400-50",motorId:motor.id,seal:"Mechanical seal",connection:"DN40",materials:{casing:"Cast iron",impeller:"Stainless steel"},active:true};
 const dimensions={id:randomUUID(),configurationId:config.id,lengthMm:420,widthMm:240,heightMm:310,weightKg:34};
 const curves=[
  {id:randomUUID(),configurationId:config.id,kind:"head",unit:"m",speedRpm:2900,frequencyHz:50,points:[{q:0,value:30},{q:4,value:28},{q:8,value:24},{q:10,value:20},{q:12,value:16},{q:14,value:11}]},
  {id:randomUUID(),configurationId:config.id,kind:"efficiency",unit:"%",speedRpm:2900,frequencyHz:50,points:[{q:0,value:0},{q:4,value:45},{q:8,value:68},{q:10,value:72},{q:12,value:68},{q:14,value:58}]},
  {id:randomUUID(),configurationId:config.id,kind:"power",unit:"kW",speedRpm:2900,frequencyHz:50,points:[{q:0,value:0.8},{q:4,value:1.1},{q:8,value:1.7},{q:10,value:1.95},{q:12,value:2.15},{q:14,value:2.3}]},
  {id:randomUUID(),configurationId:config.id,kind:"npsh",unit:"m",speedRpm:2900,frequencyHz:50,points:[{q:0,value:1.2},{q:4,value:1.5},{q:8,value:2.1},{q:10,value:2.6},{q:12,value:3.2},{q:14,value:4.1}]}
 ];
 const material=await createEngineeringOption(engineering,{kind:"material",code:"SS-IMP",name:"Stainless impeller",description:"Demo option",active:true});
 const seal=await createEngineeringOption(engineering,{kind:"seal",code:"MS-01",name:"Mechanical seal",description:"Demo option",active:true});
 const connection=await createEngineeringOption(engineering,{kind:"connection",code:"DN40",name:"DN40 flange",description:"Demo option",active:true});
 for(const item of [series,model,motor,config,dimensions,...curves])store[item===series?"series":item===model?"models":item===motor?"motors":item===config?"configurations":item===dimensions?"dimensions":"curves"].set(item.id,item);
 if(store.pool){await persistCatalogItem(store,"series",series);await persistCatalogItem(store,"model",model);await persistCatalogItem(store,"motor",motor);await persistCatalogItem(store,"configuration",config);await persistCatalogItem(store,"dimension",dimensions);for(const curve of curves)await persistCatalogItem(store,"curve",curve)}
 await linkConfigurationOption(engineering,config.id,"material",material.id);await linkConfigurationOption(engineering,config.id,"seal",seal.id);await linkConfigurationOption(engineering,config.id,"connection",connection.id);
 return {seeded:true,seriesId:series.id,modelId:model.id,configurationId:config.id};
}
