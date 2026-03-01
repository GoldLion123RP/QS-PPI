/**
 * server.js — Local Express backend for QS-PID frontend
 *
 * Run: npm run frontend
 * Open: http://localhost:3000
 *
 * ⚠️  This server requires compiled artifacts to exist.
 *     Run `npm run compile && npm run setup` first.
 *     For demo/GitHub Pages mode the API routes return mock data
 *     if artifacts are missing.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT       = process.env.PORT || 3000;
const FRONTEND   = __dirname;
const ARTIFACTS  = path.join(__dirname, '../artifacts');

// ── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.json': 'application/json',
  '.ico' : 'image/x-icon',
};

function serveStatic(res, filePath) {
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch  { resolve({}); }
    });
  });
}

const artifactsReady = () =>
  fs.existsSync(path.join(ARTIFACTS, 'incomeProof_final.zkey')) &&
  fs.existsSync(path.join(ARTIFACTS, 'incomeProof_js/incomeProof.wasm'));

// ── API Handlers ────────────────────────────────────────────────────────────

async function handleProve(req, res) {
  const body = await parseBody(req);
  const { income = '700000000', threshold = '500000000', verifierId = 'demo' } = body;

  if (!artifactsReady()) {
    // Demo mode — return mock proof
    return jsonResponse(res, {
      _demo: true,
      _note: 'Run npm run compile && npm run setup to enable real proofs',
      isValid: BigInt(income) > BigInt(threshold),
      income: '[hidden]',
      threshold,
      verifierId,
      proof: { A: ['demo'], B: [['demo']], C: ['demo'], protocol: 'groth16', curve: 'bn254' },
      publicSignals: ['1'],
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const IncomeProver = require('../src/prover');
    const prover = new IncomeProver();
    await prover.initialize();
    const result = await prover.generateProof(income, threshold, verifierId);
    jsonResponse(res, result);
  } catch (e) {
    jsonResponse(res, { error: e.message }, 500);
  }
}

async function handleVerify(req, res) {
  const body = await parseBody(req);
  const { proofData } = body;

  if (!proofData) return jsonResponse(res, { error: 'Missing proofData' }, 400);

  if (!artifactsReady() || proofData._demo) {
    return jsonResponse(res, {
      _demo: true,
      valid: proofData.isValid === true,
      reason: proofData._demo ? 'Demo mode — no real circuit verification' : 'Artifacts missing',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const IncomeVerifier = require('../src/verifier');
    const verifier = new IncomeVerifier();
    await verifier.initialize();
    const result = await verifier.verifyProof(
      proofData.proof,
      proofData.publicSignals,
      proofData.fiatShamirBinding
    );
    jsonResponse(res, result);
  } catch (e) {
    jsonResponse(res, { error: e.message }, 500);
  }
}

async function handlePQ(req, res) {
  try {
    const { MLDSAKeyPair, MigrationStateManager } = require('../src/pq/mldsa');
    const kp      = MLDSAKeyPair.generate('ML-DSA-65');
    const mgr     = new MigrationStateManager();
    jsonResponse(res, {
      variant   : kp.variant,
      createdAt : kp.createdAt,
      publicKey : kp.publicKey,
      phase     : mgr.phase || mgr.getCurrentPhase?.(),
      algorithms: mgr.getActiveAlgorithms?.() || ['ML-DSA-65'],
    });
  } catch (e) {
    jsonResponse(res, { error: e.message }, 500);
  }
}

function handleStatus(req, res) {
  jsonResponse(res, {
    status        : 'online',
    version       : '1.0.0',
    artifactsReady: artifactsReady(),
    nodeVersion   : process.version,
    uptime        : process.uptime().toFixed(1) + 's',
    timestamp     : new Date().toISOString(),
    endpoints: {
      'POST /api/prove'  : 'Generate ZKP income proof',
      'POST /api/verify' : 'Verify a proof',
      'GET  /api/pq'     : 'ML-DSA key pair demo',
      'GET  /api/status' : 'System status',
    },
  });
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsed  = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // API routes
  if (pathname === '/api/prove')  return handleProve(req, res);
  if (pathname === '/api/verify') return handleVerify(req, res);
  if (pathname === '/api/pq')     return handlePQ(req, res);
  if (pathname === '/api/status') return handleStatus(req, res);

  // Static files
  const filePath = pathname === '/' || pathname === ''
    ? path.join(FRONTEND, 'index.html')
    : path.join(FRONTEND, pathname.replace(/^\//,''));
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n[✓] QS-PID frontend running at http://localhost:${PORT}`);
  console.log(`[*] Artifacts ready: ${artifactsReady()}`);
  console.log('[*] Press Ctrl+C to stop\n');
});
