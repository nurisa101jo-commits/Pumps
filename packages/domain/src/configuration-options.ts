export type EngineeringOptionKind="material"|"seal"|"connection"|"impeller"|"accessory";
export type EngineeringOption={id:string;kind:EngineeringOptionKind;code:string;name:string;description?:string;active?:boolean};
