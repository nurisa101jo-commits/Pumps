import type {SelectionRequest,SelectionResult,Motor,PumpConfiguration} from "@pumps/domain";
import {interpolate} from "@pumps/domain/curve";
import {evaluateRules} from "./rules.js";
import type {EngineeringRule} from "@pumps/domain/rules";

export type CatalogConfiguration={id:string;modelId:string;motorId:string;motor?:Motor;optionIds?:Partial<Record<"material"|"seal"|"connection"|"impeller"|"accessory",string[]>>;rules?:EngineeringRule[];curves:Array<{kind:"head"|"efficiency"|"power"|"npsh";unit:string;speedRpm:number;frequencyHz:number;points:Array<{q:number;value:number}>}>};

export function selectFromCatalog(request:SelectionRequest,catalog:CatalogConfiguration[]):SelectionResult{
 const warnings:string[]=[];
 const candidates=catalog.flatMap(c=>{
  if(request.constraints?.allowedConfigurationIds&&!request.constraints.allowedConfigurationIds.includes(c.id))return [];
  if(!c.motor)return [];
  const head=c.curves.find(x=>x.kind==="head");if(!head)return [];
  const efficiency=c.curves.find(x=>x.kind==="efficiency");const npsh=c.curves.find(x=>x.kind==="npsh");
  const dutyResults=request.dutyPoints.map(d=>{const h=interpolate(head.points,d.q);const e=efficiency?interpolate(efficiency.points,d.q):undefined;const n=npsh?interpolate(npsh.points,d.q):undefined;return{q:d.q,requiredHead:d.head,availableHead:h??NaN,headError:h===undefined?Infinity:Math.abs(h-d.head),efficiency:e,npshr:n}});
  if(dutyResults.some(x=>!Number.isFinite(x.availableHead)))return [];
  if(request.constraints?.maxNpshr!==undefined&&dutyResults.some(x=>x.npshr!==undefined&&x.npshr>request.constraints!.maxNpshr!))return [];
  if(request.constraints?.minEfficiency!==undefined&&dutyResults.some(x=>x.efficiency!==undefined&&x.efficiency<request.constraints!.minEfficiency!))return [];
  const configuration={id:c.id,modelId:c.modelId,code:c.id,motorId:c.motorId} as PumpConfiguration;
  const ruleSet=c.rules??[];
  const evaluations=dutyResults.flatMap(d=>evaluateRules({configuration,motor:c.motor!,flow:d.q,temperatureC:request.fluid?.temperatureC,fluidName:request.fluid?.name,npshr:d.npshr,optionIds:c.optionIds},ruleSet));
  const failed=evaluations.filter(x=>!x.passed);
  if(failed.some(x=>x.severity==="error")){warnings.push(`Configuration ${c.id} rejected by engineering rules: ${failed.map(x=>x.message).join("; ")}`);return []}
  for(const item of failed)warnings.push(`Configuration ${c.id}: ${item.message}`);
  const score=dutyResults.reduce((s,x)=>s+x.headError,0)/dutyResults.length;
  return[{configurationId:c.id,modelId:c.modelId,motorId:c.motorId,score,dutyResults}]
 });
 candidates.sort((a,b)=>a.score-b.score);
 return{candidates,warnings,engineVersion:"0.4.0"}
}
export const selectionEngine={select:(request:SelectionRequest)=>selectFromCatalog(request,[])};
