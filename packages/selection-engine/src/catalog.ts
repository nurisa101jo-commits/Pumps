import type {SelectionRequest} from "@pumps/domain";
import type {CatalogConfiguration} from "./index.js";
export interface CatalogProvider{findConfigurations(request:SelectionRequest):Promise<CatalogConfiguration[]>;}
export class MemoryCatalogProvider implements CatalogProvider{constructor(private readonly catalog:CatalogConfiguration[]){ }async findConfigurations(){return this.catalog}}
