/**
 * setup.js — Trusted Setup for QS-PID Circuit
 *
 * Run: npm run setup
 * Requires: npm run compile  (artifacts/incomeProof.r1cs must exist)
 *
 * ptau file: powersOfTau28_hez_final_14.ptau
 *   Real size: ~220 MB  |  constraints covered: up to 2^14 = 16384
 *   Our circuit has 361 constraints — fits well within pot14
 *
 * FIX v4 (2026-03-01):
 *   - Google GCS only has 18 MB for that filename — wrong file
 *   - Use Hermez S3 URL which has the real 220 MB file
 *   - Download to .tmp file first, rename on success (avoids EPERM
 *     from locked file handle on Windows when retrying)
 *   - Min size check lowered to 10 MB so bad downloads still rejected
 *     but we don't false-positive on legit small ptau sizes
 *   - Actually: pot14 is ~220 MB. Min check = 100 MB.
 */

const snarkjs = require('snarkjs');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');

const ARTIFACTS    = path.join(__dirname, '../artifacts');
const CIRCUIT      = 'incomeProof';
const PTAU_PATH    = path.join(ARTIFACTS, 'pot14_final.ptau');
const PTAU_TMP     = PTAU_PATH + '.tmp';
const PTAU_MIN_MB  = 100;   // real pot14 is ~220 MB

/**
 * All known working URLs for powersOfTau28_hez_final_14.ptau
 * Tested sources in order of preference:
 */
const PTAU_URLS = [
    // Hermez official S3 (original source, ~220 MB)
    'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau',
    // SnarkJS GitHub release assets mirror
    'https://github.com/iden3/snarkjs/releases/download/v0.1.20/powersOfTau28_hez_final_14.ptau',
];

if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

// ---- helpers ----------------------------------------------------------------

function sizeMB(p) {
    return fs.existsSync(p) ? (fs.statSync(p).size / 1024 / 1024).toFixed(1) : '0';
}

function isValid(p) {
    if (!fs.existsSync(p)) return false;
    const mb = parseFloat(sizeMB(p));
    if (mb < PTAU_MIN_MB) {
        console.log(`[!] ${path.basename(p)} is only ${mb} MB (need > ${PTAU_MIN_MB} MB) — rejecting`);
        return false;
    }
    console.log(`[✓] ${path.basename(p)} looks valid: ${mb} MB`);
    return true;
}

function safeDelete(p) {
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
}

// ---- download ---------------------------------------------------------------

function downloadTo(url, dest, hops = 0) {
    return new Promise((resolve, reject) => {
        if (hops > 6) return reject(new Error('Too many redirects'));

        safeDelete(dest);   // remove any previous partial download first

        const proto = url.startsWith('https') ? https : http;
        const out   = fs.createWriteStream(dest);
        let received = 0, lastPrint = 0;

        const req = proto.get(url, { headers: { 'User-Agent': 'node-https' } }, (res) => {
            // follow redirects
            if ([301, 302, 307, 308].includes(res.statusCode)) {
                out.destroy(); safeDelete(dest);
                console.log(`    → redirect ${res.statusCode} → ${res.headers.location}`);
                return downloadTo(res.headers.location, dest, hops + 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                out.destroy(); safeDelete(dest);
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            const total = parseInt(res.headers['content-length'] || '0');
            if (total) process.stdout.write(`    size: ${(total/1024/1024).toFixed(0)} MB\n`);

            res.on('data', chunk => {
                received += chunk.length;
                const now = Date.now();
                if (now - lastPrint > 2000) {
                    const mb  = (received / 1024 / 1024).toFixed(0);
                    const pct = total ? ` / ${(total/1024/1024).toFixed(0)} MB  ${Math.round(received/total*100)}%` : ' MB';
                    process.stdout.write(`\r    downloaded: ${mb}${pct}    `);
                    lastPrint = now;
                }
            });

            res.pipe(out);
            out.on('finish', () => {
                out.close();
                process.stdout.write(`\n    done: ${(received/1024/1024).toFixed(1)} MB\n`);
                resolve();
            });
        });

        req.on('error', err => { out.destroy(); safeDelete(dest); reject(err); });
        out.on('error', err => { out.destroy(); safeDelete(dest); reject(err); });
    });
}

async function ensurePtau() {
    // Already have a valid file?
    if (isValid(PTAU_PATH)) return;

    safeDelete(PTAU_PATH);
    safeDelete(PTAU_TMP);

    let lastErr;
    for (const url of PTAU_URLS) {
        console.log(`[*] Trying: ${url}`);
        try {
            await downloadTo(url, PTAU_TMP);   // download to .tmp first

            if (!isValid(PTAU_TMP)) {
                safeDelete(PTAU_TMP);
                throw new Error(`Downloaded file too small (${sizeMB(PTAU_TMP)} MB)`);
            }

            // Atomic rename: .tmp -> final
            safeDelete(PTAU_PATH);
            fs.renameSync(PTAU_TMP, PTAU_PATH);
            console.log(`[✓] Saved: ${PTAU_PATH}`);
            return;

        } catch (e) {
            console.log(`[!] Failed: ${e.message}`);
            safeDelete(PTAU_TMP);
            lastErr = e;
        }
    }

    // All URLs failed — give manual instructions
    console.error(
        `\n[✗] Could not download ptau file automatically.` +
        `\n\nManual steps:` +
        `\n  1. Open this URL in your browser:` +
        `\n     https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau` +
        `\n  2. Save the downloaded file (~220 MB) to:` +
        `\n     ${PTAU_PATH}` +
        `\n  3. Run: npm run setup` +
        `\n\nAlternate URL (if above fails):` +
        `\n  https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau`
    );
    throw new Error('ptau download failed: ' + lastErr.message);
}

// ---- main -------------------------------------------------------------------

async function main() {
    try {
        console.log('\n========== QS-PID TRUSTED SETUP ==========\n');

        await ensurePtau();

        const r1cs      = path.join(ARTIFACTS, `${CIRCUIT}.r1cs`);
        const zkey0     = path.join(ARTIFACTS, `${CIRCUIT}_0000.zkey`);
        const zkeyFinal = path.join(ARTIFACTS, `${CIRCUIT}_final.zkey`);
        const vkeyPath  = path.join(ARTIFACTS, 'verification_key.json');

        if (!fs.existsSync(r1cs)) {
            throw new Error(
                `Circuit not compiled. Run: npm run compile\nExpected: ${r1cs}`
            );
        }

        // Clean stale keys
        safeDelete(zkey0);
        safeDelete(zkeyFinal);
        safeDelete(vkeyPath);

        console.log('\n[*] Phase 2 setup (~30-60 sec)...');
        await snarkjs.zKey.newZKey(r1cs, PTAU_PATH, zkey0);
        console.log('[✓] Initial zkey created');

        console.log('[*] Contributing randomness...');
        await snarkjs.zKey.contribute(
            zkey0, zkeyFinal,
            'QS-PID Contributor',
            'qs-pid-entropy-' + Date.now()
        );
        console.log('[✓] Contribution done');

        console.log('[*] Exporting verification key...');
        const vkey = await snarkjs.zKey.exportVerificationKey(zkeyFinal);
        fs.writeFileSync(vkeyPath, JSON.stringify(vkey, null, 2));
        console.log('[✓] verification_key.json saved');

        safeDelete(zkey0);

        console.log('\n[✓] Setup complete! Run: npm run prove\n');

    } catch (err) {
        console.error('\n[✗] Setup failed:', err.message);
        process.exit(1);
    }
}

main();
