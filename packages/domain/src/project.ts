export type ProjectStatus="draft"|"selected"|"approved"|"quoted"|"closed";
export type Project={id:string;number:string;customerName?:string;customerCompany?:string;title?:string;application?:string;status:ProjectStatus;createdAt:string;updatedAt:string};
export type ProjectDutyPoint={id:string;projectId:string;label?:string;q:number;head:number;efficiency?:number;npshr?:number;powerKw?:number};
export type ProjectSelection={id:string;projectId:string;configurationId:string;selectedOptionIds:string[];createdAt:string};
