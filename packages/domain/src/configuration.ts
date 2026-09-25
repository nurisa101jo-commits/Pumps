export type ConfigurationOptionKind="motor"|"flange"|"impeller"|"seal"|"material"|"accessory";
export type ConfigurationOption={id:string;kind:ConfigurationOptionKind;code:string;name:string;description?:string;compatibleConfigurationIds?:string[]};
export type PumpConfigurationView={id:string;modelId:string;code:string;name?:string;imageUrl?:string;application?:string;description?:string;motor?:unknown;flanges?:unknown[];impeller?:unknown;seal?:unknown;materials?:Record<string,string>;dimensions?:unknown;curves?:unknown[];weightKg?:number};
export type SelectionSheet={projectId:string;configuration:PumpConfigurationView;dutyPoints:Array<{q:number;head:number;efficiency?:number;npshr?:number;powerKw?:number}>;selectedOptions:ConfigurationOption[];warnings:string[];generatedAt:string};
