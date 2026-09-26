export type ProductDocument={id:string;name:string;fileName:string;mimeType:string;storageKey:string;checksum?:string;uploadedAt:string;uploadedBy:string;description?:string;sizeBytes?:number};
export type SourceReference={id:string;documentId:string;page?:number;table?:string;region?:string;excerpt?:string};
