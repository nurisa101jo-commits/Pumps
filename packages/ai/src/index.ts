export type SourceReference={documentId:string;page?:number;table?:string;region?:string;excerpt?:string};
export type ExtractionConflict={field:string;values:string[];reason:string;source?:SourceReference};
export type IngestionCandidate<T>={data:T;confidence:number;sources:SourceReference[];conflicts:ExtractionConflict[];status:"draft"|"approved"|"rejected"};
export interface AiIngestionBoundary{extract<T>(input:{mimeType:string;content:string}):Promise<IngestionCandidate<T>>;approve<T>(candidate:IngestionCandidate<T>,confirmation:boolean):Promise<IngestionCandidate<T>>}
