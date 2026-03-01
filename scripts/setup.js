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
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ARTIFACTS = path.join(__dirname, '../artifacts');
const CIRCUIT   = 'incomeProof';
const PTAU_URL  = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau';
const PTAU_PATH = path.join(ARTIFACTS, 'pot14_final.ptau');

// Ensure artifacts dir exists
if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`[✓] Already exists: ${path.basename(dest)} — skipping download`);
      return resolve();
    }
    console.log(`[*] Downloading ${path.basename(dest)} ...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('\n========== QS-PID TRUSTED SETUP ==========\n');

    // Step 1: Download ptau
    await downloadFile(PTAU_URL, PTAU_PATH);

    const r1csPath  = path.join(ARTIFACTS, `${CIRCUIT}.r1cs`);
    const zkey0     = path.join(ARTIFACTS, `${CIRCUIT}_0000.zkey`);
    const zkeyFinal = path.join(ARTIFACTS, `${CIRCUIT}_final.zkey`);
    const vkeyPath  = path.join(ARTIFACTS, `verification_key.json`);

    if (!fs.existsSync(r1csPath)) {
      throw new Error(`Circuit not compiled. Run: npm run compile\nExpected: ${r1csPath}`);
    }

    // Step 2: Phase 2 setup
    console.log('[*] Running phase 2 setup...');
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
    console.log('[✓] Verification key saved to artifacts/verification_key.json');

    // Cleanup intermediate zkey
    if (fs.existsSync(zkey0)) fs.unlinkSync(zkey0);

    console.log('\n[✓] Trusted setup complete!');
    console.log('    Next: npm run prove\n');
  } catch (err) {
    console.error('\n[✗] Setup failed:', err.message);
    process.exit(1);
  }
}

main();
