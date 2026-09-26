export type {SourceReference} from "@pumps/domain/source";
export type {ExtractionConflict} from "@pumps/domain/ai";
import type {SourceReference} from "@pumps/domain/source";
import type {ExtractionConflict} from "@pumps/domain/ai";
export type IngestionCandidate<T>={data:T;confidence:number;sources:SourceReference[];conflicts:ExtractionConflict[];status:"draft"|"approved"|"rejected"};
export type ImportScope="catalog"|"curves"|"dimensions"|"motors"|"materials"|"seals"|"configurations"|"project";
export type ExtractionInput={mimeType:string;fileName:string;documentId:string;content:string;pages?:Array<{page?:number;table?:string;text:string}>;scope?:ImportScope};
export interface AiIngestionBoundary{extract<T>(input:ExtractionInput):Promise<IngestionCandidate<T>>}
export * from "./file-ingestion.js";
export * from "./http-provider.js";
export * from "./catalog-schema.js";
export * from "./catalog-validator.js";
export * from "./targeted-import.js";
export * from "./catalog-traceability.js";
