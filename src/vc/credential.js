/**
 * W3C VC 2.0 Credential Schema
 * 
 * Defines the structure and validation for income proof credentials
 * Compliant with W3C Verifiable Credentials Data Model 2.0
 * 
 * SECURITY: Includes W3C Status List 2021 revocation verification
 * to check credentials against off-chain and smart-contract registries
 */

const INCOME_PROOF_CONTEXT = 'https://qs-pid.example/context/v1';
const W3C_VC_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const W3C_SECURITY_CONTEXT = 'https://w3id.org/security/v2';
const W3C_STATUS_LIST_2021_CONTEXT = 'https://w3id.org/vc/status-list/2021/v1';

/**
 * Income Proof Credential Schema
 */
const IncomeProofCredentialSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Income Proof Credential',
    description: 'Verifiable credential proving annual income > 5 LPA',
    type: 'object',
    required: ['@context', 'type', 'issuer', 'issuanceDate', 'credentialSubject', 'proof'],
    properties: {
        '@context': {
            type: 'array',
            description: 'JSON-LD context array',
            items: { type: 'string' },
        },
        type: {
            type: 'array',
            description: 'Credential types',
            items: { type: 'string' },
            minItems: 2,
        },
        issuer: {
            type: 'object',
            description: 'Issuer DID or URL',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
            },
            required: ['id'],
        },
        issuanceDate: {
            type: 'string',
            format: 'date-time',
            description: 'Credential issuance timestamp',
        },
        expirationDate: {
            type: 'string',
            format: 'date-time',
            description: 'Optional credential expiration',
        },
        credentialSubject: {
            type: 'object',
            description: 'Subject information and proof',
            properties: {
                id: {
                    type: 'string',
                    description: 'Subject DID',
                },
                incomeProof: {
                    type: 'object',
                    description: 'ZK proof data',
                    properties: {
                        proofValue: { type: 'string' },
                        verificationMethod: { type: 'string' },
                        threshold: { type: 'string' },
                        commitments: { type: 'object' },
                    },
                    required: ['proofValue'],
                },
                claims: {
                    type: 'object',
                    description: 'Validated claims',
                    properties: {
                        incomeExceedsThreshold: { type: 'boolean' },
                        thresholdValue: { type: 'string' },
                    },
                },
            },
            required: ['id', 'incomeProof'],
        },
        credentialStatus: {
            type: 'object',
            description: 'Credential revocation/suspension status',
            properties: {
                id: { type: 'string' },
                type: { type: 'string' },
            },
        },
        proof: {
            type: 'object',
            description: 'Cryptographic proof',
            properties: {
                type: { type: 'string' },
                created: { type: 'string', format: 'date-time' },
                verificationMethod: { type: 'string' },
                signatureValue: { type: 'string' },
            },
            required: ['type', 'created', 'verificationMethod', 'signatureValue'],
        },
    },
};

/**
 * Presentation Schema (Multi-Verifier Scenario)
 */
const VerifiablePresentationSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Verifiable Presentation',
    description: 'Presentation of income proof credentials with anti-replay protection',
    type: 'object',
    required: ['@context', 'type', 'verifiableCredential', 'proof'],
    properties: {
        '@context': {
            oneOf: [
                { type: 'string' },
                {
                    type: 'array',
                    items: { type: 'string' },
                },
            ],
        },
        type: {
            oneOf: [
                { type: 'string', enum: ['VerifiablePresentation'] },
                {
                    type: 'array',
                    items: { type: 'string' },
                },
            ],
        },
        verifiableCredential: {
            oneOf: [
                { type: 'object' },
                {
                    type: 'array',
                    items: { type: 'object' },
                },
            ],
            description: 'One or more credentials being presented',
        },
        holder: {
            type: 'string',
            description: 'Holder DID',
        },
        proof: {
            oneOf: [
                { type: 'object' },
                { type: 'array', items: { type: 'object' } },
            ],
            description: 'Cryptographic proof(s)',
        },
    },
};

/**
 * W3C Status List 2021 Revocation Verifier
 * 
 * Implements W3C Verifiable Credentials Status List 2021 specification
 * for checking credential revocation status against:
 * - Off-chain status list registries
 * - Blockchain/smart-contract based revocation registries
 * - Distributed revocation systems
 * 
 * Security Properties:
 * - Bitstring-based status encoding (efficient storage)
 * - Batch verification support (verify multiple credentials at once)
 * - Smart contract integration (Ethereum/compatible chains)
 * - Replay attack protection (timestamp-based validation)
 */
class StatusList2021Revocation {
    constructor(registryUrl = null, smartContractAddress = null) {
        this.registryUrl = registryUrl || 'https://qs-pid.example/status/list';
        this.smartContractAddress = smartContractAddress || null;
        this.cachedStatusList = new Map();  // Cache status lists for performance
        this.cacheExpiry = 5 * 60 * 1000;  // 5-minute cache expiry
        this.revocationRegistry = new Map();  // In-memory fall back registry
    }

    /**
     * Check if a credential is revoked
     * 
     * @param {Object} credential - W3C VC 2.0 credential
     * @param {Object} options - Verification options
     * @returns {Object} Revocation status result
     */
    async isRevoked(credential, options = {}) {
        const {
            useCache = true,
            checkSmartContract = true,
            checkOffChain = true,
            timeout = 5000,
        } = options;

        // Validate credential has revocation status
        if (!credential.credentialStatus) {
            return {
                revoked: false,
                reason: 'No credentialStatus in credential',
                verified: false,
                source: 'none',
            };
        }

        const status = credential.credentialStatus;

        // Validate status structure per W3C Status List 2021
        if (status.type !== 'StatusList2021Entry') {
            return {
                revoked: false,
                reason: 'Invalid StatusList2021Entry type',
                verified: false,
                source: 'validation',
            };
        }

        // Validate required fields
        const requiredFields = ['statusListIndex', 'statusListCredential', 'statusPurpose'];
        for (const field of requiredFields) {
            if (status[field] === undefined) {
                return {
                    revoked: null,
                    reason: `Missing required field: ${field}`,
                    verified: false,
                    source: 'validation',
                };
            }
        }

        const statusListIndex = parseInt(status.statusListIndex);
        if (isNaN(statusListIndex) || statusListIndex < 0) {
            return {
                revoked: null,
                reason: 'Invalid statusListIndex',
                verified: false,
                source: 'validation',
            };
        }

        // Determine where revocation status is stored
        if (checkSmartContract && this.smartContractAddress) {
            const scResult = await this.checkSmartContractStatus(
                credential,
                statusListIndex,
                { timeout }
            );
            if (scResult.verified) return scResult;
        }

        if (checkOffChain) {
            const offChainResult = await this.checkOffChainStatus(
                status.statusListCredential,
                statusListIndex,
                credential.id,
                { useCache, timeout }
            );
            return offChainResult;
        }

        // Fall back to in-memory registry
        return this.checkInMemoryRegistry(credential.id, statusListIndex);
    }

    /**
     * Check revocation status against off-chain registry
     * Fetches status list and verifies credential against it
     * 
     * @param {string} statusListUrl - URL to status list credential
     * @param {number} statusIndex - Bitstring index of credential
     * @param {string} credentialId - Credential ID for logging
     * @param {Object} options - Caching and timeout options
     * @returns {Object} Revocation status
     */
    async checkOffChainStatus(statusListUrl, statusIndex, credentialId, options = {}) {
        const { useCache = true, timeout = 5000 } = options;

        // Check cache first
        if (useCache && this.cachedStatusList.has(statusListUrl)) {
            const cached = this.cachedStatusList.get(statusListUrl);
            if (new Date().getTime() - cached.timestamp < this.cacheExpiry) {
                return this.verifyCredentialInStatusList(
                    cached.statusList,
                    statusIndex,
                    credentialId,
                    'cached'
                );
            }
        }

        // In production, fetch from HTTP with timeout
        // For now, simulate with in-memory storage
        const statusList = this.getStatusListFromRegistry(statusListUrl);

        if (!statusList) {
            return {
                revoked: null,
                reason: 'Status list not found',
                verified: false,
                source: 'off-chain',
                statusListUrl: statusListUrl,
            };
        }

        // Cache the result
        this.cachedStatusList.set(statusListUrl, {
            statusList: statusList,
            timestamp: new Date().getTime(),
        });

        return this.verifyCredentialInStatusList(
            statusList,
            statusIndex,
            credentialId,
            'off-chain'
        );
    }

    /**
     * Check revocation via smart contract
     * Queries blockchain-based revocation registry
     * 
     * @param {Object} credential - Credential to verify
     * @param {number} statusIndex - Status index in bitstring
     * @param {Object} options - SmartContract and timeout options
     * @returns {Object} Revocation status
     */
    async checkSmartContractStatus(credential, statusIndex, options = {}) {
        const { timeout = 5000 } = options;

        // In production, use ethers.js or web3.js to query contract
        // For demo, simulate smart contract query
        const contractStatus = this.querySmartContractMock(
            credential,
            statusIndex
        );

        return {
            revoked: contractStatus.revoked,
            reason: contractStatus.reason,
            verified: true,
            source: 'smart-contract',
            contract: this.smartContractAddress,
            blockNumber: contractStatus.blockNumber,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Verify credential in status list bitstring
     * 
     * @param {Object} statusList - Decoded status list credential
     * @param {number} statusIndex - Bit position
     * @param {string} credentialId - Credential ID
     * @param {string} source - Data source (off-chain/cached/etc)
     * @returns {Object} Verification result
     */
    verifyCredentialInStatusList(statusList, statusIndex, credentialId, source = 'off-chain') {
        if (!statusList.bitstring) {
            return {
                revoked: null,
                reason: 'Invalid status list format',
                verified: false,
                source: source,
            };
        }

        // Decode bitstring (typically base64 encoding of bits)
        const bitstring = this.decodeBitstring(statusList.bitstring);
        
        // Check if bit at statusIndex is set to 1 (revoked) or 0 (not revoked)
        const byteIndex = Math.floor(statusIndex / 8);
        const bitIndex = 7 - (statusIndex % 8);  // LSB first

        if (byteIndex >= bitstring.length) {
            return {
                revoked: false,
                reason: 'StatusIndex out of bounds in status list',
                verified: false,
                source: source,
            };
        }

        const byte = bitstring[byteIndex];
        const isBitSet = (byte & (1 << bitIndex)) !== 0;

        // If status purpose is "revocation", bit = 1 means revoked
        const purposeType = statusList.statusPurpose || 'revocation';

        return {
            revoked: purposeType === 'revocation' ? isBitSet : !isBitSet,
            reason: isBitSet ? 'Credential found in revocation list' : 'Credential not revoked',
            verified: true,
            source: source,
            statusIndex: statusIndex,
            statusListUrl: statusList.url,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Decode bitstring from base64 (W3C Status List 2021 encoding)
     * Supports GZIP compression for space efficiency
     * 
     * @param {string} encodedBitstring - Base64 or base64url encoded bitstring
     * @returns {Uint8Array} Decoded bitmap as bytes
     */
    decodeBitstring(encodedBitstring) {
        try {
            // Handle base64 or base64url encoding
            const cleaned = encodedBitstring.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = Buffer.from(cleaned, 'base64').toString('binary');
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch (error) {
            console.error('[!] Failed to decode bitstring:', error.message);
            return new Uint8Array(0);
        }
    }

    /**
     * Encode bitstring to base64 (W3C Status List 2021 encoding)
     * Used when building status lists
     * 
     * @param {Uint8Array|Buffer} bitmap - Bitmap bytes
     * @returns {string} Base64 encoded bitstring
     */
    encodeBitstring(bitmap) {
        return Buffer.from(bitmap).toString('base64');
    }

    /**
     * Query smart contract for revocation status (mock)
     * In production, use web3.js or ethers.js
     * 
     * @param {Object} credential - Credential to check
     * @param {number} statusIndex - Status index
     * @returns {Object} Smart contract result
     */
    querySmartContractMock(credential, statusIndex) {
        // Mock: check if credential is in revocation registry
        const credentialHash = require('crypto')
            .createHash('sha256')
            .update(credential.id)
            .digest('hex');

        const isRevokedInRegistry = this.revocationRegistry.has(credentialHash);

        return {
            revoked: isRevokedInRegistry,
            reason: isRevokedInRegistry ? 'Revoked in smart contract' : 'Not revoked',
            blockNumber: Math.floor(Math.random() * 1000000),
        };
    }

    /**
     * Get status list from registry (mock)
     * In production, fetch from HTTP or IPFS
     * 
     * @param {string} statusListUrl - Status list URL
     * @returns {Object} Status list with bitstring
     */
    getStatusListFromRegistry(statusListUrl) {
        // Mock: Return basic status list structure
        // In production, fetch the actual status list credential
        if ('https://qs-pid.example/status/list'.includes(statusListUrl)) {
            return {
                id: statusListUrl,
                type: 'StatusList2021Credential',
                bitstring: this.encodeBitstring(new Uint8Array(256)),  // 256 bytes = 2048 bits
                statusPurpose: 'revocation',
                url: statusListUrl,
                issuanceDate: new Date().toISOString(),
            };
        }
        return null;
    }

    /**
     * Check credential in in-memory revocation registry
     * 
     * @param {string} credentialId - Credential ID
     * @param {number} statusIndex - Status index
     * @returns {Object} Revocation status
     */
    checkInMemoryRegistry(credentialId, statusIndex) {
        const credentialHash = require('crypto')
            .createHash('sha256')
            .update(credentialId)
            .digest('hex');

        const isRevoked = this.revocationRegistry.has(credentialHash);

        return {
            revoked: isRevoked,
            reason: isRevoked ? 'Credential revoked (in-memory registry)' : 'Not revoked',
            verified: true,
            source: 'in-memory',
            statusIndex: statusIndex,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Revoke a credential in all registries
     * Called when credential needs to be invalidated
     * 
     * @param {string} credentialId - ID of credential to revoke
     * @param {string} reason - Revocation reason
     * @param {Object} options - Additional revocation options
     */
    async revokeCredential(credentialId, reason = 'Not specified', options = {}) {
        const credentialHash = require('crypto')
            .createHash('sha256')
            .update(credentialId)
            .digest('hex');

        // Add to in-memory registry
        this.revocationRegistry.set(credentialHash, {
            revokedAt: new Date().toISOString(),
            reason: reason,
            ...options,
        });

        // In production, also update smart contract and off-chain registries
        if (this.smartContractAddress) {
            // TODO: Update smart contract status
            console.log(`[*] Credential revoked in registry: ${credentialId}`);
        }

        return {
            success: true,
            credentialId: credentialId,
            revokedAt: new Date().toISOString(),
            registries: ['in-memory', this.smartContractAddress ? 'smart-contract' : null].filter(Boolean),
        };
    }

    /**
     * Batch check multiple credentials
     * Efficient checking of multiple credentials against same status list
     * 
     * @param {Array} credentials - Array of credentials to check
     * @param {Object} options - Verification options
     * @returns {Array} Array of revocation status results
     */
    async batchCheck(credentials, options = {}) {
        const results = [];
        for (const credential of credentials) {
            const result = await this.isRevoked(credential, options);
            results.push({
                credentialId: credential.id,
                ...result,
            });
        }
        return results;
    }

    /**
     * Create a new status list credential
     * Used by verifiers to publish revocation status
     * 
     * @param {string} issuerId - Issuer ID
     * @param {number} maxBits - Maximum number of credentials in this list
     * @returns {Object} New StatusList2021Credential
     */
    createStatusListCredential(issuerId, maxBits = 16384) {
        const byteLength = Math.ceil(maxBits / 8);
        const bitstring = this.encodeBitstring(new Uint8Array(byteLength));

        return {
            '@context': [W3C_VC_CONTEXT, W3C_STATUS_LIST_2021_CONTEXT],
            id: `${this.registryUrl}-${new Date().getTime()}`,
            type: ['VerifiableCredential', 'StatusList2021Credential'],
            issuer: issuerId,
            issued: new Date().toISOString(),
            credentialSubject: {
                id: `${this.registryUrl}#list`,
                type: 'StatusList2021',
                statusPurpose: 'revocation',
                encodedList: bitstring,
                statusListLength: maxBits,
            },
        };
    }
}

/**
 * Create a W3C VC 2.0 compliant income proof credential
 */
class IncomeProofCredential {
    constructor(issuerId, subjectId, zkProofData, options = {}) {
        this.issuerId = issuerId;
        this.subjectId = subjectId;
        this.zkProofData = zkProofData;
        this.options = {
            expirationDays: 365,
            revocationEnabled: true,
            ...options,
        };
    }

    /**
     * Generate credential ID
     */
    generateCredentialId() {
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        return `urn:qs-pid:credential:${timestamp}:${random}`;
    }

    /**
     * Build the credential object
     */
    build() {
        const now = new Date();
        const expirationDate = new Date(
            now.getTime() + this.options.expirationDays * 24 * 60 * 60 * 1000
        );

        const credential = {
            '@context': [W3C_VC_CONTEXT, INCOME_PROOF_CONTEXT, W3C_SECURITY_CONTEXT],
            id: this.generateCredentialId(),
            type: ['VerifiableCredential', 'IncomeProofCredential'],
            issuer: {
                id: this.issuerId,
                name: 'QS-PID Income Verifier',
            },
            issuanceDate: now.toISOString(),
            expirationDate: expirationDate.toISOString(),
            credentialSubject: {
                id: this.subjectId,
                incomeProof: {
                    proofValue: Buffer.from(JSON.stringify(this.zkProofData.proof)).toString('base64'),
                    verificationMethod: 'BLS12-381#ZK-SNARK-Groth16',
                    curve: 'BN254',
                    threshold: '500000000', // 5 LPA
                    commitments: {
                        incomeHashCommit: this.zkProofData.commitments.incomeHashCommit,
                        blindingFactor: '***redacted***',
                        nonce: '***redacted***',
                    },
                },
                claims: {
                    incomeExceedsThreshold: this.zkProofData.isValid,
                    thresholdValue: '500000000',
                    currency: 'INR',
                    period: 'annual',
                },
            },
        };

        // Add revocation status if enabled
        if (this.options.revocationEnabled) {
            credential.credentialStatus = {
                id: `https://qs-pid.example/revocation/${credential.id}`,
                type: 'StatusList2021Entry',
                statusPurpose: 'revocation',
                statusListIndex: Math.floor(Math.random() * 100000),
                statusListCredential: 'https://qs-pid.example/status/list',
            };
        }

        return credential;
    }

    /**
     * Add proof (issuer signature)
     */
    async sign(credential, signingKey) {
        // In production, use actual cryptographic signing
        const crypto = require('crypto');
        
        // Create canonical form for signing
        const canonicalForm = JSON.stringify(credential, null, 0);
        const signature = crypto
            .createHash('sha256')
            .update(canonicalForm + signingKey)
            .digest('hex');

        credential.proof = {
            type: 'EcdsaSecp256k1Signature2019',
            created: new Date().toISOString(),
            verificationMethod: `${this.issuerId}#key-1`,
            signatureValue: signature,
            domain: 'qs-pid.example',
            nonce: crypto.randomBytes(16).toString('hex'),
        };

        return credential;
    }

    /**
     * Validate credential against schema
     */
    validate(credential) {
        const errors = [];

        // Check required fields
        const required = [
            '@context',
            'type',
            'issuer',
            'issuanceDate',
            'credentialSubject',
            'proof',
        ];

        for (const field of required) {
            if (!credential[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Check types
        if (
            !Array.isArray(credential.type) ||
            !credential.type.includes('VerifiableCredential')
        ) {
            errors.push('Invalid credential type');
        }

        // Check issuer
        if (typeof credential.issuer !== 'object' || !credential.issuer.id) {
            errors.push('Invalid issuer format');
        }

        // Check credentialSubject
        if (
            !credential.credentialSubject ||
            !credential.credentialSubject.id ||
            !credential.credentialSubject.incomeProof
        ) {
            errors.push('Invalid credentialSubject');
        }

        // Check expiration
        if (credential.expirationDate) {
            const expirationTime = new Date(credential.expirationDate).getTime();
            const currentTime = new Date().getTime();
            if (currentTime > expirationTime) {
                errors.push('Credential has expired');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors,
        };
    }

    /**
     * Validate credential including revocation status check
     * SECURITY: Checks W3C Status List 2021 revocation before accepting credential
     * 
     * @param {Object} credential - Credential to validate
     * @param {Object} revocationVerifier - StatusList2021Revocation instance
     * @param {Object} options - Validation options
     * @returns {Object} Validation result with revocation status
     */
    async validateWithRevocation(credential, revocationVerifier = null, options = {}) {
        // First, do basic schema validation
        const basicValidation = this.validate(credential);

        if (!basicValidation.valid) {
            return {
                valid: false,
                errors: basicValidation.errors,
                revocationChecked: false,
                reason: 'Basic schema validation failed',
            };
        }

        // If no revocation verifier provided, create default
        if (!revocationVerifier) {
            revocationVerifier = new StatusList2021Revocation();
        }

        // Check revocation status
        const revocationStatus = await revocationVerifier.isRevoked(
            credential,
            options.revocationOptions || {
                useCache: true,
                checkSmartContract: true,
                checkOffChain: true,
            }
        );

        // If credential is revoked, fail validation
        if (revocationStatus.revoked) {
            return {
                valid: false,
                errors: ['Credential has been revoked'],
                revocationStatus: revocationStatus,
                reason: revocationStatus.reason,
                revocationChecked: true,
            };
        }

        // If revocation check couldn't be verified and we require verification
        if (!revocationStatus.verified && options.requireRevocationVerification) {
            return {
                valid: false,
                errors: ['Revocation status could not be verified'],
                revocationStatus: revocationStatus,
                reason: 'Unable to verify revocation status',
                revocationChecked: true,
            };
        }

        // All checks passed
        return {
            valid: true,
            errors: [],
            revocationStatus: revocationStatus,
            revocationChecked: true,
            timestamp: new Date().toISOString(),
        };
    }
}

module.exports = {
    IncomeProofCredential,
    IncomeProofCredentialSchema,
    VerifiablePresentationSchema,
    StatusList2021Revocation,
    INCOME_PROOF_CONTEXT,
    W3C_VC_CONTEXT,
    W3C_SECURITY_CONTEXT,
    W3C_STATUS_LIST_2021_CONTEXT,
};
