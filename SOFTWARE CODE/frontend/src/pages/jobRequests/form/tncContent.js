// ============================================================================
// src/pages/jobRequests/form/tncContent.js  —  The 6 Terms & Conditions
// ----------------------------------------------------------------------------
// Pulled VERBATIM from the FINAL-DESC mockup screen. Edit-locked: any
// change here is a versioning event — bump TNC_VERSION below + send the
// new version to the BE on submit so the audit log records which set
// was actually accepted.
//
// Six checkboxes total. The Submit button on the JR form is disabled
// until ALL six are checked (the FE gate) AND the BE re-checks the
// boolean payload (defence in depth, BR-JR-06 / R10).
// ============================================================================

export const TNC_VERSION = 'v1';

/**
 * @typedef {Object} TermAndCondition
 * @property {number} index    1-based ordinal shown in the UI as "T&C N:"
 * @property {string} text     The full sentence the user agrees to
 */

/** @type {TermAndCondition[]} */
export const TERMS = [
  {
    index: 1,
    text: 'I confirm that all equipment details provided are accurate and complete to the best of my knowledge.',
  },
  {
    index: 2,
    text: 'I understand that the equipment must be delivered to the calibration lab in proper working condition with all necessary accessories.',
  },
  {
    index: 3,
    text: 'I acknowledge that the calibration timeline begins only after the equipment is received and inspected by the lab.',
  },
  {
    index: 4,
    text: 'I agree to coordinate with the assigned lab engineer for any additional information or testing requirements.',
  },
  {
    index: 5,
    text: 'I accept that equipment found to be damaged or beyond repair will be returned with appropriate documentation and recommendations.',
  },
  {
    index: 6,
    text: 'I understand that urgency requests will be handled based on lab capacity and must be justified with proper authorization.',
  },
];
