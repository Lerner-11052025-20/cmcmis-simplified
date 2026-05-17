// ============================================================================
// src/utils/crypto.js  —  Small crypto helpers
// ----------------------------------------------------------------------------
// PURPOSE
//   Two tiny wrappers around node:crypto that read better at the call
//   site than the raw API. Both are pure functions — no state, no I/O.
//
// FUNCTIONS
//   sha256(input)      → 64-char lowercase hex digest (deterministic).
//                        Used to hash refresh JWTs before persisting them
//                        in refresh_tokens.token_hash. Lookup is by hash,
//                        so the raw token never sits in the DB.
//
//   randomToken(bytes) → cryptographically random hex string. Used to
//                        mint CSRF tokens. randomBytes is *the* correct
//                        primitive — Math.random is NOT random in the
//                        security sense and must never be used here.
//
// WHY sha256 (not bcrypt) for refresh tokens?
//   Refresh tokens are HIGH-ENTROPY (full JWTs signed by a 256-bit
//   secret). You cannot brute-force them. The lookup path needs to be
//   FAST (sub-ms) and *deterministic* (same input → same hash, which
//   lets us put a UNIQUE INDEX on token_hash and look up in O(log n)).
//   bcrypt is for low-entropy secrets (passwords) where slowness is the
//   defence; using it for refresh tokens would be 80ms/lookup for no
//   security gain.
// ============================================================================

'use strict';

const crypto = require('node:crypto');

/**
 * SHA-256 hex digest of an input string.
 * @param {string} input
 * @returns {string} 64-character lowercase hex
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Cryptographically random hex token.
 * @param {number} [bytes=32]  Number of random bytes; default 32 → 64-char hex.
 * @returns {string} lowercase hex string of length bytes*2
 */
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { sha256, randomToken };
