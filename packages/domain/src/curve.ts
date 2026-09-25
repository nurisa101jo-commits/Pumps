export type CurveKind="head"|"efficiency"|"power"|"npsh";
export type CurvePoint={q:number;value:number};
export type CurveDataset={id:string;configurationId:string;kind:CurveKind;unit:string;speedRpm:number;frequencyHz:number;points:CurvePoint[];sourceId?:string};
export type DutyPoint={id?:string;q:number;head:number;efficiency?:number;npshr?:number;powerKw?:number};

export function interpolate(points:CurvePoint[],q:number){
 const p=[...points].sort((a,b)=>a.q-b.q);
 const first=p[0]; const last=p[p.length-1];
 if(!first||!last||q<first.q||q>last.q)return undefined;
 for(let i=0;i<p.length-1;i++){
  const a=p[i]; const b=p[i+1];
  if(!a||!b)continue;
  if(q>=a.q&&q<=b.q){
   const denominator=b.q-a.q;
   if(denominator===0)return undefined;
   const t=(q-a.q)/denominator;
   return a.value+(b.value-a.value)*t;
  }
 }
 return last.value;
}

export function validateCurvePoints(points:CurvePoint[]){
 if(points.length<2)throw new Error("Curve requires at least two points");
 const p=[...points].sort((a,b)=>a.q-b.q);
 for(let i=0;i<p.length;i++){
  const point=p[i];
  if(!point||!Number.isFinite(point.q)||!Number.isFinite(point.value))throw new Error("Curve points must be finite numbers");
  const previous=p[i-1];
  if(previous&&point.q===previous.q)throw new Error("Curve Q values must be unique");
 }
 return true;
}
