import type {SelectionRequest,SelectionResult} from "@pumps/domain";
export const selectionEngine={select(request:SelectionRequest):SelectionResult{return {candidates:[],warnings:["Catalog is empty; import approved pump data before selection."],engineVersion:"0.1.0"}}};
