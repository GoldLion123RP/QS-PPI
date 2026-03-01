/**
 * W3C VC 2.0 Presentation Handler
 * 
 * Creates and manages verifiable presentations for income proof credentials
 * Implements anti-replay and multi-verifier unlinkability mechanisms
 * 
 * SECURITY: Includes W3C Status List 2021 revocation checking
 * to ensure presented credentials have not been revoked
 */

const crypto = require('crypto');
const { W3C_VC_CONTEXT, StatusList2021Revocation } = require('./credential');

class PresentationHandler {
    constructor(credentialHolder, revocationVerifier = null) {
        this.credentialHolder = credentialHolder;
        this.presentationLog = new Map(); // Track presented proofs
        this.revocationVerifier = revocationVerifier || new StatusList2021Revocation();
    }

    /**
     * Create a verifiable presentation
     * Includes challenge/nonce for anti-replay protection
     */
    async createPresentation(credentials, verifierChallenge, options = {}) {
        const {
            holderDid = this.credentialHolder,
            domain = 'verifier.example.com',
            includeNonce = true,
        } = options;

        // Validate credentials
        if (!Array.isArray(credentials)) {
            credentials = [credentials];
        }

        // Generate unique nonce for this presentation
        const nonce = includeNonce ? crypto.randomBytes(16).toString('hex') : undefined;

        // Create presentation object
        const presentation = {
            '@context': W3C_VC_CONTEXT,
            type: 'VerifiablePresentation',
            verifiableCredential: credentials,
            holder: holderDid,
            proof: {
                type: 'EcdsaSecp256k1Signature2019',
                created: new Date().toISOString(),
                challenge: verifierChallenge,
                domain: domain,
                nonce: nonce,
                proofPurpose: 'authentication',
                verificationMethod: `${holderDid}#key-1`,
            },
        };

        // Add signature
        const signatureValue = this.signPresentation(presentation, domain);
        presentation.proof.signatureValue = signatureValue;

        // Log presentation for replay detection
        if (nonce) {
            this.presentationLog.set(nonce, {
                timestamp: new Date().getTime(),
                challenge: verifierChallenge,
                domain: domain,
            });
        }

        return presentation;
    }

    /**
     * Sign presentation (create proof signature)
     */
    signPresentation(presentation, domain) {
        // In production, use actual ECDSA signing
        const dataToSign = JSON.stringify({
            challenge: presentation.proof.challenge,
            domain: presentation.proof.domain,
            nonce: presentation.proof.nonce,
            holder: presentation.holder,
            created: presentation.proof.created,
        });

        return crypto
            .createHmac('sha256', domain)
            .update(dataToSign)
            .digest('hex');
    }

    /**
     * Verify presentation authenticity
     */
    verifyPresentation(presentation, domain, maxAge = 5 * 60 * 1000) {
        // Check structure
        if (!presentation.proof || !presentation.proof.signatureValue) {
            return { valid: false, reason: 'Missing proof signature' };
        }

        // Verify domain
        if (presentation.proof.domain !== domain) {
            return { valid: false, reason: 'Domain mismatch' };
        }

        // Check timestamp
        const createdTime = new Date(presentation.proof.created).getTime();
        const currentTime = new Date().getTime();
        const age = currentTime - createdTime;

        if (age > maxAge) {
            return { valid: false, reason: 'Presentation expired' };
        }

        // Verify signature
        const expectedSignature = this.signPresentation(presentation, domain);
        if (presentation.proof.signatureValue !== expectedSignature) {
            return { valid: false, reason: 'Invalid signature' };
        }

        // Check nonce for replay protection
        if (presentation.proof.nonce) {
            if (this.presentationLog.has(presentation.proof.nonce)) {
                return { valid: false, reason: 'Nonce already used (replay attack)' };
            }
        }

        return { valid: true };
    }

    /**
     * Verify presentation with revocation status check
     * SECURITY: Validates all credentials in presentation are not revoked
     * 
     * @param {Object} presentation - Presentation to verify
     * @param {string} domain - Verifier domain
     * @param {Object} options - Verification options
     * @returns {Object} Verification result with revocation status
     */
    async verifyPresentationWithRevocation(presentation, domain, options = {}) {
        const {
            maxAge = 5 * 60 * 1000,
            checkRevocation = true,
            requireRevocationVerification = false,
        } = options;

        // First, verify presentation structure and proof
        const presentationVerification = this.verifyPresentation(presentation, domain, maxAge);
        if (!presentationVerification.valid) {
            return {
                valid: false,
                reason: presentationVerification.reason,
                revocationChecked: false,
            };
        }

        // Then, verify each credential's revocation status
        if (checkRevocation) {
            const credentials = this.extractCredentials(presentation);
            const revocationResults = await this.revocationVerifier.batchCheck(
                credentials,
                {
                    useCache: true,
                    checkSmartContract: true,
                    checkOffChain: true,
                }
            );

            // Check if any credential is revoked
            const revokedCredentials = revocationResults.filter(r => r.revoked === true);
            if (revokedCredentials.length > 0) {
                return {
                    valid: false,
                    reason: `${revokedCredentials.length} credential(s) are revoked`,
                    revocationStatus: revokedCredentials,
                    revocationChecked: true,
                };
            }

            // Check revocation verification if required
            if (requireRevocationVerification) {
                const unverifiedRevocation = revocationResults.filter(r => r.verified === false);
                if (unverifiedRevocation.length > 0) {
                    return {
                        valid: false,
                        reason: `Revocation status could not be verified for ${unverifiedRevocation.length} credential(s)`,
                        revocationStatus: unverifiedRevocation,
                        revocationChecked: true,
                    };
                }
            }

            return {
                valid: true,
                revocationStatus: revocationResults,
                revocationChecked: true,
                timestamp: new Date().toISOString(),
            };
        }

        return {
            valid: true,
            revocationChecked: false,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Extract credentials from presentation
     */
    extractCredentials(presentation) {
        if (!presentation.verifiableCredential) {
            return [];
        }

        if (Array.isArray(presentation.verifiableCredential)) {
            return presentation.verifiableCredential;
        }

        return [presentation.verifiableCredential];
    }

    /**
     * Check unlinkability across presentations
     * Returns similarity metrics to verify they use different blinding factors
     */
    checkUnlinkability(presentation1, presentation2) {
        const creds1 = this.extractCredentials(presentation1);
        const creds2 = this.extractCredentials(presentation2);

        if (creds1.length === 0 || creds2.length === 0) {
            return { unlinkable: true, reason: 'Empty credentials' };
        }

        // Compare proofs from same subject across presentations
        const similarities = [];

        for (const cred1 of creds1) {
            for (const cred2 of creds2) {
                // Check if same subject
                if (
                    cred1.credentialSubject.id === cred2.credentialSubject.id
                ) {
                    // Compare income proof values
                    const proof1 = cred1.credentialSubject.incomeProof.proofValue;
                    const proof2 = cred2.credentialSubject.incomeProof.proofValue;

                    // If proofs are identical, they're linkable
                    if (proof1 === proof2) {
                        return { unlinkable: false, reason: 'Identical proofs detected' };
                    }

                    // Calculate similarity
                    const similarity = this.calculateSimilarity(proof1, proof2);
                    similarities.push(similarity);
                }
            }
        }

        // Proofs should be completely different due to blinding factors
        const avgSimilarity = similarities.length > 0
            ? similarities.reduce((a, b) => a + b, 0) / similarities.length
            : 0;

        return {
            unlinkable: avgSimilarity < 0.05, // Less than 5% similar
            similarity: avgSimilarity,
            reason:
                avgSimilarity < 0.05
                    ? 'Proofs use different blinding factors (unlinkable)'
                    : 'WARNING: High similarity detected (potentially linkable)',
        };
    }

    /**
     * Calculate Jaccard similarity between two strings
     */
    calculateSimilarity(str1, str2) {
        const set1 = new Set(str1);
        const set2 = new Set(str2);

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    /**
     * Cleanup old presentation logs (prevent memory leak)
     */
    cleanupOldLogs(maxAge = 60 * 60 * 1000) {
        const currentTime = new Date().getTime();

        for (const [nonce, data] of this.presentationLog.entries()) {
            if (currentTime - data.timestamp > maxAge) {
                this.presentationLog.delete(nonce);
            }
        }
    }
}

module.exports = PresentationHandler;
