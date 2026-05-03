# 🐛 Currency Scaling Bug Fix

**Fixed**: March 1, 2026  
**Issue**: Incorrect representation of Indian Rupee Lakhs Per Annum (LPA)

---

## 🔴 Problem Identified

The original codebase incorrectly scaled Indian currency values by adding **two extra zeros**:

### **Incorrect Scaling** (❌ BEFORE):
- 1 Lakh = 100,000,000 (100 million) ❌
- 5 LPA = 500,000,000 ❌
- 10 LPA = 1,000,000,000 ❌

### **Correct Scaling** (✅ AFTER):
- 1 Lakh = 100,000 (one hundred thousand) ✅
- 5 LPA = 500,000 (₹5,00,000) ✅
- 10 LPA = 1,000,000 (₹10,00,000) ✅

---

## 🔍 Root Cause

**Mathematical Error**: The system was representing **1 Lakh as 100 million** instead of **100 thousand**.

In Indian numbering system:
- 1 Lakh = 1,00,000 = 100,000 (five digits)
- NOT 10,00,00,000 = 100,000,000 (nine digits)

**Impact**: All income and threshold values were inflated by a factor of **1000x**.

---

## 🛠️ Files Fixed

### 1. **tests/testQSPPI.js**

**Changes**:
```javascript
// BEFORE (❌)
const threshold = '500000000'; // Incorrect: 500 million
const validIncomes = [
    { income: '600000000',  label: '6 LPA' },   // Wrong
    { income: '1000000000', label: '10 LPA' },  // Wrong
    { income: '700000000',  label: '7 LPA' },   // Wrong
];

// AFTER (✅)
const threshold = '500000'; // Correct: 5 Lakhs = 500,000
const validIncomes = [
    { income: '600000',  label: '6 LPA = ₹6,00,000' },   // Correct
    { income: '1000000', label: '10 LPA = ₹10,00,000' }, // Correct
    { income: '700000',  label: '7 LPA = ₹7,00,000' },   // Correct
];
```

**Lines changed**: 35+ instances across all test cases

---

### 2. **src/vc/credential.js**

**Changes**:
```javascript
// BEFORE (❌)
threshold: '500000000', // 5 LPA
thresholdValue: '500000000',

// AFTER (✅)
threshold: '500000', // 5 LPA = 5 × 100,000
thresholdValue: '500000', // 5 LPA = ₹5,00,000
```

**Lines changed**: 2 instances + documentation

---

### 3. **src/prover.js**

**Changes**:
```javascript
// BEFORE (❌)
async generateProof(income, threshold = '500000000', verifierId = 'verifier-default') {
    // Circuit max ~42.9 LPA at 100,000,000 units/LPA
}

async generateMultiProofs(income, threshold = '500000000', count = 3) {
    // Wrong default
}

// AFTER (✅)
async generateProof(income, threshold = '500000', verifierId = 'verifier-default') {
    // Circuit max ~42,949 LPA at 100,000 units/LPA
}

async generateMultiProofs(income, threshold = '500000', count = 3) {
    // Correct default
}
```

**Lines changed**: 2 default parameters + comments

---

## 📊 Conversion Table

| LPA | **WRONG** (Before) | **CORRECT** (After) | Indian Notation |
|-----|-------------------|--------------------|-----------------|
| 4   | 400,000,000       | 400,000            | ₹4,00,000      |
| 5   | 500,000,000       | 500,000            | ₹5,00,000      |
| 6   | 600,000,000       | 600,000            | ₹6,00,000      |
| 7   | 700,000,000       | 700,000            | ₹7,00,000      |
| 8   | 800,000,000       | 800,000            | ₹8,00,000      |
| 10  | 1,000,000,000     | 1,000,000          | ₹10,00,000     |
| 42  | 4,200,000,000     | 4,200,000          | ₹42,00,000     |

---

## ✅ Verification

### **Circuit Compatibility**

The circuit uses `Num2Bits(32)` which allows values up to `2^32 - 1 = 4,294,967,295`.

**Before Fix**:
- Max representable: ~42.9 LPA (4,294,967,295 / 100,000,000)
- Very limited range ❌

**After Fix**:
- Max representable: ~42,949 LPA (4,294,967,295 / 100,000)
- Realistic income range ✅

---

## 📝 Test Examples

### **Valid Proof Test**

```javascript
// Test: 6 LPA > 5 LPA threshold
const income = '600000';    // ₹6,00,000 (6 Lakhs)
const threshold = '500000'; // ₹5,00,000 (5 Lakhs)

const proof = await prover.generateProof(income, threshold);
// Expected: proof.isValid === true ✅
```

### **Invalid Proof Test**

```javascript
// Test: 4 LPA < 5 LPA threshold
const income = '400000';    // ₹4,00,000 (4 Lakhs)
const threshold = '500000'; // ₹5,00,000 (5 Lakhs)

const proof = await prover.generateProof(income, threshold);
// Expected: proof.isValid === false ✅
```

### **Boundary Test**

```javascript
// Test: Exactly at threshold
const income = '500000';    // ₹5,00,000 (5 Lakhs)
const threshold = '500000'; // ₹5,00,000 (5 Lakhs)

const proof = await prover.generateProof(income, threshold);
// Expected: proof.isValid === false (must be strictly greater) ✅

// Test: Just above threshold
const income2 = '500001';   // ₹5,00,001
const proof2 = await prover.generateProof(income2, threshold);
// Expected: proof2.isValid === true ✅
```

---

## 💼 Real-World Impact

### **Example Use Case: Loan Application**

**Scenario**: Bank requires minimum income of ₹5 LPA

**Before Fix** (❌):
- System checking: Income > 500,000,000 (500 million!)
- Real income: ₹7 LPA = ₹7,00,000
- Result: **REJECTED** (7,00,000 < 500,000,000)
- **Everyone gets rejected** ❌

**After Fix** (✅):
- System checking: Income > 500,000 (5 lakhs)
- Real income: ₹7 LPA = ₹7,00,000
- Result: **APPROVED** (7,00,000 > 5,00,000)
- **Correct verification** ✅

---

## 🔍 How to Verify the Fix

### **Step 1: Run Tests**

```bash
npm run test:all
```

**Expected output**:
```
Test 1: Valid Income Proofs
[*] Testing valid income: 6 LPA (> 5 LPA) = ₹6,00,000
[✓] Proof verified for income 6 LPA (> 5 LPA) = ₹6,00,000

Test 2: Invalid Income Proofs
[*] Testing invalid income: 4 LPA (< 5 LPA) = ₹4,00,000
[✓] Verification correctly failed for income 4 LPA (< 5 LPA) = ₹4,00,000

Total: 28/28 tests passing ✓
```

---

### **Step 2: Manual Verification**

```javascript
const { IncomeProofGenerator } = require('./src/prover');
const prover = new IncomeProofGenerator();
await prover.initialize();

// Test correct scaling
const proof = await prover.generateProof('600000', '500000');
console.log('6 LPA > 5 LPA:', proof.isValid); // Should be true

const proof2 = await prover.generateProof('400000', '500000');
console.log('4 LPA < 5 LPA:', proof2.isValid); // Should be false
```

---

## 📚 Indian Number System Reference

### **Place Values**:

| Value | Indian | Western | Notation |
|-------|--------|---------|----------|
| 1,000 | Thousand | Thousand | 1,000 |
| 10,000 | Ten Thousand | Ten Thousand | 10,000 |
| 1,00,000 | **Lakh** | Hundred Thousand | 100,000 |
| 10,00,000 | Ten Lakh | Million | 1,000,000 |
| 1,00,00,000 | **Crore** | Ten Million | 10,000,000 |

### **LPA Conversions**:

```
1 LPA = 1 Lakh Per Annum = 1,00,000 = 100,000
5 LPA = 5 Lakhs Per Annum = 5,00,000 = 500,000
10 LPA = 10 Lakhs Per Annum = 10,00,000 = 1,000,000
100 LPA = 1 Crore Per Annum = 1,00,00,000 = 10,000,000
```

---

## ✨ Summary

### **What Changed**:

| Component | Before | After | Factor |
|-----------|--------|-------|--------|
| Threshold (5 LPA) | 500,000,000 | 500,000 | ÷ 1000 |
| Income (6 LPA) | 600,000,000 | 600,000 | ÷ 1000 |
| Income (10 LPA) | 1,000,000,000 | 1,000,000 | ÷ 1000 |
| Max Circuit Income | ~42.9 LPA | ~42,949 LPA | × 1000 |

### **Why It Matters**:

1. **Accuracy**: System now uses correct Indian currency representation
2. **Usability**: Realistic income values (lakhs, not hundreds of millions)
3. **Range**: Circuit can now handle incomes up to ~42,949 LPA instead of ~42 LPA
4. **Semantics**: Code is readable and matches real-world usage

### **Commits**:

1. `8c7d6e2` - fix: correct Indian currency LPA scaling in tests (testQSPPI.js)
2. `8f1fdcf` - fix: correct LPA scaling in W3C VC credential schema (credential.js)
3. `e744907` - fix: correct LPA scaling in prover default threshold (prover.js)

---

## 🚀 Impact on Hackathon Demo

### **Web Demo Updated Values**:

**Prover Panel**:
- Income: `750000` (₹7.5 LPA) ✅
- Threshold: `500000` (₹5 LPA) ✅

**Expected Result**: Valid proof (✅)

**Before**: Values were `750000000` and `500000000` (nonsensical amounts) ❌

---

<p align="center">
  <strong>✅ Currency Scaling Now Correct!</strong><br>
  <em>1 Lakh = 100,000 | 5 LPA = 500,000 (₹5,00,000)</em>
</p>

