import type {ConfigurationContext,EngineeringRule,RuleEvaluation} from "@pumps/domain/rules";

export function evaluateRules(context:ConfigurationContext,rules:EngineeringRule[]):RuleEvaluation[]{
 return rules.filter(r=>r.enabled&&(!r.configurationIds||r.configurationIds.includes(context.configuration.id))).map(rule=>{
  let passed=true;let message="Rule passed";const p=rule.parameters;
  switch(rule.kind){
   case"temperature_limit":if(context.temperatureC!==undefined&&typeof p.maxTemperatureC==="number"&&context.temperatureC>p.maxTemperatureC){passed=false;message=`Temperature ${context.temperatureC}°C exceeds limit ${p.maxTemperatureC}°C`}break;
   case"flow_limit":if(typeof p.minFlow==="number"&&context.flow<p.minFlow){passed=false;message=`Flow is below minimum ${p.minFlow}`}if(typeof p.maxFlow==="number"&&context.flow>p.maxFlow){passed=false;message=`Flow exceeds maximum ${p.maxFlow}`}break;
   case"npsh_limit":if(context.npshr!==undefined&&typeof p.maxNpshr==="number"&&context.npshr>p.maxNpshr){passed=false;message=`NPSH required ${context.npshr} exceeds limit ${p.maxNpshr}`}break;
   case"motor_compatibility":if(Array.isArray(p.allowedPowerKw)&&!p.allowedPowerKw.includes(context.motor.powerKw)){passed=false;message=`Motor power ${context.motor.powerKw} kW is not permitted`}break;
   case"fluid_compatibility":if(typeof p.allowedFluids==="object"&&Array.isArray(p.allowedFluids)&&context.fluidName&&!p.allowedFluids.includes(context.fluidName)){passed=false;message=`Fluid ${context.fluidName} is not permitted`}break;
   case"option_compatibility":{const ids=context.optionIds?.[rule.optionKind??"material"]??[];if(rule.optionIds?.length&&!ids.some(id=>rule.optionIds!.includes(id))){passed=false;message="Configuration option is not permitted by this rule"}break}
   case"configuration":if(Array.isArray(p.allowedConfigurationIds)&&!p.allowedConfigurationIds.includes(context.configuration.id)){passed=false;message="Configuration is not permitted"}break;
   case"application":if(Array.isArray(p.allowedApplications)&&typeof p.application==="string"&&!p.allowedApplications.includes(p.application)){passed=false;message=`Application ${p.application} is not permitted`}break;
  }
  return{ruleId:rule.id,passed,severity:rule.severity,message};
 })
}
