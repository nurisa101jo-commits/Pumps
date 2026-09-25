import type {Project,ProjectDutyPoint,ProjectSelection} from "./project.js";
import type {PumpConfigurationView,ConfigurationOption} from "./configuration.js";
export type SelectionSheet={project:Project;selection:ProjectSelection;configuration:PumpConfigurationView;options:ConfigurationOption[];dutyPoints:ProjectDutyPoint[];warnings:string[];generatedAt:string};
export function buildSelectionSheet(input:Omit<SelectionSheet,"generatedAt">):SelectionSheet{return{...input,generatedAt:new Date().toISOString()}}
