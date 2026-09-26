import {build} from "esbuild";import {mkdir} from "node:fs/promises";import {join} from "node:path";
const root=process.cwd();await mkdir(join(root,"dist","api"),{recursive:true});
await build({entryPoints:[join(root,"..","api","src","server.ts")],bundle:true,platform:"node",format:"esm",target:"node22",outfile:join(root,"dist","api","server.js"),packages:"bundle",sourcemap:false,logLevel:"info"});
