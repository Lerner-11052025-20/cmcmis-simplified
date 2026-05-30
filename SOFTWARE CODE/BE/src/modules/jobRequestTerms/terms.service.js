// ============================================================================
// src/modules/jobRequestTerms/terms.service.js  —  Terms orchestration
// ----------------------------------------------------------------------------
// Contains business logic for Terms and Conditions CRUD operations.
// Maps repositories to services and wraps them in clean error handlers.
// ============================================================================

'use strict';

const repo = require('./terms.repo');
const { errors } = require('../../middleware/errorHandler');

/**
 * Fetch all active terms for form loading.
 */
async function getActiveTerms() {
  return await repo.findActive();
}

/**
 * Fetch all terms for admin dashboard.
 */
async function getAllTerms() {
  return await repo.findAll();
}

/**
 * Create a new term.
 */
async function createTerm({ text, index_no, is_active }) {
  // Normalize is_active to 1 or 0 for MySQL TINYINT
  const isActiveTiny = is_active ? 1 : 0;
  return await repo.insert({ text, index_no, is_active: isActiveTiny });
}

/**
 * Update an existing term.
 */
async function updateTerm(id, payload) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw errors.notFound(`Terms and Conditions item with ID ${id} not found`);
  }

  const updatedData = {
    text: payload.text !== undefined ? payload.text : existing.text,
    index_no: payload.index_no !== undefined ? payload.index_no : existing.index_no,
    is_active: payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : existing.is_active,
  };

  await repo.update(id, updatedData);
  return { id, ...updatedData };
}

/**
 * Delete a term.
 */
async function deleteTerm(id) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw errors.notFound(`Terms and Conditions item with ID ${id} not found`);
  }
  await repo.delete(id);
  return { success: true };
}

module.exports = {
  getActiveTerms,
  getAllTerms,
  createTerm,
  updateTerm,
  deleteTerm,
};
