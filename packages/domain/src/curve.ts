export type CurveKind="head"|"efficiency"|"power"|"npsh";
export type CurvePoint={q:number;value:number};
export type CurveDataset={id:string;configurationId:string;kind:CurveKind;unit:string;speedRpm:number;frequencyHz:number;points:CurvePoint[];sourceId?:string};
export type DutyPoint={id?:string;q:number;head:number;efficiency?:number;npshr?:number;powerKw?:number};
export function interpolate(points:CurvePoint[],q:number){const p=[...points].sort((a,b)=>a.q-b.q);if(p.length<1||q<p[0].q||q>p[p.length-1].q)return undefined;for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];if(q>=a.q&&q<=b.q){const t=(q-a.q)/(b.q-a.q);return a.value+(b.value-a.value)*t}}return p[p.length-1].value}
export function validateCurvePoints(points:CurvePoint[]){if(points.length<2)throw new Error("Curve requires at least two points");const p=[...points].sort((a,b)=>a.q-b.q);for(let i=0;i<p.length;i++){if(!Number.isFinite(p[i].q)||!Number.isFinite(p[i].value))throw new Error("Curve points must be finite numbers");if(i>0&&p[i].q===p[i-1].q)throw new Error("Curve Q values must be unique")}return true}
