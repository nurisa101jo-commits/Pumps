export type SourceReference={documentId:string;page?:number;table?:string;region?:string;excerpt?:string};
export type ExtractionConflict={field:string;values:string[];reason:string;source?:SourceReference};
export type IngestionCandidate<T>={data:T;confidence:number;sources:SourceReference[];conflicts:ExtractionConflict[];status:"draft"|"approved"|"rejected"};
export type ExtractionInput={mimeType:string;fileName:string;documentId:string;content:string;pages?:Array<{page?:number;table?:string;text:string}>};
export interface AiIngestionBoundary{extract<T>(input:ExtractionInput):Promise<IngestionCandidate<T>>;approve<T>(candidate:IngestionCandidate<T>,confirmation:boolean):Promise<IngestionCandidate<T>>}
export * from "./file-ingestion.js";
export * from "./http-provider.js";
export * from "./catalog-schema.js";
export * from "./catalog-validator.js";
export * from "./targeted-import.js";
export * from "./catalog-traceability.js";
