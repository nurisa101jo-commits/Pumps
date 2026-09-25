import type {ExtractedPumpCatalog,CatalogValidationIssue} from "./catalog-schema.js";
const value=<T,>(x:{value:T}):T=>x.value;
const hasValue=(x:unknown):x is {value:unknown}=>!!x&&typeof x==="object"&&"value" in x;
export function validateExtractedCatalog(catalog:ExtractedPumpCatalog):CatalogValidationIssue[]{
 const issues:CatalogValidationIssue[]=[];
 if(!hasValue(catalog.series.code)||!value(catalog.series.code)||!hasValue(catalog.series.name)||!value(catalog.series.name))issues.push({field:"series",severity:"error",message:"Series code and name are required"});
 const modelCodes=new Set<string>();
 for(const model of catalog.models){
  const modelCode=hasValue(model.code)?String(value(model.code)):"";
  if(!modelCode||!hasValue(model.name)||!value(model.name))issues.push({field:"model",severity:"error",message:"Model code and name are required"});
  if(modelCodes.has(modelCode))issues.push({field:"model.code",severity:"error",message:"Duplicate model code "+modelCode,source:hasValue(model.code)?model.code.sources[0]:undefined});
  modelCodes.add(modelCode);
  const configCodes=new Set<string>();
  for(const cfg of model.configurations){
   const configCode=hasValue(cfg.code)?String(value(cfg.code)):"";
   if(configCodes.has(configCode))issues.push({field:"configuration.code",severity:"error",message:"Duplicate configuration code "+configCode,source:cfg.code.sources[0]});
   configCodes.add(configCode);
   if(!cfg.motor)issues.push({field:"configuration.motor",severity:"warning",message:"Configuration has no extracted motor",source:cfg.source});
   if(cfg.motor){
    const power=value(cfg.motor.powerKw);
    if(!Number.isFinite(power)||power<=0)issues.push({field:"motor.powerKw",severity:"error",message:"Motor power must be a positive number",source:cfg.motor.powerKw.sources[0]});
   }
   if(cfg.dimensions){
    for(const key of ["lengthMm","widthMm","heightMm","weightKg"] as const){
     const field=cfg.dimensions[key];
     if(field&&hasValue(field)&&typeof value(field)==="number"&&value(field)<0)issues.push({field:"dimensions."+key,severity:"error",message:key+" cannot be negative",source:field.sources[0]});
    }
   }
   for(const curve of cfg.curves??[]){
    const unit=value(curve.unit),speed=value(curve.speedRpm),frequency=value(curve.frequencyHz);
    if(!unit||!Number.isFinite(speed)||!Number.isFinite(frequency))issues.push({field:"curve",severity:"error",message:"Curve metadata is incomplete",source:curve.source});
    if(curve.points.length<2)issues.push({field:"curve.points",severity:"error",message:"Curve requires at least two points",source:curve.source});
    const qs=curve.points.map(p=>value(p.q));
    if(qs.some(q=>!Number.isFinite(q)||q<0))issues.push({field:"curve.points.q",severity:"error",message:"Curve flow values must be finite and non-negative",source:curve.source});
    if(curve.points.some(p=>!Number.isFinite(value(p.value))))issues.push({field:"curve.points.value",severity:"error",message:"Curve values must be finite",source:curve.source});
    if(new Set(qs).size!==qs.length)issues.push({field:"curve.points.q",severity:"error",message:"Curve Q values must be unique",source:curve.source});
   }
  }
 }
 return issues;
}
