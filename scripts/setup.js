/**
 * setup.js — Trusted Setup for QS-PID Circuit
 *
 * Run: npm run setup
 * Requires: npm run compile  (artifacts/incomeProof.r1cs must exist)
 *
 * CORRECT FLOW (from official SnarkJS README):
 *   1. Download powersOfTau28_hez_final_14.ptau  (phase-1 file, ~18 MB)
 *   2. snarkjs.powersOfTau.preparePhase2()        (creates phase-2 ptau, ~18 MB)
 *   3. snarkjs.zKey.newZKey()                     (circuit-specific zkey)
 *   4. snarkjs.zKey.contribute()                  (add entropy)
 *   5. snarkjs.zKey.exportVerificationKey()       (export vkey JSON)
 *
 * WHY IT FAILED BEFORE:
 *   - pot14 file is ~18 MB. Previous code rejected it thinking it was corrupt
 *     because it set min-size to 50/100 MB. That was WRONG.
 *   - pot14 is correctly 18 MB. pot20 is ~1 GB. We only need pot14.
 *   - snarkjs.zKey.newZKey() requires a PHASE-2 PREPARED ptau file.
 *     The downloaded file is phase-1 only. preparePhase2 step was missing.
 *
 * Official ptau file table from iden3/snarkjs README:
 *   power 14 -> max 16k constraints -> ~18 MB
 *   Our circuit: 361 constraints. pot14 is more than enough.
 */

const snarkjs = require('snarkjs');
const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');

const ARTIFACTS   = path.join(__dirname, '../artifacts');
const CIRCUIT     = 'incomeProof';

// Phase-1 ptau downloaded from hermez (this is ~18 MB - that is CORRECT for pot14)
const PTAU1_PATH  = path.join(ARTIFACTS, 'pot14_phase1.ptau');
// Phase-2 prepared ptau (generated locally from phase-1)
const PTAU2_PATH  = path.join(ARTIFACTS, 'pot14_final.ptau');
// tmp file for safe download
const PTAU1_TMP   = PTAU1_PATH + '.tmp';

// pot14 phase-1 file is ~18 MB. Accept anything > 5 MB.
const PTAU1_MIN_BYTES = 5 * 1024 * 1024;

/**
 * Official download URLs from iden3/snarkjs README
 * These files are mirrored across multiple sources.
 */
const PTAU_URLS = [
    // Primary mirror (fast CDN)
    'https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau',
    // Secondary: hermez original
    'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau',
    // Tertiary: raw GitHub (small enough to serve)
    'https://raw.githubusercontent.com/iden3/snarkjs/master/test/css/powersOfTau28_hez_final_08.ptau',
];

if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

// ---- utils ------------------------------------------------------------------

function sizeMB(p) {
    if (!fs.existsSync(p)) return 0;
    return fs.statSync(p).size / 1024 / 1024;
}

function safeDelete(p) {
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
}

function isPhase1Valid(p) {
    const mb = sizeMB(p);
    if (mb < (PTAU1_MIN_BYTES / 1024 / 1024)) {
        if (mb > 0) console.log(`[!] ${path.basename(p)} is ${mb.toFixed(1)} MB — too small, re-downloading`);
        return false;
    }
    console.log(`[✓] ${path.basename(p)}: ${mb.toFixed(1)} MB — OK`);
    return true;
}

// ---- download with redirect follow ------------------------------------------

function downloadTo(url, dest, hops) {
    hops = hops || 0;
    return new Promise((resolve, reject) => {
        if (hops > 8) return reject(new Error('Too many redirects'));
        safeDelete(dest);
        const proto = url.startsWith('https') ? https : http;
        const out   = fs.createWriteStream(dest);
        let received = 0;
        let lastLog  = 0;

        const req = proto.get(url, { headers: { 'User-Agent': 'node/setup' } }, function(res) {
            if (res.statusCode === 301 || res.statusCode === 302 ||
                res.statusCode === 307 || res.statusCode === 308) {
                out.destroy();
                safeDelete(dest);
                const loc = res.headers.location;
                console.log('    redirect → ' + loc.substring(0, 80));
                return downloadTo(loc, dest, hops + 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                out.destroy(); safeDelete(dest);
                return reject(new Error('HTTP ' + res.statusCode + ' from ' + url));
            }
            const total = parseInt(res.headers['content-length'] || '0');
            if (total) process.stdout.write('    size: ' + (total/1024/1024).toFixed(1) + ' MB\n');

            res.on('data', function(chunk) {
                received += chunk.length;
                const now = Date.now();
                if (now - lastLog > 2000) {
                    const mb  = (received/1024/1024).toFixed(1);
                    const pct = total ? '  ' + Math.round(received/total*100) + '%' : '';
                    process.stdout.write('\r    ' + mb + ' MB' + pct + '        ');
                    lastLog = now;
                }
            });
            res.pipe(out);
            out.on('finish', function() {
                out.close();
                process.stdout.write('\n    done: ' + (received/1024/1024).toFixed(1) + ' MB\n');
                resolve();
            });
        });
        req.on('error', function(e) { out.destroy(); safeDelete(dest); reject(e); });
        out.on('error', function(e) { out.destroy(); safeDelete(dest); reject(e); });
    });
}

async function ensurePhase1Ptau() {
    if (isPhase1Valid(PTAU1_PATH)) return;   // already have it
    safeDelete(PTAU1_PATH);
    safeDelete(PTAU1_TMP);

    let lastErr;
    for (let i = 0; i < PTAU_URLS.length; i++) {
        const url = PTAU_URLS[i];
        console.log('[*] Downloading ptau (source ' + (i+1) + '): ' + url);
        try {
            await downloadTo(url, PTAU1_TMP);
            if (!isPhase1Valid(PTAU1_TMP)) {
                safeDelete(PTAU1_TMP);
                throw new Error('Downloaded file is too small');
            }
            safeDelete(PTAU1_PATH);
            fs.renameSync(PTAU1_TMP, PTAU1_PATH);
            console.log('[\u2713] Saved: ' + PTAU1_PATH);
            return;
        } catch (e) {
            console.log('[!] Source ' + (i+1) + ' failed: ' + e.message);
            safeDelete(PTAU1_TMP);
            lastErr = e;
        }
    }
    // All failed — print manual instructions
    throw new Error(
        'All download sources failed: ' + lastErr.message + '\n\n' +
        'MANUAL DOWNLOAD:\n' +
        '  1. Open in browser:\n' +
        '     https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau\n' +
        '  2. Save the file (~18 MB) to:\n' +
        '     ' + PTAU1_PATH + '\n' +
        '  3. Run: npm run setup'
    );
}

// ---- main -------------------------------------------------------------------

async function main() {
    try {
        console.log('\n========== QS-PID TRUSTED SETUP ==========\n');

        // Step 1: Get phase-1 ptau file
        await ensurePhase1Ptau();

        // Step 2: Prepare phase-2 ptau (REQUIRED before zKey.newZKey)
        // This is the step that was MISSING in all previous versions.
        // snarkjs.zKey.newZKey needs a phase-2 prepared file.
        console.log('\n[*] Preparing phase-2 ptau (this takes ~20-40 sec)...');
        await snarkjs.powersOfTau.preparePhase2(PTAU1_PATH, PTAU2_PATH);
        console.log('[\u2713] Phase-2 ptau ready');

        const r1cs      = path.join(ARTIFACTS, CIRCUIT + '.r1cs');
        const zkey0     = path.join(ARTIFACTS, CIRCUIT + '_0000.zkey');
        const zkeyFinal = path.join(ARTIFACTS, CIRCUIT + '_final.zkey');
        const vkeyPath  = path.join(ARTIFACTS, 'verification_key.json');

        if (!fs.existsSync(r1cs)) {
            throw new Error('Circuit not compiled. Run: npm run compile\nExpected: ' + r1cs);
        }

        // Clean stale keys from previous failed runs
        safeDelete(zkey0);
        safeDelete(zkeyFinal);
        safeDelete(vkeyPath);

        // Step 3: Circuit-specific phase-2 setup
        console.log('[*] Groth16 phase-2 setup...');
        await snarkjs.zKey.newZKey(r1cs, PTAU2_PATH, zkey0);
        console.log('[\u2713] Initial zkey created');

        // Step 4: Contribute randomness
        console.log('[*] Contributing randomness...');
        await snarkjs.zKey.contribute(
            zkey0, zkeyFinal,
            'QS-PID Contributor',
            'qs-pid-entropy-' + Date.now()
        );
        console.log('[\u2713] Contribution done');

        // Step 5: Export verification key
        console.log('[*] Exporting verification key...');
        const vkey = await snarkjs.zKey.exportVerificationKey(zkeyFinal);
        fs.writeFileSync(vkeyPath, JSON.stringify(vkey, null, 2));
        console.log('[\u2713] verification_key.json saved');

        // Cleanup intermediate files
        safeDelete(zkey0);

        console.log('\n[\u2713] Trusted setup complete!');
        console.log('    Next: npm run prove\n');
        process.exit(0);

    } catch (err) {
        console.error('\n[\u2717] Setup failed: ' + err.message);
        process.exit(1);
    }
}

main();
