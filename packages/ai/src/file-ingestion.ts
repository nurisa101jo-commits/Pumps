import {PDFParse} from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
export type IngestionFile={mimeType:string;fileName:string;bytes:Uint8Array;documentId:string};
export type ParsedPage={page?:number;text:string;table?:string};
export type ParsedDocument={documentId:string;fileName:string;mimeType:string;pages:ParsedPage[];rawText:string};
export interface ImageOcrProvider{extractImage(input:{mimeType:string;bytes:Uint8Array;documentId:string}):Promise<ParsedDocument>}
export async function parseIngestionFile(input:IngestionFile,ocr?:ImageOcrProvider):Promise<ParsedDocument>{
 const m=input.mimeType.toLowerCase(),b=Buffer.from(input.bytes);
 if(m==="application/pdf"||input.fileName.toLowerCase().endsWith(".pdf")){const parser=new PDFParse({data:b});try{const result=await parser.getText();return{documentId:input.documentId,fileName:input.fileName,mimeType:input.mimeType,pages:[{text:result.text}],rawText:result.text}}finally{await parser.destroy()}}
 if(m.includes("spreadsheet")||m.includes("excel")||/\.(xlsx|xls|csv)$/i.test(input.fileName)){const wb=XLSX.read(b,{type:"buffer",cellDates:false});const pages=wb.SheetNames.flatMap(name=>{const sheet=wb.Sheets[name];return sheet?[{table:name,text:XLSX.utils.sheet_to_csv(sheet)}]:[];});return{documentId:input.documentId,fileName:input.fileName,mimeType:input.mimeType,pages,rawText:pages.map(x=>"["+x.table+"]\n"+x.text).join("\n")}}
 if(m.includes("wordprocessingml")||m==="application/msword"||/\.(docx|doc)$/i.test(input.fileName)){const result=await mammoth.extractRawText({buffer:b});return{documentId:input.documentId,fileName:input.fileName,mimeType:input.mimeType,pages:[{text:result.value}],rawText:result.value}}
 if(m.startsWith("text/")||m==="application/json"){const text=b.toString("utf8");return{documentId:input.documentId,fileName:input.fileName,mimeType:input.mimeType,pages:[{text}],rawText:text}}
 if(m.startsWith("image/")){if(!ocr)throw new Error("Image ingestion requires a configured OCR provider");return ocr.extractImage({mimeType:input.mimeType,bytes:input.bytes,documentId:input.documentId})}
 throw new Error("Unsupported ingestion file type: "+input.mimeType);
}
