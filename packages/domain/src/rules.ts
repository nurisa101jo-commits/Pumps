import type {PumpConfiguration,Motor};
export type EngineeringRule={id:string;code:string;name:string;enabled:boolean;severity:"error"|"warning";kind:"motor_compatibility"|"temperature_limit"|"fluid_compatibility"|"flow_limit"|"npsh_limit"|"application"|"configuration";expression:string;parameters:Record<string,unknown>};
export type RuleEvaluation={ruleId:string;passed:boolean;severity:"error"|"warning";message:string};
export type ConfigurationContext={configuration:PumpConfiguration;motor:Motor;flow:number;temperatureC?:number;fluidName?:string;npshr?:number};
