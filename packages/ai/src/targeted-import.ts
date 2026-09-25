import type {ExtractedPumpCatalog,ExtractedConfiguration,ExtractedCurve,ExtractedDimensions,ExtractedMotor,ExtractedValue} from "./catalog-schema.js";
export type ExtractedOption={code:ExtractedValue<string>;name:ExtractedValue<string>;description?:ExtractedValue<string>};
export type ImportScope="catalog"|"curves"|"dimensions"|"motors"|"materials"|"seals"|"configurations";
export type TargetedExtraction={scope:ImportScope;catalog?:Partial<ExtractedPumpCatalog>;configurations?:ExtractedConfiguration[];curves?:ExtractedCurve[];dimensions?:ExtractedDimensions[];motors?:ExtractedMotor[];materials?:ExtractedOption[];seals?:ExtractedOption[]};
export function validateTargetedScope(scope:ImportScope,data:any){
 if(!data||typeof data!=="object")throw new Error("Targeted extraction must return an object");
 if(data.scope&&data.scope!==scope)throw new Error("AI returned a different import scope");
 const allowed:Record<ImportScope,string[]>={
  catalog:["catalog","series","models","sources"],
  curves:["curves"],
  dimensions:["dimensions"],
  motors:["motors"],
  materials:["materials"],
  seals:["seals"],
  configurations:["configurations"]
 };
 const keys=Object.keys(data).filter(k=>k!=="scope");
 for(const key of keys)if(!allowed[scope].includes(key))throw new Error("AI returned data outside requested import scope: "+key);
 if(scope==="curves"&&(!Array.isArray(data.curves)))throw new Error("Targeted curve import requires curves[]");
 if(scope==="dimensions"&&(!Array.isArray(data.dimensions)))throw new Error("Targeted dimension import requires dimensions[]");
 if(scope==="motors"&&(!Array.isArray(data.motors)))throw new Error("Targeted motor import requires motors[]");
 if(scope==="materials"&&(!Array.isArray(data.materials)))throw new Error("Targeted material import requires materials[]");
 if(scope==="seals"&&(!Array.isArray(data.seals)))throw new Error("Targeted seal import requires seals[]");
 if(scope==="configurations"&&(!Array.isArray(data.configurations)))throw new Error("Targeted configuration import requires configurations[]");
 return data;
}
