/**
 * server.js — Local HTTP backend for QS-PID frontend
 *
 * Run:  npm run frontend
 * Open: http://localhost:3000
 *
 * FIXES (2026-03-01):
 *   - serveStatic: read file BEFORE writing headers to avoid
 *     ERR_HTTP_HEADERS_SENT crash on missing favicon/files
 *   - Added headersSent guard in catch block
 *   - Replaced deprecated url.parse() with WHATWG URL API
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = process.env.PORT || 3000;
const FRONTEND  = __dirname;
const ARTIFACTS = path.join(__dirname, '../artifacts');

const MIME = {
    '.html': 'text/html',
    '.css' : 'text/css',
    '.js'  : 'application/javascript',
    '.json': 'application/json',
    '.ico' : 'image/x-icon',
    '.png' : 'image/png',
    '.svg' : 'image/svg+xml',
};

/**
 * Serve a static file.
 * FIX: read file FIRST, then write headers.
 * This prevents ERR_HTTP_HEADERS_SENT when the file doesn't exist
 * (e.g. /favicon.ico, /robots.txt) because if readFileSync throws,
 * no headers have been sent yet and we can cleanly return 404.
 */
function serveStatic(res, filePath) {
    if (res.headersSent) return;   // guard: nothing to do if already responded
    const mime = MIME[path.extname(filePath)] || 'text/plain';
    let data;
    try {
        data = fs.readFileSync(filePath);   // read FIRST — may throw ENOENT
    } catch {
        // File not found — headers NOT sent yet, safe to send 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }
    // File read successfully — now send headers + body
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
}

function jsonResponse(res, data, status = 200) {
    if (res.headersSent) return;
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', c => (body += c));
        req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });
}

const artifactsReady = () =>
    fs.existsSync(path.join(ARTIFACTS, 'incomeProof_final.zkey')) &&
    fs.existsSync(path.join(ARTIFACTS, 'incomeProof_js', 'incomeProof.wasm'));

// ── API Handlers ──────────────────────────────────────────────────────

async function handleProve(req, res) {
    const body = await parseBody(req);
    const { income = '700000000', threshold = '500000000', verifierId = 'demo' } = body;

    if (!artifactsReady()) {
        return jsonResponse(res, {
            _demo:    true,
            _note:    'Run: npm run compile && npm run setup to enable real proofs',
            isValid:  BigInt(income) > BigInt(threshold),
            income:   '[hidden]',
            threshold, verifierId,
            proof:    { A: ['demo'], B: [['demo']], C: ['demo'], protocol: 'groth16', curve: 'bn254' },
            publicSignals: ['1'],
            timestamp: new Date().toISOString(),
        });
    }

    try {
        const IncomeProver = require('../src/prover');
        const prover = new IncomeProver();
        await prover.initialize();
        jsonResponse(res, await prover.generateProof(income, threshold, verifierId));
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
            _demo:     true,
            valid:     proofData.isValid === true,
            reason:    proofData._demo ? 'Demo mode — no real circuit verification' : 'Artifacts missing',
            timestamp: new Date().toISOString(),
        });
    }

    try {
        const IncomeVerifier = require('../src/verifier');
        const verifier = new IncomeVerifier();
        await verifier.initialize();
        jsonResponse(res, await verifier.verifyProof(proofData, proofData.verifierId || 'api-verifier'));
    } catch (e) {
        jsonResponse(res, { error: e.message }, 500);
    }
}

async function handlePQ(req, res) {
    try {
        const { MLDSAKeyPair, MigrationStateManager } = require('../src/pq/mldsa');
        const kp  = MLDSAKeyPair.generate('ML-DSA-65');
        const mgr = new MigrationStateManager();
        jsonResponse(res, {
            variant:    kp.variant,
            createdAt:  kp.createdAt,
            publicKey:  kp.publicKey.toString('hex'),
            phase:      mgr.phase || mgr.getCurrentPhase?.(),
            algorithms: mgr.getActiveAlgorithms?.() || ['ML-DSA-65'],
        });
    } catch (e) {
        jsonResponse(res, { error: e.message }, 500);
    }
}

function handleStatus(req, res) {
    jsonResponse(res, {
        status:         'online',
        version:        '1.0.0',
        artifactsReady: artifactsReady(),
        nodeVersion:    process.version,
        uptime:         process.uptime().toFixed(1) + 's',
        timestamp:      new Date().toISOString(),
        endpoints: {
            'POST /api/prove':  'Generate ZKP income proof',
            'POST /api/verify': 'Verify a proof',
            'GET  /api/pq':     'ML-DSA key pair demo',
            'GET  /api/status': 'System status',
        },
    });
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Methods': 'GET,POST',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        return res.end();
    }

    // Parse URL using WHATWG URL API (no deprecated url.parse)
    const reqUrl   = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = reqUrl.pathname;

    // API routes — return early so static handler is never reached
    if (pathname === '/api/prove')  return await handleProve(req, res);
    if (pathname === '/api/verify') return await handleVerify(req, res);
    if (pathname === '/api/pq')     return await handlePQ(req, res);
    if (pathname === '/api/status') { handleStatus(req, res); return; }

    // Static file serving
    const filePath = (pathname === '/' || pathname === '')
        ? path.join(FRONTEND, 'index.html')
        : path.join(FRONTEND, pathname.replace(/^\//, ''));

    serveStatic(res, filePath);
});

server.on('error', (err) => {
    console.error('[!] Server error:', err.message);
});

server.listen(PORT, () => {
    console.log(`\n[✓] QS-PID frontend running at http://localhost:${PORT}`);
    console.log(`[*] Artifacts ready : ${artifactsReady()}`);
    console.log('[*] Press Ctrl+C to stop\n');
});
