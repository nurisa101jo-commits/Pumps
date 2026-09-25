import {Pool, type PoolClient} from "pg";

export type PostgresOptions={connectionString?:string;max?:number};
export function createPool(options:PostgresOptions={}){return new Pool({connectionString:options.connectionString??process.env.DATABASE_URL,max:options.max??10})}
export async function withTransaction<T>(pool:Pool,fn:(client:PoolClient)=>Promise<T>):Promise<T>{
 const client=await pool.connect();
 try{await client.query("BEGIN");const result=await fn(client);await client.query("COMMIT");return result}
 catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}
export async function pingDatabase(pool:Pool){await pool.query("SELECT 1");return true}
