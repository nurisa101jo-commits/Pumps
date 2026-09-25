import type {ExtractedPumpCatalog,CatalogValidationIssue} from "./catalog-schema.js";
export function validateExtractedCatalog(catalog:ExtractedPumpCatalog):CatalogValidationIssue[]{
 const issues:CatalogValidationIssue[]=[];
 if(!catalog.series.code||!catalog.series.name)issues.push({field:"series",severity:"error",message:"Series code and name are required"});
 const modelCodes=new Set<string>();
 for(const model of catalog.models){
  if(!model.code||!model.name)issues.push({field:"model",severity:"error",message:"Model code and name are required"});
  if(modelCodes.has(model.code))issues.push({field:"model.code",severity:"error",message:"Duplicate model code "+model.code});
  modelCodes.add(model.code);
  const configCodes=new Set<string>();
  for(const cfg of model.configurations){
   if(configCodes.has(cfg.code))issues.push({field:"configuration.code",severity:"error",message:"Duplicate configuration code "+cfg.code});
   configCodes.add(cfg.code);
   if(!cfg.motor)issues.push({field:"configuration.motor",severity:"warning",message:"Configuration has no extracted motor",source:cfg.source});
   if(cfg.motor&&(!Number.isFinite(cfg.motor.powerKw)||cfg.motor.powerKw<=0))issues.push({field:"motor.powerKw",severity:"error",message:"Motor power must be a positive number",source:cfg.motor.source});
   if(cfg.dimensions&&Object.values(cfg.dimensions).some(x=>typeof x==="number"&&x<0))issues.push({field:"dimensions",severity:"error",message:"Dimensions and weight cannot be negative",source:cfg.dimensions.source});
   for(const curve of cfg.curves??[]){
    if(!curve.unit||!Number.isFinite(curve.speedRpm)||!Number.isFinite(curve.frequencyHz))issues.push({field:"curve",severity:"error",message:"Curve metadata is incomplete",source:curve.source});
    if(curve.points.length<2)issues.push({field:"curve.points",severity:"error",message:"Curve requires at least two points",source:curve.source});
    const qs=curve.points.map(p=>p.q);
    if(qs.some(q=>!Number.isFinite(q)||q<0))issues.push({field:"curve.points.q",severity:"error",message:"Curve flow values must be finite and non-negative",source:curve.source});
    if(curve.points.some(p=>!Number.isFinite(p.value)))issues.push({field:"curve.points.value",severity:"error",message:"Curve values must be finite",source:curve.source});
    if(new Set(qs).size!==qs.length)issues.push({field:"curve.points.q",severity:"error",message:"Curve Q values must be unique",source:curve.source});
   }
  }
 }
 return issues;
}
