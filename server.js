require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PRIVATE_PATHS = /^\/(server\.js|package(-lock)?\.json|dockerfile|docker-compose\.yml|supabase-migration\.sql|netlify(\/.*)?|node_modules(\/.*)?|.*\.py)$/i;

app.use((req, res, next) => {
  let decoded;
  try {
    decoded = path.posix.normalize(decodeURIComponent(req.path));
  } catch (err) {
    return res.status(400).end();
  }
  const hidden = decoded.split('/').some((part) => part.startsWith('.'));
  if (hidden || PRIVATE_PATHS.test(decoded)) return res.status(404).end();
  next();
});

app.use(express.static(__dirname, { dotfiles: 'ignore' }));

const FUNCTIONS_DIR = path.join(__dirname, 'netlify', 'functions');

function toNetlifyEvent(req) {
  return {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    path: req.path,
    body: ['GET', 'DELETE'].includes(req.method) ? null : JSON.stringify(req.body || {})
  };
}

fs.readdirSync(FUNCTIONS_DIR)
  .filter((f) => f.endsWith('.js'))
  .forEach((file) => {
    const name = file.replace(/\.js$/, '');
    const mod = require(path.join(FUNCTIONS_DIR, file));

    app.all(`/api/${name}`, async (req, res) => {
      try {
        const result = await mod.handler(toNetlifyEvent(req), {});
        res.status(result.statusCode || 200);
        if (result.headers) res.set(result.headers);
        res.send(result.body);
      } catch (err) {
        console.error(`Function ${name} crashed:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    console.log(`Mounted /api/${name} -> netlify/functions/${file}`);
  });

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`BKS Community Job Center running at http://localhost:${PORT}`));
