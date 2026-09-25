import type {SelectionRequest} from "@pumps/domain";
export type ConfigurationCatalogItem={id:string;modelId:string;code:string;name?:string;motorId:string;optionIds?:string[];headCurve?:Array<{q:number;value:number}>;efficiencyCurve?:Array<{q:number;value:number}>;npshCurve?:Array<{q:number;value:number}>};
export function compatibleConfigurations(request:SelectionRequest,items:ConfigurationCatalogItem[]){return items.filter(item=>!request.constraints?.allowedConfigurationIds||request.constraints.allowedConfigurationIds.includes(item.id))}
