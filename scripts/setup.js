/**
 * setup.js — Trusted Setup for QS-PID Circuit
 *
 * Steps:
 *   1. Download Powers of Tau (phase 1) — hermez BN254 14
 *   2. Phase 2 setup specific to incomeProof circuit
 *   3. Contribute randomness
 *   4. Export final zkey and verification key
 *
 * Run: npm run setup
 * Prerequisites: npm run compile  (must exist: artifacts/incomeProof.r1cs)
 *
 * FIX (2026-03-01):
 *   - Old download cached a corrupted/incomplete file and skipped re-download
 *   - Now validates file size (must be > 50 MB) before trusting cached file
 *   - Auto-deletes corrupt cached file and re-downloads
 *   - Follows HTTP redirects (S3 URLs often redirect)
 *   - Better error messages with download size info
 */

const snarkjs = require('snarkjs');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');

const ARTIFACTS = path.join(__dirname, '../artifacts');
const CIRCUIT   = 'incomeProof';

// Primary: SnarkJS official GitHub releases (smaller, faster)
// Fallback: Hermez S3 bucket
const PTAU_SOURCES = [
    'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau',
    'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau',
];
const PTAU_PATH      = path.join(ARTIFACTS, 'pot14_final.ptau');
const PTAU_MIN_BYTES = 50 * 1024 * 1024;  // valid ptau14 is ~200 MB; reject if < 50 MB

if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

// ── Download with redirect support ───────────────────────────────────────────

function downloadWithRedirects(url, dest, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) return reject(new Error('Too many redirects'));

        const mod = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        let downloaded = 0;
        let lastLog    = 0;

        const req = mod.get(url, (res) => {
            // Follow redirects
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
                file.close();
                fs.unlink(dest, () => {});
                console.log(`[*] Redirecting to: ${res.headers.location}`);
                return downloadWithRedirects(res.headers.location, dest, redirectCount + 1)
                    .then(resolve).catch(reject);
            }

            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => {});
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }

            const total = parseInt(res.headers['content-length'] || '0');
            if (total) console.log(`[*] File size: ${(total / 1024 / 1024).toFixed(1)} MB`);

            res.on('data', (chunk) => {
                downloaded += chunk.length;
                const now = Date.now();
                if (now - lastLog > 3000) {
                    const mb = (downloaded / 1024 / 1024).toFixed(1);
                    const pct = total ? ` (${Math.round(downloaded/total*100)}%)` : '';
                    process.stdout.write(`\r[*] Downloaded: ${mb} MB${pct}  `);
                    lastLog = now;
                }
            });

            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`\n[✓] Download complete: ${(downloaded / 1024 / 1024).toFixed(1)} MB`);
                resolve();
            });
        });

        req.on('error', (err) => {
            file.close();
            fs.unlink(dest, () => {});
            reject(err);
        });

        file.on('error', (err) => {
            file.close();
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// ── Validate cached ptau file ───────────────────────────────────────────────

function isPtauValid(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const size = fs.statSync(filePath).size;
    if (size < PTAU_MIN_BYTES) {
        console.log(`[⚠] Cached ptau file is too small (${(size/1024/1024).toFixed(1)} MB < ${PTAU_MIN_BYTES/1024/1024} MB) — likely corrupt`);
        return false;
    }
    console.log(`[✓] Cached ptau file looks valid: ${(size/1024/1024).toFixed(1)} MB`);
    return true;
}

async function ensurePtau() {
    if (isPtauValid(PTAU_PATH)) return;  // Already valid, skip download

    // Delete corrupt/incomplete file if present
    if (fs.existsSync(PTAU_PATH)) {
        console.log('[*] Deleting corrupt cached file...');
        fs.unlinkSync(PTAU_PATH);
    }

    // Try each source URL
    let lastErr;
    for (const url of PTAU_SOURCES) {
        try {
            console.log(`[*] Downloading from: ${url}`);
            await downloadWithRedirects(url, PTAU_PATH);
            if (isPtauValid(PTAU_PATH)) return;  // Download succeeded and file is valid
            throw new Error('Downloaded file is too small — download may have been truncated');
        } catch (err) {
            console.log(`[⚠] Source failed: ${err.message}`);
            lastErr = err;
            if (fs.existsSync(PTAU_PATH)) fs.unlinkSync(PTAU_PATH);
        }
    }
    throw new Error(`All ptau download sources failed. Last error: ${lastErr.message}\n` +
        '\nManual download option:\n' +
        '  1. Open in browser: https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau\n' +
        '  2. Save the file to: artifacts/pot14_final.ptau\n' +
        '  3. Run: npm run setup\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    try {
        console.log('\n========== QS-PID TRUSTED SETUP ==========\n');

        // Step 1: Ensure ptau file is valid
        await ensurePtau();

        const r1csPath  = path.join(ARTIFACTS, `${CIRCUIT}.r1cs`);
        const zkey0     = path.join(ARTIFACTS, `${CIRCUIT}_0000.zkey`);
        const zkeyFinal = path.join(ARTIFACTS, `${CIRCUIT}_final.zkey`);
        const vkeyPath  = path.join(ARTIFACTS, 'verification_key.json');

        if (!fs.existsSync(r1csPath)) {
            throw new Error(`Circuit not compiled. Run: npm run compile\nExpected: ${r1csPath}`);
        }

        // Step 2: Phase 2 setup
        console.log('\n[*] Running phase 2 setup (this takes ~1-2 min)...');
        await snarkjs.zKey.newZKey(r1csPath, PTAU_PATH, zkey0);
        console.log('[✓] Initial zkey created');

        // Step 3: Contribute randomness
        console.log('[*] Contributing randomness...');
        await snarkjs.zKey.contribute(
            zkey0, zkeyFinal,
            'QS-PID First Contributor',
            'qs-pid-entropy-' + Date.now()
        );
        console.log('[✓] Contribution complete');

        // Step 4: Export verification key
        console.log('[*] Exporting verification key...');
        const vkey = await snarkjs.zKey.exportVerificationKey(zkeyFinal);
        fs.writeFileSync(vkeyPath, JSON.stringify(vkey, null, 2));
        console.log('[✓] Verification key saved → artifacts/verification_key.json');

        // Cleanup intermediate zkey
        if (fs.existsSync(zkey0)) fs.unlinkSync(zkey0);
        console.log('[✓] Cleaned up intermediate files');

        console.log('\n[✓] Trusted setup complete!');
        console.log('    Next step: npm run prove\n');

    } catch (err) {
        console.error('\n[✗] Setup failed:', err.message);
        process.exit(1);
    }
}

main();
