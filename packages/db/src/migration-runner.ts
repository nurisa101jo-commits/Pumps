import type {Pool} from "pg";
import {readFile} from "node:fs/promises";
import {readdir} from "node:fs/promises";
import {join} from "node:path";

export type MigrationRunnerOptions={directory:string};
export async function runMigrations(pool:Pool,options:MigrationRunnerOptions){
 await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL)");
 const files=(await readdir(options.directory)).filter(x=>/^\d+_.+\.sql$/i.test(x)).sort();
 const applied=new Set<string>((await pool.query("SELECT version FROM schema_migrations")).rows.map((x:any)=>x.version));
 for(const file of files){
  const version=file.split("_",1)[0];
  if(applied.has(version))continue;
  const sql=await readFile(join(options.directory,file),"utf8");
  const client=await pool.connect();
  try{await client.query("BEGIN");await client.query(sql);await client.query("INSERT INTO schema_migrations(version,applied_at) VALUES($1,$2)",[version,new Date().toISOString()]);await client.query("COMMIT")}
  catch(error){await client.query("ROLLBACK");throw error}
  finally{client.release()}
 }
}
