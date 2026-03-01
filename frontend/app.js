/* app.js — QS-PID Frontend Logic
 * Communicates with the local Express backend (frontend/server.js)
 * Base URL is auto-detected (same origin in dev)
 */

const API = window.location.origin;

// ── Helpers ──────────────────────────────────────────────────────────────────

function show(id)  { document.getElementById(id).classList.remove('hidden'); }
function hide(id)  { document.getElementById(id).classList.add('hidden'); }
function el(id)    { return document.getElementById(id); }

function showBanner(msg, type = 'ok') {
  const b = el('statusBanner');
  b.textContent = msg;
  b.className   = `banner ${type}`;
  show('statusBanner');
  setTimeout(() => hide('statusBanner'), 5000);
}

function renderOutput(elId, data, isError = false) {
  const out = el(elId);
  out.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  out.className   = 'output' + (isError ? ' error' : '');
  show(elId);
}

async function apiCall(endpoint, body = null) {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const res  = await fetch(`${API}${endpoint}`, opts);
  return res.json();
}

// ── 1. Generate Proof ─────────────────────────────────────────────────────────

async function generateProof() {
  const income     = el('income').value.trim();
  const threshold  = el('threshold').value.trim();
  const verifierId = el('verifierId').value.trim();

  if (!income) { showBanner('Please enter your income amount.', 'err'); return; }

  hide('proveOutput');
  show('proveLoader');
  el('proveBtn').disabled = true;

  try {
    const res = await apiCall('/api/prove', { income, threshold, verifierId });
    hide('proveLoader');
    el('proveBtn').disabled = false;

    if (res.error) {
      renderOutput('proveOutput', '❌ Error: ' + res.error, true);
      showBanner('Proof generation failed.', 'err');
    } else {
      renderOutput('proveOutput', res);
      // Auto-fill verify box
      el('proofInput').value = JSON.stringify(res, null, 2);
      showBanner(res.isValid ? '✅ Income verified above threshold!' : '⚠️ Income is below threshold.', res.isValid ? 'ok' : 'err');
    }
  } catch (e) {
    hide('proveLoader');
    el('proveBtn').disabled = false;
    renderOutput('proveOutput', '❌ Network error: ' + e.message, true);
  }
}

// ── 2. Verify Proof ───────────────────────────────────────────────────────────

async function verifyProof() {
  const raw = el('proofInput').value.trim();
  if (!raw) { showBanner('Paste a proof JSON first.', 'err'); return; }

  let proofData;
  try { proofData = JSON.parse(raw); }
  catch (e) { showBanner('Invalid JSON in proof box.', 'err'); return; }

  hide('verifyOutput');
  show('verifyLoader');

  try {
    const res = await apiCall('/api/verify', { proofData });
    hide('verifyLoader');

    if (res.error) {
      renderOutput('verifyOutput', '❌ Error: ' + res.error, true);
      showBanner('Verification failed.', 'err');
    } else {
      renderOutput('verifyOutput', res);
      showBanner(res.valid ? '✅ Proof is VALID' : '❌ Proof is INVALID', res.valid ? 'ok' : 'err');
    }
  } catch (e) {
    hide('verifyLoader');
    renderOutput('verifyOutput', '❌ Network error: ' + e.message, true);
  }
}

// ── 3. PQ Info ────────────────────────────────────────────────────────────────

async function getPQInfo() {
  hide('pqOutput');
  try {
    const res = await apiCall('/api/pq');
    renderOutput('pqOutput', res);
  } catch (e) {
    renderOutput('pqOutput', '❌ ' + e.message, true);
  }
}

// ── 4. System Status ──────────────────────────────────────────────────────────

async function getStatus() {
  hide('statusOutput');
  try {
    const res = await apiCall('/api/status');
    renderOutput('statusOutput', res);
  } catch (e) {
    renderOutput('statusOutput', '❌ ' + e.message, true);
  }
}

// Auto-load status on page load
window.addEventListener('DOMContentLoaded', getStatus);
