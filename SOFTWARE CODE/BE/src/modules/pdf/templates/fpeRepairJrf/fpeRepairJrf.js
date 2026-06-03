// ============================================================================
// src/modules/pdf/templates/fpeRepairJrf/fpeRepairJrf.js
// ----------------------------------------------------------------------------
// Dedicated Job Request Form PDF for ONLY F&PE Repair / PM job requests.
// Uses the shared guarded JRF renderer with F&PE repair-specific labels from
// reports PDFs/latex/F&PE_Repair_JRF.tex.
// ============================================================================

'use strict';

const { renderTmeJrf } = require('../tmeCalibrationJrf/tmeCalibrationJrf');

function renderFpeRepairJrf(payload, stream) {
  renderTmeJrf(payload, stream, {
    kind: 'repair',
    title: 'JOB REQUEST OF F&PE FOR REPAIR / PM',
    subtitle: 'EFTF',
    equipmentLayout: 'fpe',
    equipmentSectionTitle: 'EQUIPMENT DETAILS',
    showAccessories: true,
    systemInformation: true,
    systemStatusValue: payload.remarks || payload.linked_job_status_display || '',
    projectLabel: 'Project',
    engineerLabel: 'Engineer In-Charge Signature',
    instructionTitle: 'Instruction for User',
    instructions: [
      'Please fill up a separate Job Card for each Equipment.',
    ],
    showReceipt: false,
  });
}

module.exports = {
  renderFpeRepairJrf,
};
