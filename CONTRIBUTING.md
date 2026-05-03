# Contributing to QS-PPI

Thank you for your interest in QS-PPI. To maintain the cryptographic integrity, security standards, and legal clarity of this project, we enforce **strict guidelines** for all contributions.

By contributing to this project, you agree to abide by the terms of the [Apache License 2.0](./LICENSE) and this contribution guide.

---

## ⚖️ Legal Requirements

### Contributor License Agreement (CLA)
All contributors must agree to the terms of the Apache License 2.0, specifically **Section 5 (Submission of Contributions)**. 

By submitting a Pull Request, you represent that:
1. You are the sole author of the contribution or have the legal right to submit it.
2. You grant a permanent, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright and patent license to the project.
3. Your contribution does not violate any third-party intellectual property rights.

---

## 🛡️ Security & Integrity Guidelines

### 1. No Hardcoded Secrets
**Zero Tolerance**: Any PR containing hardcoded API keys, private keys, or credentials will be immediately rejected and closed. Use environment variables or mock data placeholders for testing.

### 2. Cryptographic Standards
- All changes to the **Zero-Knowledge Proof (ZKP)** logic or **Post-Quantum Cryptography (PQC)** implementations must be accompanied by mathematical proofs or references to established standards (e.g., NIST FIPS 204).
- No custom cryptography. We only use peer-reviewed, standardized libraries.

### 3. Testing Requirements
- **100% Pass Rate**: No PR will be merged if any existing test fails.
- **New Coverage**: Any new feature or bug fix MUST include corresponding test cases in the `tests/` directory.
- **Security Audit**: High-impact changes must pass the `node tests/testSecurityAudit.js` suite.

---

## 🛠️ Contribution Workflow

### Step 1: Issue First
Before making a change, open an issue to discuss your proposal. We prioritize security and architectural consistency over rapid feature growth.

### Step 2: Branching
- Branch from `main`.
- Use descriptive names: `feat/description` or `fix/description`.

### Step 3: Coding Standards
- Follow the existing architectural patterns (Modular JS, Clean Code).
- **Documentation**: Update the relevant `.md` files in `docs/` if you change any public API or system behavior.
- **License Headers**: All new source files must include the Apache 2.0 license header.

### Step 4: Pull Request
- Provide a detailed description of the change.
- Link the related issue.
- Confirm that you have run `npm test` and all tests pass.

---

## 🚫 Restricted Information

- **Internal Private Keys**: Never request or share production private keys used by the maintainers.
- **Vulnerability Reporting**: Do NOT report security vulnerabilities via public issues. Instead, please email the maintainers at `goldlion123.rp@gmail.com` with the subject "SECURITY VULNERABILITY".

---

## 📦 Data Access

Access to the core cryptographic artifacts (`.zkey`, `.ptau`) is restricted to the build process. Modifications to the trusted setup require a new ceremony and will be handled exclusively by the core team.

---
**Failure to comply with these guidelines will result in the immediate rejection of your contribution and potential restriction from future participation.**
