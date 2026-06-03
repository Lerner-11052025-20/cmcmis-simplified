// ============================================================================
// Dedicated combined certificate wrapper for ONLY T&ME Calibration job cards.
// Includes NABL, NON-NABL, BOTH, and custom task rows.
// ============================================================================

'use strict';

const {
  renderTmeCalibrationCertificate,
} = require('../tmeCalibrationCertificateBase/tmeCalibrationCertificateBase');

function renderTmeCalibrationCombinedCertificate(payload, stream, options = {}) {
  renderTmeCalibrationCertificate(payload, stream, {
    ...options,
    variant: 'all',
    logo: 'sac',
    headerLines: [
      'SAC(ISRO)-TIMCD CALIBRATION LABORATORY',
      'SPACE APPLICATIONS CENTRE (SAC)',
      'INDIAN SPACE RESEARCH ORGANISATION',
      'DEPARTMENT OF SPACE',
      'GOVERNMENT OF INDIA',
      'AHMEDABAD - 380015',
    ],
  });
}

module.exports = {
  renderTmeCalibrationCombinedCertificate,
};
