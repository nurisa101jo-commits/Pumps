export type AuditEvent={id:string;entityType:string;entityId:string;action:"create"|"update"|"delete"|"approve"|"reject"|"restore";actorId:string;timestamp:string;before?:unknown;after?:unknown;metadata?:Record<string,unknown>};
export type BackupJob={id:string;type:"automatic"|"manual";startedAt:string;completedAt?:string;status:"running"|"completed"|"failed";location?:string;checksum?:string};
