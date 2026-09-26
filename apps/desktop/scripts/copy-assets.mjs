import {cp,mkdir} from "node:fs/promises";import {join} from "node:path";
const root=process.cwd();
await mkdir(join(root,"dist"),{recursive:true});
await cp(join(root,"..","..","apps","api","dist"),join(root,"dist","api"),{recursive:true});
await cp(join(root,"..","selection","dist"),join(root,"dist","selection"),{recursive:true});
