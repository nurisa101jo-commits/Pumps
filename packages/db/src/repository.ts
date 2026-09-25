export interface ProductRepository<TSeries,TModel,TMotor,TConfig>{listSeries():Promise<TSeries[]>;listModels(seriesId?:string):Promise<TModel[]>;listMotors():Promise<TMotor[]>;listConfigurations(modelId?:string):Promise<TConfig[]>;getConfiguration(id:string):Promise<TConfig|null>;}
export interface RuleRepository<TRule>{listEnabled():Promise<TRule[]>;save(rule:TRule):Promise<TRule>;}
export interface AuditRepository<TEvent>{append(event:TEvent):Promise<void>;list(entityId?:string):Promise<TEvent[]>;}
