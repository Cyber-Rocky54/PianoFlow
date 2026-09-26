const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const AUDIVERIS = process.env.AUDIVERIS_CMD || '/opt/audiveris/bin/Audiveris';
const MAX_FILE = 20 * 1024 * 1024;
const allowed = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.tif', '.tiff', '.bmp']);
const jobs = new Map();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(ext && allowed.has(ext) ? null : new Error('Format non pris en charge.'), ext && allowed.has(ext));
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', async (req, res) => {
  try { await fsp.access(AUDIVERIS, fs.constants.X_OK); res.json({ ok: true, omr: true }); }
  catch { res.status(503).json({ ok: false, omr: false }); }
});

function runAudiveris(input, outDir) {
  return new Promise((resolve, reject) => {
    const args = ['-batch', '-transcribe', '-export', '-output', outDir, '--', input];
    const p = spawn(AUDIVERIS, args, { shell: false, env: { ...process.env, HOME: outDir } });
    let log = '';
    const add = d => { log = (log + d.toString()).slice(-12000); };
    p.stdout.on('data', add); p.stderr.on('data', add);
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('La reconnaissance a dépassé 4 minutes.')); }, 240000);
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => { clearTimeout(timer); code === 0 ? resolve(log) : reject(new Error(`Audiveris a quitté avec le code ${code}.\n${log.slice(-2500)}`)); });
  });
}

async function findMxl(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { const hit = await findMxl(p); if (hit) return hit; }
    else if (/\.(mxl|musicxml|xml)$/i.test(e.name)) return p;
  }
  return null;
}

app.post('/api/transcribe', upload.single('score'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucune partition reçue.' });
  const id = crypto.randomUUID();
  const ext = path.extname(req.file.originalname || '').toLowerCase() || '.png';
  const base = path.join(os.tmpdir(), `pianoflow-${id}`);
  const input = path.join(base, `partition${ext}`);
  const output = path.join(base, 'output');
  jobs.set(id, { status: 'processing', created: Date.now() });
  res.status(202).json({ ok: true, jobId: id });

  (async () => {
    try {
      await fsp.mkdir(output, { recursive: true });
      await fsp.rename(req.file.path, input);
      await runAudiveris(input, output);
      const mxl = await findMxl(output);
      if (!mxl) throw new Error('Audiveris a terminé sans produire de fichier MusicXML.');
      const data = await fsp.readFile(mxl);
      jobs.set(id, { status: 'done', created: Date.now(), name: path.basename(mxl), data });
    } catch (e) {
      jobs.set(id, { status: 'error', created: Date.now(), error: e.message.slice(0, 3000) });
    } finally {
      await fsp.rm(base, { recursive: true, force: true }).catch(() => {});
    }
  })();
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Tâche introuvable.' });
  if (job.status === 'done') return res.json({ status: 'done', result: `/api/jobs/${req.params.id}/result` });
  if (job.status === 'error') return res.status(500).json({ status: 'error', error: job.error });
  res.json({ status: 'processing' });
});
app.get('/api/jobs/:id/result', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== 'done') return res.status(404).end();
  res.type(job.name.toLowerCase().endsWith('.mxl') ? 'application/vnd.recordare.musicxml' : 'application/xml');
  res.send(job.data);
});

setInterval(() => { const cutoff = Date.now() - 30 * 60 * 1000; for (const [id, j] of jobs) if (j.created < cutoff) jobs.delete(id); }, 5 * 60 * 1000).unref();
app.use((err, req, res, next) => res.status(400).json({ error: err.message || 'Erreur pendant l’envoi.' }));
app.listen(PORT, '0.0.0.0', () => console.log(`PianoFlow écoute sur ${PORT}; Audiveris=${AUDIVERIS}`));
