const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 10000;
const AUDIVERIS = process.env.AUDIVERIS_CMD || '/opt/audiveris/bin/Audiveris';
const MAX_FILE = 20 * 1024 * 1024;
const allowed = new Set(['.png','.jpg','.jpeg','.pdf','.tif','.tiff','.bmp']);
const jobs = new Map();

app.use((req,res,next)=>{ console.log(`[HTTP] ${req.method} ${req.url}`); next(); });

const upload = multer({
  dest: os.tmpdir(), limits: { fileSize: MAX_FILE },
  fileFilter: (req,file,cb)=>{
    const ext=path.extname(file.originalname||'').toLowerCase();
    const ok=!!ext && allowed.has(ext);
    cb(ok?null:new Error('Format non pris en charge. JPG, JPEG, PNG ou PDF attendu.'),ok);
  }
});

app.get('/api/health', async (req,res)=>{
  try { await fsp.access(AUDIVERIS, fs.constants.X_OK); res.json({ok:true,omr:true}); }
  catch { res.status(503).json({ok:false,omr:false}); }
});

function runAudiveris(input,outDir,id){
  return new Promise((resolve,reject)=>{
    const audArgs=['-batch','-transcribe','-export','-output',outDir,'--',input];
    console.log(`[JOB ${id}] Audiveris start: ${path.basename(input)}`);
    const p=spawn('xvfb-run',['-a',AUDIVERIS,...audArgs],{shell:false,env:{...process.env,HOME:outDir}});
    let log=''; const add=d=>{ const s=d.toString(); log=(log+s).slice(-20000); process.stdout.write(`[AUD ${id}] ${s}`); };
    p.stdout.on('data',add); p.stderr.on('data',add);
    const timer=setTimeout(()=>{p.kill('SIGKILL');reject(new Error('La reconnaissance a dépassé 4 minutes.'));},240000);
    p.on('error',e=>{clearTimeout(timer);reject(e)});
    p.on('close',code=>{clearTimeout(timer); console.log(`[JOB ${id}] Audiveris exit=${code}`); code===0?resolve(log):reject(new Error(`Audiveris a quitté avec le code ${code}. ${log.slice(-2500)}`));});
  });
}

async function findMusic(dir){
  const entries=await fsp.readdir(dir,{withFileTypes:true});
  for(const e of entries){ const p=path.join(dir,e.name); if(e.isDirectory()){const hit=await findMusic(p);if(hit)return hit;} else if(/\.(mxl|musicxml|xml)$/i.test(e.name)) return p; }
  return null;
}

function xmlFromMxl(buffer){
  const zip=new AdmZip(buffer);
  const entries=zip.getEntries().filter(e=>!e.isDirectory);
  const container=entries.find(e=>e.entryName.toLowerCase()==='meta-inf/container.xml');
  if(container){
    const c=container.getData().toString('utf8');
    const m=c.match(/full-path=["']([^"']+)["']/i);
    if(m){ const root=zip.getEntry(m[1]); if(root) return root.getData().toString('utf8'); }
  }
  const score=entries.find(e=>/\.(musicxml|xml)$/i.test(e.entryName) && !/container\.xml$/i.test(e.entryName));
  if(!score) throw new Error('Le fichier MXL ne contient pas de MusicXML exploitable.');
  return score.getData().toString('utf8');
}

app.post('/api/transcribe',upload.single('score'),(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Aucune partition reçue.'});
  const id=crypto.randomUUID(); const ext=path.extname(req.file.originalname||'').toLowerCase()||'.png';
  const base=path.join(os.tmpdir(),`pianoflow-${id}`), input=path.join(base,`partition${ext}`), output=path.join(base,'output');
  console.log(`[JOB ${id}] upload ${req.file.originalname} (${req.file.size} bytes)`);
  jobs.set(id,{status:'processing',created:Date.now()});
  res.status(202).json({ok:true,jobId:id});
  (async()=>{try{
    await fsp.mkdir(output,{recursive:true}); await fsp.rename(req.file.path,input); await runAudiveris(input,output,id);
    const result=await findMusic(output); if(!result)throw new Error('Audiveris a terminé sans produire de fichier MusicXML/MXL.');
    const data=await fsp.readFile(result); let xml;
    if(result.toLowerCase().endsWith('.mxl')) xml=xmlFromMxl(data); else xml=data.toString('utf8');
    if(!/<(?:score-partwise|score-timewise)\b/i.test(xml)) throw new Error('Le résultat produit ne ressemble pas à un MusicXML valide.');
    jobs.set(id,{status:'done',created:Date.now(),xml}); console.log(`[JOB ${id}] done: ${path.basename(result)}, XML ${xml.length} chars`);
  }catch(e){jobs.set(id,{status:'error',created:Date.now(),error:String(e.message||e).slice(0,4000)});console.error(`[JOB ${id}] ERROR`,e);}finally{await fsp.rm(base,{recursive:true,force:true}).catch(()=>{});}})();
});

app.get('/api/jobs/:id',(req,res)=>{
  const job=jobs.get(req.params.id); if(!job)return res.status(404).json({status:'error',error:'Tâche introuvable.'});
  if(job.status==='done')return res.json({status:'done',musicxml:job.xml});
  if(job.status==='error')return res.status(500).json({status:'error',error:job.error});
  res.json({status:'processing'});
});

setInterval(()=>{const cutoff=Date.now()-30*60*1000;for(const [id,j] of jobs)if(j.created<cutoff)jobs.delete(id)},5*60*1000).unref();
app.use('/api',(req,res)=>res.status(404).json({error:`Route API introuvable: ${req.method} ${req.originalUrl}`}));
app.use((err,req,res,next)=>{console.error('[API ERROR]',err);res.status(400).json({error:err.message||'Erreur pendant l’envoi.'})});
app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`PianoFlow écoute sur ${PORT}; Audiveris=${AUDIVERIS}`));
