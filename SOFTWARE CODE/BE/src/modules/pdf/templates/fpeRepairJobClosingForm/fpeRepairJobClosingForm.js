// ============================================================================
// src/modules/pdf/templates/fpeRepairJobClosingForm/fpeRepairJobClosingForm.js
// ----------------------------------------------------------------------------
// Dedicated Job Closing Form PDF for ONLY F&PE Repair job cards.
// Keeps this category-specific download logic separate while using the repair
// closing-form renderer with F&PE layout options from the reference LaTeX.
// ============================================================================

'use strict';

const {
  renderTmeRepairJobClosingForm,
} = require('../tmeRepairJobClosingForm/tmeRepairJobClosingForm');

function renderFpeRepairJobClosingForm(payload, stream, options = {}) {
  renderTmeRepairJobClosingForm(payload, stream, {
    ...options,
    subtitle: 'F&PE REPAIR / MAINTENANCE',
    headerRule: true,
    sectionStyle: 'line',
    showCalLabRows: false,
    showEquipmentUsed: false,
    showUserAcceptance: true,
    showInchargeName: false,
    deviceTitle: 'FAULTY DEVICE(S) / REPLACED PARTS',
    quantityLabel: 'Qty',
    footerFormatText: 'Job Card Format TIMCD JC-01',
  });
}

module.exports = {
  renderFpeRepairJobClosingForm,
};
