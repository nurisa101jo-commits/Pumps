import type {AiIngestionBoundary,ExtractionInput,IngestionCandidate} from "./index.js";
export class HttpAiIngestionProvider implements AiIngestionBoundary{
 constructor(private readonly endpoint:string,private readonly apiKey?:string){}
 async extract<T>(input:ExtractionInput):Promise<IngestionCandidate<T>>{
  const response=await fetch(this.endpoint,{method:"POST",headers:{"content-type":"application/json",...(this.apiKey?{"authorization":"Bearer "+this.apiKey}:{})},body:JSON.stringify(input)});
  if(!response.ok)throw new Error("AI ingestion provider returned HTTP "+response.status);
  return await response.json() as IngestionCandidate<T>;
 }
}
