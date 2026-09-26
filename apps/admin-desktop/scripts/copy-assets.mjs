import {cp,mkdir} from "node:fs/promises";import {join} from "node:path";
const root=process.cwd();
await mkdir(join(root,"dist"),{recursive:true});
await cp(join(root,"..","api","dist"),join(root,"dist","api","legacy"),{recursive:true});
await cp(join(root,"..","..","packages","db","dist","migrations"),join(root,"dist","api","migrations"),{recursive:true});
await cp(join(root,"..","admin","dist"),join(root,"dist","admin"),{recursive:true});