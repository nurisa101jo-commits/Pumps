import type {Pool} from "pg";
import {randomUUID} from "node:crypto";
import type {ProductDocument,SourceReference} from "@pumps/domain/source";
export type EntitySourceLink={entityType:string;entityId:string;sourceReferenceId:string;fieldName?:string};
export type DocumentStore={documents:Map<string,ProductDocument>;references:Map<string,SourceReference>;links:EntitySourceLink[];pool?:Pool};
export function createDocumentStore(pool?:Pool):DocumentStore{return{documents:new Map(),references:new Map(),links:[],pool}};
export async function loadDocuments(store:DocumentStore){if(!store.pool)return;const docs=await store.pool.query(`SELECT id,name,file_name AS "fileName",mime_type AS "mimeType",storage_key AS "storageKey",checksum,"uploadedAt",uploaded_by AS "uploadedBy",description FROM product_documents`.replace('"uploadedAt"','uploaded_at AS "uploadedAt"'));const refs=await store.pool.query(`SELECT id,document_id AS "documentId",page,table_name AS "table",region,excerpt FROM source_references`);store.documents.clear();store.references.clear();store.links=[];for(const x of docs.rows)store.documents.set(x.id,x);for(const x of refs.rows)store.references.set(x.id,x); const links=await store.pool.query(`SELECT entity_type AS "entityType",entity_id AS "entityId",source_reference_id AS "sourceReferenceId",field_name AS "fieldName" FROM entity_source_references`); for(const x of links.rows)store.links.push(x)}
export async function createDocument(store:DocumentStore,input:Omit<ProductDocument,"id">){const id=randomUUID();const item={id,...input};if(store.pool)await store.pool.query("INSERT INTO product_documents(id,name,file_name,mime_type,storage_key,checksum,uploaded_at,uploaded_by,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id,item.name,item.fileName,item.mimeType,item.storageKey,item.checksum??null,item.uploadedAt,item.uploadedBy,item.description??null]);store.documents.set(id,item);return item}
export async function createSourceReference(store:DocumentStore,input:Omit<SourceReference,"id">){const id=randomUUID();const item={id,...input};if(!store.documents.has(item.documentId))throw new Error("documentId does not exist");if(store.pool)await store.pool.query("INSERT INTO source_references(id,document_id,page,table_name,region,excerpt) VALUES($1,$2,$3,$4,$5,$6)",[id,item.documentId,item.page??null,item.table??null,item.region??null,item.excerpt??null]);store.references.set(id,item);return item}

export async function linkEntitySource(store:DocumentStore,input:EntitySourceLink){if(!store.references.has(input.sourceReferenceId))throw new Error("sourceReferenceId does not exist");store.links.push(input);if(store.pool)await store.pool.query("INSERT INTO entity_source_references(entity_type,entity_id,source_reference_id,field_name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",[input.entityType,input.entityId,input.sourceReferenceId,input.fieldName??null]);return input}

export async function ensureDocument(store:DocumentStore,id:string,input:Omit<ProductDocument,"id">){
 const existing=store.documents.get(id);
 if(existing)return existing;
 const item={id,...input};
 if(store.pool)await store.pool.query("INSERT INTO product_documents(id,name,file_name,mime_type,storage_key,checksum,uploaded_at,uploaded_by,description) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING",[id,item.name,item.fileName,item.mimeType,item.storageKey,item.checksum??null,item.uploadedAt,item.uploadedBy,item.description??null]);
 store.documents.set(id,item);return item;
}
