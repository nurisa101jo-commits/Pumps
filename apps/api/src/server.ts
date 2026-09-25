import Fastify from "fastify";
import {selectionEngine} from "@pumps/selection-engine";
const app=Fastify({logger:true});
app.get("/health",async()=>({status:"ok",service:"pumps-api"}));
app.post("/api/v1/selections/preview",async(request,reply)=>reply.send(selectionEngine.select(request.body as any)));
app.listen({host:"0.0.0.0",port:Number(process.env.PORT??4000)}).catch(e=>{app.log.error(e);process.exit(1)});
