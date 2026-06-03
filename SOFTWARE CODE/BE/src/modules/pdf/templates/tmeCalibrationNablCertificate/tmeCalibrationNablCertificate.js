// ============================================================================
// Dedicated NABL certificate wrapper for ONLY T&ME Calibration job cards.
// ============================================================================

'use strict';

const {
  renderTmeCalibrationCertificate,
} = require('../tmeCalibrationCertificateBase/tmeCalibrationCertificateBase');

function renderTmeCalibrationNablCertificate(payload, stream, options = {}) {
  renderTmeCalibrationCertificate(payload, stream, {
    ...options,
    variant: 'nabl',
    logo: 'nabl',
    headerLines: [
      'SAC(ISRO)-TIMCD-CALIBRATION LABORATORY',
      'SPACE APPLICATIONS CENTRE (SAC), ISRO',
      'BUILDING NO : 48-23',
      'DEPARTMENT OF SPACE',
      'GOVERNMENT OF INDIA',
      'AHMEDABAD : 380015',
      'TEL : (079)26914823',
    ],
  });
}

module.exports = {
  renderTmeCalibrationNablCertificate,
};
