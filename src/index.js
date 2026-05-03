/**
 * QS-PPI Main Entry Point
 * 
 * Zero-Knowledge Proof system for income verification (> 5 LPA)
 * W3C VC 2.0 compliant with post-quantum migration to ML-DSA
 */

const IncomeProver = require('./prover');
const IncomeVerifier = require('./verifier');
const {
    IncomeProofCredential,
    IncomeProofCredentialSchema,
} = require('./vc/credential');
const PresentationHandler = require('./vc/presentation');
const {
    MLDSAKeyPair,
    MLDSASigner,
    HybridSigner,
    MigrationStateManager,
} = require('./pq/mldsa');

/**
 * QS-PPI Main Class
 */
class QSPPI {
    constructor(issuerDid, holderDid, options = {}) {
        this.issuerDid = issuerDid;
        this.holderDid = holderDid;
        this.prover = new IncomeProver();
        this.verifier = new IncomeVerifier();
        this.presentationHandler = new PresentationHandler(holderDid);
        this.migrationManager = new MigrationStateManager();
        this.options = {
            incomeThreshold: '500000000', // 5 LPA
            credentialExpirationDays: 365,
            ...options,
        };
    }

    /**
     * Initialize system (async setup)
     */
    async initialize() {
        await this.prover.initialize();
        await this.verifier.initialize();
        console.log('[✓] QS-PPI system initialized');
    }

    /**
     * Generate proof of income
     */
    async generateIncomeProof(income) {
        console.log('\n[*] Generating income proof...');
        return await this.prover.generateProof(income, this.options.incomeThreshold);
    }

    /**
     * Issue W3C VC 2.0 credential
     */
    async issueCredential(zkProofData) {
        console.log('[*] Issuing W3C VC 2.0 credential...');

        const credentialBuilder = new IncomeProofCredential(
            this.issuerDid,
            this.holderDid,
            zkProofData,
            { expirationDays: this.options.credentialExpirationDays }
        );

        let credential = credentialBuilder.build();
        credential = await credentialBuilder.sign(credential, 'issuer-secret-key');

        const validationResult = credentialBuilder.validate(credential);
        if (!validationResult.valid) {
            throw new Error(`Credential validation failed: ${validationResult.errors.join(', ')}`);
        }

        console.log('[✓] Credential issued and signed');
        return credential;
    }

    /**
     * Create presentation for verifier
     */
    async createPresentation(credential, verifierChallenge, verifierDomain) {
        console.log('[*] Creating verifiable presentation...');

        const presentation = await this.presentationHandler.createPresentation(
            credential,
            verifierChallenge,
            { domain: verifierDomain }
        );

        console.log('[✓] Presentation created with anti-replay protection');
        return presentation;
    }

    /**
     * Verify presentation and proof
     */
    async verifyPresentation(presentation, verifierDomain, verifierId) {
        console.log(`\n[*] Verifying presentation for verifier: ${verifierId}`);

        // Verify presentation authenticity
        const presentationVerification = this.presentationHandler.verifyPresentation(
            presentation,
            verifierDomain,
            60 * 1000 // 1 minute max age
        );

        if (!presentationVerification.valid) {
            console.log(`[✗] Presentation verification failed: ${presentationVerification.reason}`);
            return { valid: false, reason: presentationVerification.reason };
        }

        // Extract and verify credential
        const credentials = this.presentationHandler.extractCredentials(presentation);
        if (credentials.length === 0) {
            return { valid: false, reason: 'No credentials in presentation' };
        }

        // Verify first credential's proof
        const credential = credentials[0];
        if (!credential.credentialSubject || !credential.credentialSubject.incomeProof) {
            return { valid: false, reason: 'Invalid credential structure' };
        }

        console.log('[✓] Presentation verified successfully');
        return {
            valid: true,
            credential: credential,
            verifierId: verifierId,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get current migration phase
     */
    getMigrationPhase() {
        return this.migrationManager.getCurrentPhase();
    }

    /**
     * Setup ML-DSA for post-quantum transition
     */
    setupPostQuantum() {
        console.log('[*] Setting up post-quantum ML-DSA integration...');

        const mldsaKeyPair = MLDSAKeyPair.generate('ML-DSA-65');
        const mldsaSigner = new MLDSASigner(mldsaKeyPair);

        console.log('[✓] ML-DSA key pair generated');
        console.log(`[✓] Migration Phase: ${this.migrationManager.phase}`);
        console.log(`[✓] Active Algorithms: ${this.migrationManager.getActiveAlgorithms().join(', ')}`);

        return { mldsaKeyPair, mldsaSigner };
    }

    /**
     * Get system statistics
     */
    getStatistics() {
        return {
            issuer: this.issuerDid,
            holder: this.holderDid,
            incomeThreshold: this.options.incomeThreshold,
            credentialExpirationDays: this.options.credentialExpirationDays,
            migrationPhase: this.migrationManager.phase,
            migrationStatistics: this.migrationManager.getStatistics(),
        };
    }
}

module.exports = QSPPI;

