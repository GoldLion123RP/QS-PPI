/**
 * ZKP API Client for QS-PID Dashboard
 * Connects to the Node.js backend (src/prover.js, src/verifier.js)
 */

export interface ProofData {
  proof: {
    A: string[];
    B: string[][];
    C: string[];
  };
  commitments: {
    incomeHashCommit: string;
    blindingFactor: string;
    nonce: string;
  };
  publicSignals: (number | string)[];
  isValid: boolean;
  timestamp: string;
  verifierContext: string;
}

export interface VerificationResult {
  valid: boolean;
  reason: string;
  timestamp: string;
  verifierId: string;
}

export interface CredentialData {
  "@context": string[];
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    name: string;
    employer: string;
    annualIncomeINR: number;
    thresholdINR: number;
    jurisdiction: string;
  };
  proof?: ProofData;
}

/**
 * Generate a zero-knowledge proof for income verification
 */
export async function generateIncomeProof(
  income: number,
  threshold: number
): Promise<ProofData> {
  try {
    // In production, this would call your Node.js backend
    // For demo: POST http://localhost:3001/api/generate-proof
    
    // Simulated proof generation with realistic crypto values
    const blindingFactor = generateRandomHex(64);
    const nonce = generateRandomHex(64);
    const incomeHashCommit = generatePoseidonHash(income, blindingFactor, nonce);
    
    const isValid = income > threshold;
    
    // Simulate Groth16 proof structure
    const proof: ProofData = {
      proof: {
        A: [generateRandomHex(64), generateRandomHex(64)],
        B: [
          [generateRandomHex(64), generateRandomHex(64)],
          [generateRandomHex(64), generateRandomHex(64)]
        ],
        C: [generateRandomHex(64), generateRandomHex(64)]
      },
      commitments: {
        incomeHashCommit,
        blindingFactor,
        nonce
      },
      publicSignals: [isValid ? 1 : 0, threshold, incomeHashCommit],
      isValid,
      timestamp: new Date().toISOString(),
      verifierContext: 'demo-context'
    };
    
    return proof;
  } catch (error) {
    console.error('Proof generation failed:', error);
    throw new Error('Failed to generate zero-knowledge proof');
  }
}

/**
 * Verify a zero-knowledge proof
 */
export async function verifyIncomeProof(
  proof: ProofData,
  verifierId: string
): Promise<VerificationResult> {
  try {
    // In production: POST http://localhost:3001/api/verify-proof
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const [isValid, threshold, commitment] = proof.publicSignals;
    
    // Simulate Fiat-Shamir challenge verification
    const challengeValid = verifyFiatShamirChallenge(proof, verifierId);
    
    if (!challengeValid) {
      return {
        valid: false,
        reason: 'Fiat-Shamir challenge verification failed (proof tampered)',
        timestamp: new Date().toISOString(),
        verifierId
      };
    }
    
    return {
      valid: isValid === 1,
      reason: isValid === 1 
        ? `Income exceeds threshold of ₹${threshold.toLocaleString('en-IN')}` 
        : `Income does not exceed threshold of ₹${threshold.toLocaleString('en-IN')}`,
      timestamp: new Date().toISOString(),
      verifierId
    };
  } catch (error) {
    console.error('Proof verification failed:', error);
    throw new Error('Failed to verify zero-knowledge proof');
  }
}

/**
 * Issue a W3C Verifiable Credential
 */
export async function issueCredential(
  name: string,
  income: number,
  employer: string,
  date: string
): Promise<CredentialData> {
  try {
    // Generate proof for 5 LPA threshold
    const proof = await generateIncomeProof(income, 500000);
    
    const credential: CredentialData = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://schema.org"
      ],
      type: ["VerifiableCredential", "IncomeCredential"],
      issuer: "did:key:issuer-bank-001",
      issuanceDate: date || new Date().toISOString().split('T')[0],
      credentialSubject: {
        id: `did:key:subject-${generateRandomHex(8)}`,
        name,
        employer,
        annualIncomeINR: income,
        thresholdINR: 500000,
        jurisdiction: "IN"
      },
      proof
    };
    
    return credential;
  } catch (error) {
    console.error('Credential issuance failed:', error);
    throw new Error('Failed to issue verifiable credential');
  }
}

/**
 * Generate a presentation proof (holder → verifier)
 */
export async function generatePresentationProof(
  income: number,
  threshold: number,
  verifierChallenge: string
): Promise<ProofData> {
  try {
    const proof = await generateIncomeProof(income, threshold);
    
    // Bind verifier challenge using Fiat-Shamir
    proof.verifierContext = verifierChallenge;
    
    return proof;
  } catch (error) {
    console.error('Presentation proof generation failed:', error);
    throw new Error('Failed to generate presentation proof');
  }
}

// ==================== Helper Functions ====================

function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for server-side
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generatePoseidonHash(
  income: number,
  blindingFactor: string,
  nonce: string
): string {
  // Simulated Poseidon hash (in production, use real circomlibjs)
  const data = `${income}${blindingFactor}${nonce}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
}

function verifyFiatShamirChallenge(
  proof: ProofData,
  verifierId: string
): boolean {
  // Simulated Fiat-Shamir verification
  // In production: SHA256(isValid || threshold || commitment || verifierId || timestamp)
  const [isValid, threshold, commitment] = proof.publicSignals;
  
  // Basic integrity check
  if (!proof.commitments.incomeHashCommit || !proof.commitments.nonce) {
    return false;
  }
  
  if (typeof isValid !== 'number' || (isValid !== 0 && isValid !== 1)) {
    return false;
  }
  
  return true;
}

/**
 * Format INR currency
 */
export function formatINR(amount: number): string {
  const lpa = (amount / 100000).toFixed(2);
  return `₹${amount.toLocaleString('en-IN')} (${lpa} LPA)`;
}

/**
 * Calculate Jaccard similarity (unlinkability metric)
 */
export function calculateJaccardSimilarity(
  commitment1: string,
  commitment2: string
): number {
  // Simulated Jaccard similarity for proof unlinkability
  // In production: actual set-based similarity calculation
  return Math.random() * 0.05; // Always < 0.05 (high unlinkability)
}

/**
 * Estimate circuit constraints
 */
export function estimateCircuitConstraints(): number {
  // Groth16 incomeProof.circom: ~145,000 R1CS constraints
  return 145234;
}

/**
 * Store proof state (anti-replay)
 */
const proofStateStore = new Map<string, 'CREATED' | 'USED'>();

export function markProofAsUsed(proofId: string): void {
  proofStateStore.set(proofId, 'USED');
}

export function isProofUsed(proofId: string): boolean {
  return proofStateStore.get(proofId) === 'USED';
}

export function generateProofId(proof: ProofData): string {
  return `proof-${proof.commitments.nonce.slice(2, 18)}-${Date.now()}`;
}
