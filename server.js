const express=require('express'), multer=require('multer'), fs=require('fs'), path=require('path'), {spawn}=require('child_process');
const app=express(); const PORT=process.env.PORT||10000;
for (const d of ['uploads','results']) fs.mkdirSync(path.join(__dirname,d),{recursive:true});
const upload=multer({dest:path.join(__dirname,'uploads'),limits:{fileSize:20*1024*1024}});
app.use(express.static(path.join(__dirname,'public'))); app.use('/results',express.static(path.join(__dirname,'results')));
app.get('/api/health',(req,res)=>res.json({ok:true,omr:!!process.env.AUDIVERIS_CMD}));
app.post('/api/transcribe',upload.single('score'),async(req,res)=>{
 if(!req.file) return res.status(400).json({error:'Aucune partition reçue.'});
 const cmd=process.env.AUDIVERIS_CMD;
 if(!cmd) return res.status(503).json({error:'Le site est prêt, mais le moteur OMR du serveur n’est pas encore activé.'});
 const out=path.join(__dirname,'results',req.file.filename); fs.mkdirSync(out,{recursive:true});
 const p=spawn(cmd,['-batch','-export','-output',out,req.file.path],{shell:true}); let err=''; p.stderr.on('data',d=>err+=d);
 p.on('error',e=>res.status(500).json({error:'Impossible de démarrer le moteur OMR.',detail:e.message}));
 p.on('close',code=>{ if(code!==0)return res.status(500).json({error:'La retranscription a échoué.',detail:err.slice(-1200)});
   const files=fs.readdirSync(out).filter(f=>/\.(mxl|musicxml|xml)$/i.test(f)); if(!files.length)return res.status(500).json({error:'Le moteur a terminé sans produire de MusicXML.'});
   res.json({ok:true,musicxml:'/results/'+req.file.filename+'/'+files[0]});
 });
});
app.listen(PORT,()=>console.log('PianoFlow http://localhost:'+PORT));
