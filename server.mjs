import http from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'};
const run=(cmd,args,input)=>new Promise((resolve,reject)=>{const proc=spawn(cmd,args,{stdio:['pipe','pipe','pipe']});const out=[];let size=0;const timeout=setTimeout(()=>{proc.kill();reject(Error('Speech generation timed out.'));},60000);proc.stdout.on('data',b=>{size+=b.length;if(size>20e6){proc.kill();reject(Error('Audio output too large.'));}else out.push(b);});proc.on('error',e=>{clearTimeout(timeout);reject(e);});proc.on('close',code=>{clearTimeout(timeout);code===0?resolve(Buffer.concat(out)):reject(Error('Speech engine unavailable. Install espeak-ng on Linux, or use macOS.'));});proc.stdin.on('error',()=>{});proc.stdin.end(input);});
let speechBusy=false;
export const server=http.createServer(async(req,res)=>{const send=(code,body,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(type==='application/json'?JSON.stringify(body):body);};try{
 if(req.url==='/api/health')return send(200,{status:'ok',speech:process.platform==='darwin'?'macOS say':'espeak-ng'});
 if(req.url==='/api/speech'&&req.method==='POST'){
 // Loopback-only service: reject cross-origin website requests and serialize TTS jobs.
 const origin=req.headers.origin;if(origin&&origin!==`http://${req.headers.host}`)return send(403,{error:'Cross-origin requests are not permitted.'});
 if(req.headers['content-type']!=='application/json')return send(415,{error:'Expected JSON.'});if(speechBusy)return send(429,{error:'A speech export is already running.'});let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>20000)return send(413,{error:'Report is too long.'});chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks));}catch{return send(400,{error:'Invalid JSON.'});}if(typeof body.text!=='string'||!body.text.trim()||body.text.length>12000)return send(400,{error:'Provide 1–12,000 characters of feedback text.'});speechBusy=true;let temp;try{let bytes;if(process.platform==='darwin'){temp=await mkdtemp(path.join(os.tmpdir(),'mimora-'));const wav=path.join(temp,'feedback.wav');await run('/usr/bin/say',['-o',wav,'--file-format=WAVE','--data-format=LEI16@22050','-f','-'],body.text);bytes=await readFile(wav);}else bytes=await run('espeak-ng',['--stdout','--stdin','-s','155'],body.text);return send(200,bytes,'audio/wav');}finally{speechBusy=false;if(temp)await rm(temp,{recursive:true,force:true});}}
 if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed.'});let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(400,{error:'Invalid URL.'});}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return send(403,{error:'Forbidden.'});try{const data=await readFile(file);return send(200,req.method==='HEAD'?Buffer.alloc(0):data,mime[path.extname(file)]||'application/octet-stream');}catch{return send(404,{error:'Not found.'});}
 }catch(e){send(503,{error:e.message});}});
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||4173);server.listen(port,'127.0.0.1',()=>console.log(`MIMORA: http://127.0.0.1:${port}`));}
