import type {SourceReference} from "./index.js";
export type ExtractedValue<T>={value:T;sources:SourceReference[];confidence?:number};
export type ExtractedCurvePoint={q:ExtractedValue<number>;value:ExtractedValue<number>};
export type ExtractedCurve={kind:"head"|"efficiency"|"power"|"npsh";unit:ExtractedValue<string>;speedRpm:ExtractedValue<number>;frequencyHz:ExtractedValue<number>;points:ExtractedCurvePoint[];source?:SourceReference};
export type ExtractedMotor={code?:ExtractedValue<string>;powerKw:ExtractedValue<number>;voltageV?:ExtractedValue<number>;phase?:ExtractedValue<1|3>;frequencyHz?:ExtractedValue<50|60>;speedRpm?:ExtractedValue<number>;source?:SourceReference};
export type ExtractedDimensions={lengthMm?:ExtractedValue<number>;widthMm?:ExtractedValue<number>;heightMm?:ExtractedValue<number>;weightKg?:ExtractedValue<number>;source?:SourceReference};
export type ExtractedConfiguration={code:ExtractedValue<string>;name?:ExtractedValue<string>;motor?:ExtractedMotor;materials?:Record<string,ExtractedValue<string>>;seal?:ExtractedValue<string>;connection?:ExtractedValue<string>;impeller?:ExtractedValue<string>;accessories?:ExtractedValue<string>[];dimensions?:ExtractedDimensions;curves?:ExtractedCurve[];source?:SourceReference};
export type ExtractedPumpCatalog={series:{code:ExtractedValue<string>;name:ExtractedValue<string>;description?:ExtractedValue<string>;source?:SourceReference};models:Array<{code:ExtractedValue<string>;name:ExtractedValue<string>;description?:ExtractedValue<string>;configurations:ExtractedConfiguration[];source?:SourceReference}>;sources:SourceReference[]};
export type CatalogValidationIssue={field:string;severity:"error"|"warning";message:string;source?:SourceReference};
