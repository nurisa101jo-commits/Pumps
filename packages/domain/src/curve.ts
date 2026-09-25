export type CurveKind="head"|"efficiency"|"power"|"npsh";
export type CurveDataset={id:string;configurationId:string;kind:CurveKind;unit:string;speedRpm:number;frequencyHz:number;points:Array<{q:number;value:number}>;sourceId?:string};
export type DutyPoint={id?:string;q:number;head:number;efficiency?:number;npshr?:number;powerKw?:number};
export function interpolate(points:Array<{q:number;value:number}>,q:number){const p=[...points].sort((a,b)=>a.q-b.q);if(p.length<1||q<p[0].q||q>p[p.length-1].q)return undefined;for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];if(q>=a.q&&q<=b.q){const t=(q-a.q)/(b.q-a.q);return a.value+(b.value-a.value)*t}}return p[p.length-1].value}
