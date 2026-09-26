import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import"./style.css";

const API=(import.meta.env.VITE_API_URL??"http://localhost:4000").replace(/\/$/,"");

type Series={id:string;code:string;name:string;description?:string};
type Model={id:string;seriesId:string;code:string;name:string};
type CurvePoint={q:number;value:number};
type Curve={id:string;kind:"head"|"efficiency"|"power"|"npsh";unit:string;speedRpm:number;frequencyHz:number;points:CurvePoint[]};
type Option={id:string;kind:"material"|"seal"|"connection"|"impeller"|"accessory";code:string;name:string};
type Config={id:string;code:string;modelId:string;imageUrl?:string;application?:string;description?:string;model?:Model|null;motor?:{id:string;powerKw:number;voltageV?:number;phase?:number;frequencyHz?:number;speedRpm?:number}|null;dimensions?:{lengthMm?:number;widthMm?:number;heightMm?:number;weightKg?:number}|null;seal?:string;connection?:string;materials?:Record<string,string>;options?:Option[];curves:Curve[]};
type DutyPoint={q:number;head:number;label?:string};

async function get<T>(path:string):Promise<T>{const response=await fetch(API+path);if(!response.ok)throw new Error(await response.text());return response.json()}
async function post<T>(path:string,body:unknown):Promise<T>{const response=await fetch(API+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json()}

function Fact({label,value}:{label:string;value:string}){return <div className="fact"><b>{label}</b><span>{value}</span></div>}

function Curve({config,points}:{config:Config;points:DutyPoint[]}){
 const curve=config.curves.find(item=>item.kind==="head");
 if(!curve||curve.points.length<2)return <div className="note">No structured head curve is available for this configuration.</div>;
 const sorted=[...curve.points].sort((a,b)=>a.q-b.q);
 const maxQ=Math.max(...sorted.map(p=>p.q),...points.map(p=>p.q),1);
 const maxH=Math.max(...sorted.map(p=>p.value),...points.map(p=>p.head),1);
 const width=640,height=300;
 const line=sorted.map(p=>`${(p.q/maxQ)*width},${height-(p.value/maxH)*height}`).join(" ");
 return <div className="curve">
  <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pump head curve">
   <polyline points={line} fill="none" stroke="currentColor" strokeWidth="4"/>
   {points.map((point,index)=>{const x=(point.q/maxQ)*width;const y=height-(point.head/maxH)*height;return <g key={index}><line x1={x} y1={y} x2={x} y2={height} stroke="currentColor" strokeDasharray="6 5"/><line x1="0" y1={y} x2={x} y2={y} stroke="currentColor" strokeDasharray="6 5"/><circle cx={x} cy={y} r="7" fill="currentColor"/></g>})}
  </svg>
  <div>Head curve • {curve.speedRpm} rpm • {curve.frequencyHz} Hz • {points.length} duty point(s)</div>
 </div>
}


function CurveMetric({config,kind}:{config:Config;kind:"efficiency"|"power"|"npsh"}){const curve=config.curves.find(x=>x.kind===kind);if(!curve||curve.points.length<2)return null;const sorted=[...curve.points].sort((a,b)=>a.q-b.q);const maxQ=Math.max(...sorted.map(p=>p.q),1);const maxV=Math.max(...sorted.map(p=>p.value),1);const width=640,height=180;const line=sorted.map(p=>`${(p.q/maxQ)*width},${height-(p.value/maxV)*height}`).join(" ");return <div className="curve"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={kind+" curve"}><polyline points={line} fill="none" stroke="currentColor" strokeWidth="4"/></svg><div>{kind} • {curve.unit} • {curve.speedRpm} rpm • {curve.frequencyHz} Hz</div></div>}
function App(){
 const[step,setStep]=useState(1);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const[series,setSeries]=useState<Series[]>([]);
 const[models,setModels]=useState<Model[]>([]);
 const[configs,setConfigs]=useState<Config[]>([]);
 const[selectedSeries,setSelectedSeries]=useState("");
 const[selectedModel,setSelectedModel]=useState("");
 const[configId,setConfigId]=useState("");
 const[project,setProject]=useState({number:"PRJ-"+new Date().getFullYear()+"-001",customer:"",title:""});
 const[projectId,setProjectId]=useState("");
 const[importCandidate,setImportCandidate]=useState<any>(null);
 const[dutyPoints,setDutyPoints]=useState<DutyPoint[]>([{q:10,head:50,label:"Design Point"}]);
 const[running,setRunning]=useState(false);
 const[selectionResult,setSelectionResult]=useState<any>(null);
 const selected=useMemo(()=>configs.find(item=>item.id===configId),[configs,configId]);

 useEffect(()=>{get<Series[]>("/api/v1/catalog/series").then(items=>{setSeries(items);setSelectedSeries(items[0]?.id??"")}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(!selectedSeries){setModels([]);return}get<Model[]>("/api/v1/catalog/models?seriesId="+encodeURIComponent(selectedSeries)).then(items=>{setModels(items);setSelectedModel(items[0]?.id??"")}).catch(e=>setError(e.message))},[selectedSeries]);
 useEffect(()=>{if(!selectedModel){setConfigs([]);return}get<Config[]>("/api/v1/catalog/configurations?modelId="+encodeURIComponent(selectedModel)).then(items=>{setConfigs(items);setConfigId(items[0]?.id??"")}).catch(e=>setError(e.message))},[selectedModel]);

 async function ensureProject(){
  if(projectId)return projectId;
  const created=await post<{id:string}>("/api/v1/projects",{number:project.number,customerName:project.customer,title:project.title});
  setProjectId(created.id);
  return created.id;
 }
 async function saveDutyPoints(){
  const id=await ensureProject();
  for(const point of dutyPoints)await post("/api/v1/projects/"+id+"/duty-points",point);
  return id;
 }
 async function runSelection(){
  if(!selected)throw new Error("Select a pump configuration first");
  if(dutyPoints.some(point=>point.q<=0||point.head<=0))throw new Error("All duty point flow and head values must be positive");
  setRunning(true);setError("");
  try{
   const request={dutyPoints,constraints:{maxMotorLoadRatio:1,allowedConfigurationIds:[selected.id]},flowUnit:"m3/h"};
   const result=await post<any>("/api/v1/selections/run",request);
   const candidate=result.candidates?.find((item:any)=>item.configurationId===selected.id);
   if(!candidate)throw new Error("The selected configuration does not satisfy all duty points.");
   setSelectionResult(result);
   const id=await saveDutyPoints();
   await post("/api/v1/projects/"+id+"/selection",{configurationId:selected.id,selectedOptionIds:selected.options?.map(item=>item.id)??[],request});
   setStep(5);
  }catch(e){setError(e instanceof Error?e.message:"Selection failed")}finally{setRunning(false)}
 }

 if(loading)return <main><div className="panel"><h2>Loading company catalog…</h2></div></main>;

 return <main>
  <header><div><h1>Pump Selection</h1><p>Company Engineering Selection Portal</p></div><div className="project">Project <b>{project.number}</b></div></header>
  {error&&<div className="error">{error}</div>}
  <nav>{["Project","Pump","Configuration","Duty Points","Result"].map((label,index)=><button key={label} className={step===index+1?"active":""} onClick={()=>setStep(index+1)}>{index+1}. {label}</button>)}</nav>

  {step===1&&<section className="panel">
   <h2>Project</h2>
   <label>Project Number<input value={project.number} onChange={event=>setProject({...project,number:event.target.value})}/></label>
   <label>Customer<input value={project.customer} onChange={event=>setProject({...project,customer:event.target.value})}/></label>
   <label>Project Title<input value={project.title} onChange={event=>setProject({...project,title:event.target.value})}/></label>
   <div className="subpanel"><h3>Project file</h3><p className="muted">Upload a project document for AI-assisted duty-point extraction. The extracted data remains a draft until reviewed.</p><input type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{await ensureProject();const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]??"");reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)});const result=await post<any>("/api/v1/projects/"+projectId+"/import",{fileName:file.name,mimeType:file.type||"application/octet-stream",contentBase64:data});setImportCandidate(result.candidate)}catch(err){setError(err instanceof Error?err.message:"Project import failed")}}}/>{importCandidate&&<div className="warning"><b>Draft extraction — review required.</b><pre>{JSON.stringify(importCandidate.data,null,2)}</pre><button onClick={()=>{const points=importCandidate.data?.dutyPoints;if(Array.isArray(points))setDutyPoints(points.map((p:any)=>({q:Number(p.q),head:Number(p.head),label:p.label})));setImportCandidate(null)}}>Use extracted duty points</button></div>}</div><button className="primary" onClick={async()=>{try{await ensureProject();setStep(2)}catch(e){setError(e instanceof Error?e.message:"Failed to create project")}}}>Continue</button>
  </section>}

  {step===2&&<section className="panel">
   <h2>Select Pump</h2>
   <div className="two">
    <label>Pump Series<select value={selectedSeries} onChange={event=>setSelectedSeries(event.target.value)}>{series.map(item=><option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
    <label>Pump Model<select value={selectedModel} onChange={event=>setSelectedModel(event.target.value)}>{models.map(item=><option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
   </div>
   <div className="grid">{configs.map(config=><button key={config.id} className={"card "+(configId===config.id?"selected":"")} onClick={()=>{setConfigId(config.id);setStep(3)}}><div className="pumpImage">{config.imageUrl?<img src={config.imageUrl} alt={config.code}/>:<span aria-hidden="true">PUMP</span>}</div><h3>{config.model?.name??config.code}</h3><p>{config.code}</p>{config.application&&<small>{config.application}</small>}<small>{config.motor?config.motor.powerKw+" kW":""} {config.options?.length?"• "+config.options.length+" valid options":""}</small></button>)}</div>
   {configs.length===0&&<p className="note">No valid configurations are available for this model.</p>}
  </section>}

  {step===3&&selected&&<section className="panel">
   <h2>Configuration {selected.code}</h2>
   <p className="muted">Only components belonging to this pump configuration are shown.</p>
   <div className="facts">
    <Fact label="Motor" value={selected.motor?selected.motor.powerKw+" kW":"—"}/>
    <Fact label="Voltage" value={selected.motor?.voltageV?selected.motor.voltageV+" V":"—"}/>
    <Fact label="Connection" value={selected.connection??"—"}/>
    <Fact label="Seal" value={selected.seal??"—"}/>
    <Fact label="Materials" value={selected.materials?Object.entries(selected.materials).map(([key,value])=>key+": "+value).join(", "):"—"}/>
    <Fact label="Dimensions" value={selected.dimensions?((selected.dimensions.lengthMm??"—")+" × "+(selected.dimensions.widthMm??"—")+" × "+(selected.dimensions.heightMm??"—")+" mm"):"—"}/>
   </div>
   <Curve config={selected} points={dutyPoints}/>
   <button className="primary" onClick={()=>setStep(4)}>Continue to Duty Points</button>
  </section>}

  {step===4&&selected&&<section className="panel">
   <h2>Duty Points</h2>
   <p className="muted">Enter all operating points. The deterministic hydraulic engine validates every point.</p>
   {dutyPoints.map((point,index)=><div className="two" key={index}>
    <label>Label<input value={point.label??""} onChange={event=>setDutyPoints(items=>items.map((item,i)=>i===index?{...item,label:event.target.value}:item))}/></label>
    <label>Flow<input type="number" min="0" value={point.q} onChange={event=>setDutyPoints(items=>items.map((item,i)=>i===index?{...item,q:Number(event.target.value)}:item))}/><span>m³/h</span></label>
    <label>Head<input type="number" min="0" value={point.head} onChange={event=>setDutyPoints(items=>items.map((item,i)=>i===index?{...item,head:Number(event.target.value)}:item))}/><span>m</span></label>
    {dutyPoints.length>1&&<button onClick={()=>setDutyPoints(items=>items.filter((_,i)=>i!==index))}>Remove</button>}
   </div>)}
   <button onClick={()=>setDutyPoints(items=>[...items,{q:10,head:50,label:"Additional Point "+(items.length+1)}])}>Add Duty Point</button>
   <Curve config={selected} points={dutyPoints}/>
   <button className="primary" disabled={running||dutyPoints.some(point=>point.q<=0||point.head<=0)} onClick={runSelection}>{running?"Running hydraulic selection…":"Run Hydraulic Selection"}</button>
  </section>}

  {step===5&&selected&&<section className="sheet">
   <h2>Selection Results</h2>
   <div className="panel">
    <h3>Deterministic Selection Engine</h3>
    <p>Engine version: {selectionResult?.engineVersion??"—"}</p>
    <p>Valid candidates: <b>{selectionResult?.candidates?.length??0}</b></p>
    {selectionResult?.warnings?.length>0&&<div className="warning">{selectionResult.warnings.map((warning:string,index:number)=><div key={index}>{warning}</div>)}</div>}
    {selectionResult?.candidates?.slice(0,5).map((candidate:any)=><div className="card selected" key={candidate.configurationId}>
     <b>Configuration {candidate.configurationId}</b>
     {(candidate.dutyResults??[]).map((point:any,index:number)=><div key={index}>Point {index+1}: {point.availableHead?.toFixed?.(2)} m head • {point.efficiency?.toFixed?.(1)??"—"}% efficiency • {point.powerKw?.toFixed?.(2)??"—"} kW power • {point.motorLoadRatio!==undefined?(point.motorLoadRatio*100).toFixed(1)+"% motor load":"—"}</div>)}
    </div>)}
   </div>
   <section className="sheet">
    <div className="sheetHead"><div className="pumpImage large">PUMP</div><div><h1>{selected.model?.name??selected.code}</h1><p>Configuration: <b>{selected.code}</b></p><p>Project: {project.number}</p></div></div>
    <Curve config={selected} points={dutyPoints}/>
    <div className="facts">
     <Fact label="Motor" value={selected.motor?selected.motor.powerKw+" kW":"—"}/>
     <Fact label="Connection" value={selected.connection??"—"}/>
     <Fact label="Seal" value={selected.seal??"—"}/>
     <Fact label="Dimensions" value={selected.dimensions?((selected.dimensions.lengthMm??"—")+" × "+(selected.dimensions.widthMm??"—")+" × "+(selected.dimensions.heightMm??"—")+" mm"):"—"}/>
     <Fact label="Duty Points" value={dutyPoints.map(point=>point.q+" m³/h @ "+point.head+" m").join(" • ")}/>
    </div>
    <p className="warning">AI-Assisted Selection Notice: selections and project organization may use AI assistance and must be reviewed and verified by a qualified engineer before final approval, purchase, installation, or operation.</p>
    <div className="actions"><button onClick={()=>window.print()}>Print</button>{projectId&&<button onClick={()=>window.open(API+"/api/v1/projects/"+projectId+"/selection-sheet","_blank")}>Open Server Selection Sheet</button>}<button onClick={()=>setStep(3)}>Edit Configuration</button></div>
   </section>
  </section>}
 </main>
}

createRoot(document.getElementById("root")!).render(<App/>);
