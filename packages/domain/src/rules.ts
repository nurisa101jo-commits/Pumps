import type {PumpConfiguration,Motor} from "./index.js";
import type {EngineeringOptionKind} from "./configuration-options.js";

export type EngineeringRuleKind="motor_compatibility"|"temperature_limit"|"fluid_compatibility"|"flow_limit"|"npsh_limit"|"application"|"configuration"|"option_compatibility";
export type EngineeringRule={id:string;code:string;name:string;enabled:boolean;severity:"error"|"warning";kind:EngineeringRuleKind;expression:string;parameters:Record<string,unknown>;configurationIds?:string[];optionKind?:EngineeringOptionKind;optionIds?:string[]};
export type RuleEvaluation={ruleId:string;passed:boolean;severity:"error"|"warning";message:string};
export type ConfigurationContext={configuration:PumpConfiguration;motor:Motor;flow:number;temperatureC?:number;fluidName?:string;npshr?:number;optionIds?:Partial<Record<EngineeringOptionKind,string[]>>};
