// ============================================================================
// src/modules/pdf/templates/fpeCalibrationJobClosingForm/fpeCalibrationJobClosingForm.js
// ----------------------------------------------------------------------------
// Dedicated Job Closing Form PDF for ONLY F&PE Calibration job cards.
// Uses the calibration closing-form layout from the reference PDF/LaTeX while
// keeping this category-specific entry point separate from T&ME templates.
// ============================================================================

'use strict';

const {
  renderTmeCalibrationJobClosingForm,
} = require('../tmeCalibrationJobClosingForm/tmeCalibrationJobClosingForm');

function renderFpeCalibrationJobClosingForm(payload, stream, options = {}) {
  renderTmeCalibrationJobClosingForm(payload, stream, {
    ...options,
    subtitle: 'F&PE CALIBRATION',
  });
}

module.exports = {
  renderFpeCalibrationJobClosingForm,
};
