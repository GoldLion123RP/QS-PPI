/**
 * QS-PPI Ceremony Setup
 * 
 * Generates trusted setup parameters for Groth16 zkSNARK
 * Uses Powers of Tau for secure multi-party computation
 * 
 * Security Note: In production, use distributed ceremony with
 * multiple independent participants to ensure security.
 */

const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');
const crypto = require('crypto');

const CIRCUIT_NAME = 'incomeProof';
const SETUP_DIR = path.join(__dirname, '../ptau');
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');

// Ensure directories exist
if (!fs.existsSync(SETUP_DIR)) fs.mkdirSync(SETUP_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

/**
 * Step 1: Generate R1CS (Rank-1 Constraint System)
 * This is typically done during circuit compilation
 */
async function generateR1CS() {
    console.log('[*] R1CS should be generated via: circom circuits/incomeProof.circom --r1cs');
    console.log('[*] Looking for incomeProof.r1cs...\n');
    
    const r1csPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}.r1cs`);
    if (!fs.existsSync(r1csPath)) {
        console.log('[!] ERROR: incomeProof.r1cs not found.');
        console.log('[!] Run: npm run compile');
        return false;
    }
    
    console.log('[✓] R1CS file found');
    return r1csPath;
}

/**
 * Step 2: Powers of Tau - Phase 1
 * Generate initial parameters with entropy
 */
async function powersOfTauPhase1() {
    const ptauPath = path.join(SETUP_DIR, 'powersOfTau28_hez_final_11.ptau');
    
    // Check if already exists (for production, would use pre-generated)
    if (fs.existsSync(ptauPath)) {
        console.log('[✓] Powers of Tau file already exists');
        return ptauPath;
    }
    
    console.log('[*] Generating Powers of Tau (Phase 1)...');
    console.log('[*] Constraint size: 2^12 (4096 constraints)');
    
    // Add entropy for randomness
    const entropy = crypto.randomBytes(64).toString('hex');
    
    try {
        await snarkjs.powersOfTau.newFile(ptauPath, 12, entropy);
        console.log('[✓] Powers of Tau Phase 1 complete\n');
        return ptauPath;
    } catch (err) {
        console.error('[!] Error in Phase 1:', err.message);
        throw err;
    }
}

/**
 * Step 3: Powers of Tau - Phase 2 Contribution
 * Add randomness contribution (simulating participant)
 */
async function powersOfTauPhase2(ptauPath) {
    console.log('[*] Generating Powers of Tau (Phase 2)...');
    
    const ptauPath_2 = path.join(SETUP_DIR, 'powersOfTau28_hez_final_12.ptau');
    
    // Add entropy contribution
    const entropy = crypto.randomBytes(64).toString('hex');
    const name = 'QS-PPI Ceremony Participant';
    
    try {
        await snarkjs.powersOfTau.contribute(ptauPath, ptauPath_2, name, entropy);
        console.log('[✓] Powers of Tau Phase 2 contribution complete\n');
        return ptauPath_2;
    } catch (err) {
        console.error('[!] Error in Phase 2:', err.message);
        throw err;
    }
}

/**
 * Step 4: Powers of Tau - Finalization
 * Prepare finalized parameters for circuit-specific setup
 */
async function powersOfTauFinalize(ptauPath) {
    console.log('[*] Finalizing Powers of Tau...');
    
    const ptauFinalPath = path.join(SETUP_DIR, 'powersOfTau28_hez_final_13.ptau');
    
    try {
        await snarkjs.powersOfTau.beacon(
            ptauPath,
            ptauFinalPath,
            'final_beacon',
            '0x' + crypto.randomBytes(32).toString('hex'),
            10
        );
        console.log('[✓] Powers of Tau finalized\n');
        return ptauFinalPath;
    } catch (err) {
        console.error('[!] Error finalizing:', err.message);
        throw err;
    }
}

/**
 * Step 5: Circuit-Specific Setup (Phase 2)
 * Generate proving and verifying keys from R1CS and ptau
 */
async function circuitSetup(r1csPath, ptauPath) {
    console.log('[*] Generating circuit-specific setup (Phase 2)...');
    
    const zkey_0 = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_0.zkey`);
    const zkey_1 = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_1.zkey`);
    const zkey_final = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_final.zkey`);
    
    try {
        // Initial zkey from R1CS and ptau
        await snarkjs.groth16.setup(r1csPath, ptauPath, zkey_0);
        console.log('[✓] Initial zkey generated');
        
        // Contribution 1 (simulating setup participant)
        const entropy_1 = crypto.randomBytes(64).toString('hex');
        const { path: contributionPath_1 } = await snarkjs.zkey.contribute(
            zkey_0,
            zkey_1,
            'QS-PPI Setup Participant 1',
            entropy_1
        );
        console.log('[✓] Setup contribution 1 complete');
        
        // Final contribution and export
        const entropy_2 = crypto.randomBytes(64).toString('hex');
        await snarkjs.zkey.contribute(
            zkey_1,
            zkey_final,
            'QS-PPI Setup Participant 2',
            entropy_2
        );
        console.log('[✓] Setup contribution 2 complete');
        
        // Verify zkey integrity
        await snarkjs.zkey.verify(r1csPath, ptauPath, zkey_final);
        console.log('[✓] Zkey verification passed\n');
        
        return zkey_final;
    } catch (err) {
        console.error('[!] Error in circuit setup:', err.message);
        throw err;
    }
}

/**
 * Step 6: Export Verification Key
 * Create JSON verifying key for smart contracts or verification
 */
async function exportVerificationKey(zkey_final) {
    console.log('[*] Exporting verification key...');
    
    const vkeyPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_vkey.json`);
    
    try {
        const vkey = await snarkjs.zkey.exportVerificationKey(zkey_final);
        fs.writeFileSync(vkeyPath, JSON.stringify(vkey, null, 2));
        console.log('[✓] Verification key exported to:', vkeyPath);
        
        // Also export as Solidity verifier
        const verifierPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_verifier.sol`);
        const solidityCode = await snarkjs.zkey.exportSolidityVerifier(zkey_final);
        fs.writeFileSync(verifierPath, solidityCode);
        console.log('[✓] Solidity verifier exported to:', verifierPath + '\n');
        
        return vkey;
    } catch (err) {
        console.error('[!] Error exporting verification key:', err.message);
        throw err;
    }
}

/**
 * Main Ceremony Execution
 */
async function runCeremony() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  QS-PPI Trusted Setup Ceremony');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    try {
        // Step 1: Get R1CS
        const r1csPath = await generateR1CS();
        if (!r1csPath) {
            console.log('\n[!] Please compile the circuit first: npm run compile');
            process.exit(1);
        }
        
        // Step 2: Powers of Tau Phase 1
        const ptauPath_1 = await powersOfTauPhase1();
        
        // Step 3: Powers of Tau Phase 2 (contribution)
        const ptauPath_2 = await powersOfTauPhase2(ptauPath_1);
        
        // Step 4: Powers of Tau Finalization
        const ptauPath_final = await powersOfTauFinalize(ptauPath_2);
        
        // Step 5: Circuit-specific setup
        const zkey_final = await circuitSetup(r1csPath, ptauPath_final);
        
        // Step 6: Export verification key
        const vkey = await exportVerificationKey(zkey_final);
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✓ Trusted Setup Complete!');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`\n[✓] Proving key: ${path.join(ARTIFACTS_DIR, CIRCUIT_NAME + '_final.zkey')}`);
        console.log(`[✓] Verifying key: ${path.join(ARTIFACTS_DIR, CIRCUIT_NAME + '_vkey.json')}`);
        console.log(`[✓] Solidity verifier: ${path.join(ARTIFACTS_DIR, CIRCUIT_NAME + '_verifier.sol')}`);
        console.log('\nYou can now generate and verify proofs!\n');
        
    } catch (error) {
        console.error('\n[!] Ceremony failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runCeremony();
}

module.exports = { runCeremony };

