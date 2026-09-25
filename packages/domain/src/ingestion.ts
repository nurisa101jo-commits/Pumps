import type {ExtractionConflict} from "./ai.js";
import type {SourceReference} from "./source.js";
export type IngestionStatus="draft"|"review"|"approved"|"rejected";
export type IngestionJob={id:string;sourceName:string;sourceType:"pdf"|"image"|"spreadsheet"|"document";status:IngestionStatus;createdAt:string;createdBy:string};
export type IngestionReview<T>= {jobId:string;candidate:T;sources:SourceReference[];conflicts:ExtractionConflict[];status:IngestionStatus;approvedBy?:string;approvalNote?:string;requiresConfirmation:boolean};
