import type {SelectionRequest,SelectionResult,Motor,PumpConfiguration} from "@pumps/domain";
import {interpolate} from "@pumps/domain/curve";
import {evaluateRules} from "./rules.js";
import type {EngineeringRule} from "@pumps/domain/rules";

export type CatalogConfiguration={id:string;modelId:string;motorId:string;motor?:Motor;operatingRange?:{minQ:number;maxQ:number};optionIds?:Partial<Record<"material"|"seal"|"connection"|"impeller"|"accessory",string[]>>;rules?:EngineeringRule[];curves:Array<{kind:"head"|"efficiency"|"power"|"npsh";unit:string;speedRpm:number;frequencyHz:number;points:Array<{q:number;value:number}>}>};

function normalizeFlow(q:number,unit:SelectionRequest["flowUnit"]){if(unit==="l/s")return q*3.6;if(unit==="m3/s")return q*3600;return q}
export function selectFromCatalog(request:SelectionRequest,catalog:CatalogConfiguration[]):SelectionResult{
 if(!request.dutyPoints.length)return{candidates:[],warnings:["At least one duty point is required"],engineVersion:"0.6.0"};
 const flowUnit=request.flowUnit??"m3/h";
 const warnings:string[]=[];
 const candidates=catalog.flatMap(c=>{
  if(request.constraints?.allowedConfigurationIds&&!request.constraints.allowedConfigurationIds.includes(c.id))return [];
  if(!c.motor)return [];
  const head=c.curves.find(x=>x.kind==="head");if(!head)return [];
  const efficiency=c.curves.find(x=>x.kind==="efficiency");const npsh=c.curves.find(x=>x.kind==="npsh");
  const dutyResults=request.dutyPoints.map(d=>{const q=normalizeFlow(d.q,flowUnit);const h=interpolate(head.points,q);const e=efficiency?interpolate(efficiency.points,q):undefined;const n=npsh?interpolate(npsh.points,q):undefined;const pCurve=c.curves.find(x=>x.kind==="power");const powerKw=pCurve?interpolate(pCurve.points,q):undefined;const density=request.fluid?.densityKgM3??1000;const hydraulicPowerKw=(density*9.80665*q*d.head)/3600000;const operatingPointValid=h!==undefined&&(!c.operatingRange|| (q>=c.operatingRange.minQ&&q<=c.operatingRange.maxQ));return{q,requiredHead:d.head,availableHead:h??NaN,headError:h===undefined?Infinity:Math.abs(h-d.head),efficiency:e,npshr:n,powerKw,hydraulicPowerKw,motorPowerKw:c.motor!.powerKw,motorLoadRatio:powerKw!==undefined?powerKw/c.motor!.powerKw:undefined,operatingPointValid}});
  if(dutyResults.some(x=>!Number.isFinite(x.availableHead)||!x.operatingPointValid)){warnings.push(`Configuration ${c.id} rejected because one or more duty points are outside the available operating range`);return []}
  if(request.constraints?.maxNpshr!==undefined&&dutyResults.some(x=>x.npshr!==undefined&&x.npshr>request.constraints!.maxNpshr!)){warnings.push(`Configuration ${c.id} rejected because NPSH required exceeds the configured limit`);return []}
  if(request.constraints?.npshSafetyMarginM!==undefined&&dutyResults.some(x=>x.npshr!==undefined&&request.constraints!.npshSafetyMarginM!>0&&request.fluid?.npshaM!==undefined&&x.npshr+request.constraints!.npshSafetyMarginM!>request.fluid!.npshaM!)){warnings.push(`Configuration ${c.id} rejected because NPSH safety margin is not satisfied`);return []}
  if(request.constraints?.maxMotorLoadRatio!==undefined&&dutyResults.some(x=>x.motorLoadRatio!==undefined&&x.motorLoadRatio>request.constraints!.maxMotorLoadRatio!)){warnings.push(`Configuration ${c.id} rejected because absorbed power exceeds the permitted motor load ratio`);return []}
  if(request.constraints?.minEfficiency!==undefined&&dutyResults.some(x=>x.efficiency===undefined||x.efficiency<request.constraints!.minEfficiency!)){warnings.push(`Configuration ${c.id} rejected because efficiency data does not satisfy the requested minimum`);return []}
  const configuration={id:c.id,modelId:c.modelId,code:c.id,motorId:c.motorId} as PumpConfiguration;
  const ruleSet=c.rules??[];
  const evaluations=dutyResults.flatMap(d=>evaluateRules({configuration,motor:c.motor!,flow:d.q,temperatureC:request.fluid?.temperatureC,fluidName:request.fluid?.name,application:request.application,npshr:d.npshr,optionIds:c.optionIds},ruleSet));
  const failed=evaluations.filter(x=>!x.passed);
  if(failed.some(x=>x.severity==="error")){warnings.push(`Configuration ${c.id} rejected by engineering rules: ${failed.map(x=>x.message).join("; ")}`);return []}
  for(const item of failed)warnings.push(`Configuration ${c.id}: ${item.message}`);
  const score=dutyResults.reduce((s,x)=>s+x.headError,0)/dutyResults.length;
  return[{configurationId:c.id,modelId:c.modelId,motorId:c.motorId,score,dutyResults}]
 });
 candidates.sort((a,b)=>a.score-b.score);
 return{candidates,warnings,engineVersion:"0.6.0"}
}
export const selectionEngine={select:(request:SelectionRequest)=>selectFromCatalog(request,[])};
