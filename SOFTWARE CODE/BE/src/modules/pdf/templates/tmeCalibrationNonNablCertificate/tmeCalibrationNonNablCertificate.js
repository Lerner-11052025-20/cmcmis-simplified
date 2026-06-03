// ============================================================================
// Dedicated Non-NABL certificate wrapper for ONLY T&ME Calibration job cards.
// ============================================================================

'use strict';

const {
  renderTmeCalibrationCertificate,
} = require('../tmeCalibrationCertificateBase/tmeCalibrationCertificateBase');

function renderTmeCalibrationNonNablCertificate(payload, stream, options = {}) {
  renderTmeCalibrationCertificate(payload, stream, {
    ...options,
    variant: 'non-nabl',
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
  renderTmeCalibrationNonNablCertificate,
};
