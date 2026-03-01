/**
 * W3C VC 2.0 Presentation Handler
 *
 * Creates and manages verifiable presentations for income proof credentials.
 * Implements anti-replay and multi-verifier unlinkability mechanisms.
 *
 * BUG FIXED (presentation.js):
 *   createPresentation() was writing the nonce to presentationLog at CREATION
 *   time.  verifyPresentation() then found the nonce already in the log and
 *   rejected the first legitimate verification as a replay attack.
 *
 *   Fix: presentationLog is now written only inside verifyPresentation(), AFTER
 *   all checks pass.  The log records consumed nonces, not created ones.
 */

const crypto = require('crypto');
const { W3C_VC_CONTEXT, StatusList2021Revocation } = require('./credential');

class PresentationHandler {
    constructor(credentialHolder, revocationVerifier = null) {
        this.credentialHolder    = credentialHolder;
        this.presentationLog     = new Map(); // nonce → verified-at timestamp
        this.revocationVerifier  = revocationVerifier || new StatusList2021Revocation();
    }

    /**
     * Create a verifiable presentation.
     * Generates a fresh nonce for anti-replay; does NOT write to presentationLog
     * here — the log is only written after the verifier accepts the presentation.
     */
    async createPresentation(credentials, verifierChallenge, options = {}) {
        const {
            holderDid    = this.credentialHolder,
            domain       = 'verifier.example.com',
            includeNonce = true,
        } = options;

        if (!Array.isArray(credentials)) credentials = [credentials];

        const nonce = includeNonce ? crypto.randomBytes(16).toString('hex') : undefined;

        const presentation = {
            '@context': W3C_VC_CONTEXT,
            type:       'VerifiablePresentation',
            verifiableCredential: credentials,
            holder:     holderDid,
            proof: {
                type:               'EcdsaSecp256k1Signature2019',
                created:            new Date().toISOString(),
                challenge:          verifierChallenge,
                domain:             domain,
                nonce:              nonce,
                proofPurpose:       'authentication',
                verificationMethod: `${holderDid}#key-1`,
            },
        };

        presentation.proof.signatureValue = this.signPresentation(presentation, domain);

        // NOTE: presentationLog is intentionally NOT written here.
        // The nonce is only marked as consumed inside verifyPresentation().

        return presentation;
    }

    /**
     * Sign presentation (HMAC of canonical fields).
     */
    signPresentation(presentation, domain) {
        const dataToSign = JSON.stringify({
            challenge: presentation.proof.challenge,
            domain:    presentation.proof.domain,
            nonce:     presentation.proof.nonce,
            holder:    presentation.holder,
            created:   presentation.proof.created,
        });
        return crypto.createHmac('sha256', domain).update(dataToSign).digest('hex');
    }

    /**
     * Verify presentation authenticity.
     * On success the nonce is recorded in presentationLog so that a second
     * submission of the same presentation is correctly rejected as a replay.
     */
    verifyPresentation(presentation, domain, maxAge = 5 * 60 * 1000) {
        if (!presentation.proof || !presentation.proof.signatureValue) {
            return { valid: false, reason: 'Missing proof signature' };
        }

        if (presentation.proof.domain !== domain) {
            return { valid: false, reason: 'Domain mismatch' };
        }

        const createdTime = new Date(presentation.proof.created).getTime();
        const age         = Date.now() - createdTime;
        if (age > maxAge) {
            return { valid: false, reason: 'Presentation expired' };
        }

        const expectedSignature = this.signPresentation(presentation, domain);
        if (presentation.proof.signatureValue !== expectedSignature) {
            return { valid: false, reason: 'Invalid signature' };
        }

        // Replay check: reject if this nonce was already successfully verified.
        if (presentation.proof.nonce) {
            if (this.presentationLog.has(presentation.proof.nonce)) {
                return { valid: false, reason: 'Nonce already used (replay attack)' };
            }
            // Mark nonce as consumed NOW — after all checks pass.
            this.presentationLog.set(presentation.proof.nonce, {
                timestamp: Date.now(),
                challenge: presentation.proof.challenge,
                domain:    domain,
            });
        }

        return { valid: true };
    }

    /**
     * Verify presentation with W3C Status List 2021 revocation check.
     */
    async verifyPresentationWithRevocation(presentation, domain, options = {}) {
        const {
            maxAge                       = 5 * 60 * 1000,
            checkRevocation              = true,
            requireRevocationVerification = false,
        } = options;

        const presentationVerification = this.verifyPresentation(presentation, domain, maxAge);
        if (!presentationVerification.valid) {
            return { valid: false, reason: presentationVerification.reason, revocationChecked: false };
        }

        if (checkRevocation) {
            const credentials       = this.extractCredentials(presentation);
            const revocationResults = await this.revocationVerifier.batchCheck(credentials, {
                useCache:           true,
                checkSmartContract: true,
                checkOffChain:      true,
            });

            const revokedCredentials = revocationResults.filter(r => r.revoked === true);
            if (revokedCredentials.length > 0) {
                return {
                    valid:             false,
                    reason:            `${revokedCredentials.length} credential(s) are revoked`,
                    revocationStatus:  revokedCredentials,
                    revocationChecked: true,
                };
            }

            if (requireRevocationVerification) {
                const unverified = revocationResults.filter(r => r.verified === false);
                if (unverified.length > 0) {
                    return {
                        valid:             false,
                        reason:            `Revocation status could not be verified for ${unverified.length} credential(s)`,
                        revocationStatus:  unverified,
                        revocationChecked: true,
                    };
                }
            }

            return { valid: true, revocationStatus: revocationResults, revocationChecked: true, timestamp: new Date().toISOString() };
        }

        return { valid: true, revocationChecked: false, timestamp: new Date().toISOString() };
    }

    extractCredentials(presentation) {
        if (!presentation.verifiableCredential) return [];
        return Array.isArray(presentation.verifiableCredential)
            ? presentation.verifiableCredential
            : [presentation.verifiableCredential];
    }

    checkUnlinkability(presentation1, presentation2) {
        const creds1 = this.extractCredentials(presentation1);
        const creds2 = this.extractCredentials(presentation2);
        if (creds1.length === 0 || creds2.length === 0) return { unlinkable: true, reason: 'Empty credentials' };

        const similarities = [];
        for (const c1 of creds1) {
            for (const c2 of creds2) {
                if (c1.credentialSubject.id === c2.credentialSubject.id) {
                    const p1 = c1.credentialSubject.incomeProof.proofValue;
                    const p2 = c2.credentialSubject.incomeProof.proofValue;
                    if (p1 === p2) return { unlinkable: false, reason: 'Identical proofs detected' };
                    similarities.push(this.calculateSimilarity(p1, p2));
                }
            }
        }

        const avg = similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : 0;
        return {
            unlinkable: avg < 0.05,
            similarity: avg,
            reason: avg < 0.05
                ? 'Proofs use different blinding factors (unlinkable)'
                : 'WARNING: High similarity detected (potentially linkable)',
        };
    }

    calculateSimilarity(str1, str2) {
        const s1 = new Set(str1);
        const s2 = new Set(str2);
        const intersection = new Set([...s1].filter(x => s2.has(x)));
        const union        = new Set([...s1, ...s2]);
        return intersection.size / union.size;
    }

    cleanupOldLogs(maxAge = 60 * 60 * 1000) {
        const now = Date.now();
        for (const [nonce, data] of this.presentationLog.entries()) {
            if (now - data.timestamp > maxAge) this.presentationLog.delete(nonce);
        }
    }
}

module.exports = PresentationHandler;
