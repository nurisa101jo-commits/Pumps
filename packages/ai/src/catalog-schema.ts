import type {SourceReference} from "./index.js";
export type ExtractedCurve={kind:"head"|"efficiency"|"power"|"npsh";unit:string;speedRpm:number;frequencyHz:number;points:Array<{q:number;value:number}>;source?:SourceReference};
export type ExtractedMotor={code?:string;powerKw:number;voltageV?:number;phase?:1|3;frequencyHz?:50|60;speedRpm?:number;source?:SourceReference};
export type ExtractedDimensions={lengthMm?:number;widthMm?:number;heightMm?:number;weightKg?:number;source?:SourceReference};
export type ExtractedConfiguration={code:string;name?:string;motor?:ExtractedMotor;materials?:Record<string,string>;seal?:string;connection?:string;impeller?:string;accessories?:string[];dimensions?:ExtractedDimensions;curves?:ExtractedCurve[];source?:SourceReference};
export type ExtractedPumpCatalog={series:{code:string;name:string;description?:string;source?:SourceReference};models:Array<{code:string;name:string;description?:string;configurations:ExtractedConfiguration[];source?:SourceReference}>;sources:SourceReference[]};
export type CatalogValidationIssue={field:string;severity:"error"|"warning";message:string;source?:SourceReference};
