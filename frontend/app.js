/**
 * app.js — QS-PPI Frontend Logic
 *
 * Unit system:
 *   Internal circuit unit: 1 LPA = 100,000,000 internal units
 *   1 LPA = ₹1,00,000 (One Lakh Rupees per annum)
 *   5 LPA = ₹5,00,000  → internal = 500,000,000
 *   7 LPA = ₹7,00,000  → internal = 700,000,000
 */

const API = (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return window.location.origin;
    }
    return 'https://QSPPI-backend.onrender.com';
})();

// ── Unit constants ────────────────────────────────────────────────────────────

const UNITS_PER_LPA   = 100_000_000;   // 1 LPA = 100000000 internal units
const RUPEES_PER_LPA  = 100_000;       // 1 LPA = ₹1,00,000

/** Convert LPA to internal circuit units */
function lpaToUnits(lpa)   { return Math.round(parseFloat(lpa || 0) * UNITS_PER_LPA).toString(); }

/** Convert internal units to LPA */
function unitsToLPA(units) { return (parseFloat(units) / UNITS_PER_LPA).toFixed(2); }

/** Convert internal units to Rupees */
function unitsToRupees(units) { return parseFloat(units) / UNITS_PER_LPA * RUPEES_PER_LPA; }

/**
 * Format a number in Indian Rupee system (Lakhs/Crores)
 * e.g. 500000 → ₹5,00,000  |  10000000 → ₹1,00,00,000
 */
function formatINR(amount) {
    const n = Math.round(parseFloat(amount || 0));
    if (isNaN(n) || n === 0) return '\u20b90';
    const s    = n.toString();
    if (s.length <= 3) return '\u20b9' + s;
    const last3 = s.slice(-3);
    const rest  = s.slice(0, -3);
    // Indian grouping: groups of 2 from right after first 3
    const fmt = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return '\u20b9' + fmt + ',' + last3;
}

/** Format with LPA label */
function formatLPA(units) {
    const lpa = parseFloat(units) / UNITS_PER_LPA;
    return lpa % 1 === 0 ? lpa.toFixed(0) + ' LPA' : lpa.toFixed(2) + ' LPA';
}

// ── DOM helpers ─────────────────────────────────────────────────────────────

function show(id)  { document.getElementById(id).classList.remove('hidden'); }
function hide(id)  { document.getElementById(id).classList.add('hidden'); }
function el(id)    { return document.getElementById(id); }

function showBanner(msg, type = 'ok') {
    const b       = el('statusBanner');
    b.textContent = msg;
    b.className   = `banner ${type}`;
    show('statusBanner');
    setTimeout(() => hide('statusBanner'), 6000);
}

function renderOutput(elId, data, isError = false) {
    const out       = el(elId);
    out.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    out.className   = 'output' + (isError ? ' error' : '');
    show(elId);
}

async function apiCall(endpoint, body = null) {
    const opts = body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { method: 'GET' };
    const res = await fetch(`${API}${endpoint}`, opts);
    return res.json();
}

// ── LPA ↔ INR live sync ───────────────────────────────────────────────────────

/**
 * Called when user types in LPA input fields.
 * Updates the ₹ badge in real time.
 * @param {'income'|'threshold'} field
 */
function onLPAInput(field) {
    const lpaVal = parseFloat(el(field + 'LPA').value || 0);
    const rupees = lpaVal * RUPEES_PER_LPA;
    el(field + 'INR').textContent = formatINR(rupees);
}

/** Read current income/threshold from LPA inputs and convert to internal units */
function getFormValues() {
    const incomeLPA    = parseFloat(el('incomeLPA').value    || 0);
    const thresholdLPA = parseFloat(el('thresholdLPA').value || 5);
    const verifierId   = el('verifierId').value.trim() || 'demo-verifier-001';
    return {
        income:    lpaToUnits(incomeLPA),
        threshold: lpaToUnits(thresholdLPA),
        verifierId,
        incomeLPA,
        thresholdLPA,
    };
}

// ── Proof result summary renderer ────────────────────────────────────────────

function renderProofSummary(res, thresholdLPA) {
    // Remove old summary if exists
    const old = document.getElementById('proveSummary');
    if (old) old.remove();

    const section  = el('proveSection');
    const income   = res.isValid ? '\u2265 ' + thresholdLPA + ' LPA' : '< ' + thresholdLPA + ' LPA';
    const incomeINR = res.isValid
        ? '\u2265 ' + formatINR(thresholdLPA * RUPEES_PER_LPA)
        : '< ' + formatINR(thresholdLPA * RUPEES_PER_LPA);

    const div = document.createElement('div');
    div.id        = 'proveSummary';
    div.className = 'proof-summary';
    div.innerHTML = `
        <div class="row"><span class="k">Result</span>
          <span class="v ${res.isValid ? 'green' : 'red'}">
            ${res.isValid ? '\u2705 Income ABOVE threshold' : '\u274c Income BELOW threshold'}
          </span></div>
        <div class="row"><span class="k">Threshold</span>
          <span class="v">${thresholdLPA} LPA &nbsp;(${formatINR(thresholdLPA * RUPEES_PER_LPA)})</span></div>
        <div class="row"><span class="k">Your Income</span>
          <span class="v">${income} &nbsp;(${incomeINR})</span></div>
        <div class="row"><span class="k">Privacy</span>
          <span class="v green">Actual amount hidden \ud83d\udd10</span></div>
        ${res._demo ? '<div class="row"><span class="k">Mode</span><span class="v" style="color:#f59e0b">Demo (compile circuit for real proofs)</span></div>' : ''}
    `;
    section.appendChild(div);
}

// ── 1. Generate Proof ─────────────────────────────────────────────────────────

async function generateProof() {
    const { income, threshold, verifierId, incomeLPA, thresholdLPA } = getFormValues();

    if (!incomeLPA || incomeLPA <= 0) {
        showBanner('Please enter your income in LPA (e.g. 7 for \u20b97,00,000).', 'err');
        return;
    }

    hide('proveOutput');
    show('proveLoader');
    el('proveBtn').disabled = true;
    const old = document.getElementById('proveSummary');
    if (old) old.remove();

    try {
        const res = await apiCall('/api/prove', { income, threshold, verifierId });
        hide('proveLoader');
        el('proveBtn').disabled = false;

        if (res.error) {
            renderOutput('proveOutput', '\u274c Error: ' + res.error, true);
            showBanner('Proof generation failed.', 'err');
        } else {
            renderProofSummary(res, thresholdLPA);
            renderOutput('proveOutput', res);
            el('proofInput').value = JSON.stringify(res, null, 2);
            showBanner(
                res.isValid
                    ? `\u2705 Income verified \u2265 ${thresholdLPA} LPA (${formatINR(thresholdLPA * RUPEES_PER_LPA)})`
                    : `\u26a0\ufe0f Income is below ${thresholdLPA} LPA`,
                res.isValid ? 'ok' : 'err'
            );
        }
    } catch (e) {
        hide('proveLoader');
        el('proveBtn').disabled = false;
        renderOutput('proveOutput', '\u274c Network error: ' + e.message, true);
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
            renderOutput('verifyOutput', '\u274c Error: ' + res.error, true);
            showBanner('Verification failed.', 'err');
        } else {
            // Annotate with \u20b9 info if we can extract threshold
            const threshUnits = proofData.threshold || (proofData.publicSignals && proofData.publicSignals[1]);
            if (threshUnits) {
                res._thresholdFormatted = formatLPA(threshUnits) + ' = ' + formatINR(unitsToRupees(threshUnits));
            }
            renderOutput('verifyOutput', res);
            showBanner(
                res.valid ? '\u2705 Proof is VALID' : '\u274c Proof is INVALID',
                res.valid ? 'ok' : 'err'
            );
        }
    } catch (e) {
        hide('verifyLoader');
        renderOutput('verifyOutput', '\u274c Network error: ' + e.message, true);
    }
}

// ── 3. PQ Info ────────────────────────────────────────────────────────────────

async function getPQInfo() {
    hide('pqOutput');
    try {
        const res = await apiCall('/api/pq');
        renderOutput('pqOutput', res);
    } catch (e) {
        renderOutput('pqOutput', '\u274c ' + e.message, true);
    }
}

// ── 4. System Status ──────────────────────────────────────────────────────────

async function getStatus() {
    hide('statusOutput');
    try {
        const res = await apiCall('/api/status');
        renderOutput('statusOutput', res);
    } catch (e) {
        renderOutput('statusOutput', '\u274c ' + e.message, true);
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
    // Set default LPA values and update INR badges
    el('incomeLPA').value    = '';
    el('thresholdLPA').value = '5';
    onLPAInput('threshold');   // show ₹5,00,000 badge on load
    getStatus();
});

