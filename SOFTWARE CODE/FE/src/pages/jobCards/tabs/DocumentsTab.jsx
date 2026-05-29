// ============================================================================
// pages/jobCards/tabs/DocumentsTab.jsx
// ----------------------------------------------------------------------------
// Tab 11 — Documents (file uploads).
//
// Engineer flow:
//   1. Choose a doc_type from the dropdown.
//   2. Pick a file (≤10 MB, allowed mimetypes).
//   3. Submit → multer places on disk, jc_documents row created.
//   4. List below shows active docs with download + delete actions.
//
// Delete rules: only the original uploader OR LIC/SA can delete.
// Soft-delete via deleted_at — file stays on disk for audit.
// ============================================================================

import { useState } from 'react';
import { Upload, Download, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { useJobCardDocuments, invalidateJobCardDocuments } from '../../../lib/hooks/useJobCardDocuments.js';
import { useAuth } from '../../../lib/auth-context.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import {
  uploadJobCardDocument, jobCardDocumentDownloadUrl, deleteJobCardDocument,
} from '../../../lib/api/jobCards.js';
import { DOC_TYPE_OPTIONS, DOC_TYPE_LABELS } from '../../../lib/schemas/jobCardSchemas.js';

const LIC_SA_ROLES = new Set([
  'LAB_IN_CHARGE',
  'SUPER_ADMIN',
  'TME_REPAIR_LAB_IN_CHARGE',
  'TME_CAL_LAB_IN_CHARGE',
  'FPE_REPAIR_LAB_IN_CHARGE',
  'FPE_CAL_LAB_IN_CHARGE',
]);
const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(b) {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentsTab({ jc, canWrite, invalidateAll }) {
  const { user } = useAuth();
  const { items: docs, loading, refetch } = useJobCardDocuments(jc.section_job_no);
  const [docType, setDocType] = useState('OTHER');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpload() {
    if (!file) { setError('Please pick a file first.'); return; }
    if (file.size > MAX_BYTES) { setError(`File exceeds the 10 MB limit (got ${formatBytes(file.size)}).`); return; }
    setError(null);
    setUploading(true);
    try {
      const r = await uploadJobCardDocument(jc.section_job_no, file, docType);
      setFile(null);
      // Reset the file input — clearer than leaving the old filename visible.
      const el = document.getElementById('jc-doc-file');
      if (el) el.value = '';
      invalidateJobCardDocuments(jc.section_job_no);
      refetch();
      if (r.near_limit) {
        // Q-7 soft warning at 40 active docs.
        setError('You are approaching the 50-document limit per job card.');
      }
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      const code = e?.response?.data?.error?.code;
      setError(`Upload failed: ${msg || 'Unknown error'}${code ? ` (${code})` : ''}`);
    } finally {
      setUploading(false);
    }
  }

  function canDelete(doc) {
    const isUploader = doc.uploaded_by_employee_id === user?.sub;
    const licSa = LIC_SA_ROLES.has(user?.role);
    return canWrite && (isUploader || licSa);
  }

  async function handleDelete(doc) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return;
    try {
      await deleteJobCardDocument(jc.section_job_no, doc.id);
      invalidateJobCardDocuments(jc.section_job_no);
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      // eslint-disable-next-line no-alert
      alert('Could not delete: ' + (msg || 'Unknown error'));
    }
  }

  const activeCount = docs?.length || 0;
  const nearLimit = activeCount >= 40;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Documents</h2>
        <p className="text-xs text-ink-soft mt-0.5">
          Upload calibration certificates, photos, vendor invoices, and other supporting documents.
        </p>
      </div>

      {/* Upload widget */}
      <div className="rounded-lg border border-border bg-base p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="jc-doc-type" className="block text-xs font-medium text-ink mb-1">Document Type</label>
            <Select
              id="jc-doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={!canWrite || uploading}
            >
              {DOC_TYPE_OPTIONS.map((v) => (
                <option key={v} value={v}>{DOC_TYPE_LABELS[v]}</option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="jc-doc-file" className="block text-xs font-medium text-ink mb-1">Pick a file (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG - max 10 MB)</label>
            <input
              id="jc-doc-file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={!canWrite || uploading}
              className="block w-full text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-accent file:text-white file:px-3 file:py-1.5 file:cursor-pointer hover:file:bg-accent-hover disabled:opacity-50"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          {error ? (
            <div role="alert" className="text-xs text-danger flex items-center gap-1">
              <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
              {error}
            </div>
          ) : (
            <div className="text-xs text-ink-soft">
              {activeCount} document{activeCount === 1 ? '' : 's'} on this job card
              {nearLimit ? <span className="text-amber-700 font-medium ml-1">(approaching 50 limit)</span> : null}
            </div>
          )}
          <Button variant="primary" size="md" onClick={handleUpload} disabled={!canWrite || !file || uploading}>
            <Upload size={14} strokeWidth={1.75} aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>

      {/* Document list */}
      <div>
        {loading && !docs ? (
          <div className="text-xs text-ink-soft">Loading documents…</div>
        ) : activeCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-ink-soft">
            No documents uploaded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-2.5">
                <FileText size={18} strokeWidth={1.75} className="text-accent shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{d.filename}</div>
                  <div className="text-xs text-ink-soft">
                    {DOC_TYPE_LABELS[d.doc_type] || d.doc_type} · {formatBytes(d.size_bytes)} ·{' '}
                    Uploaded by {d.uploaded_by_employee_id}
                  </div>
                </div>
                <a
                  href={jobCardDocumentDownloadUrl(jc.section_job_no, d.id)}
                  className="p-1.5 text-accent hover:bg-accent/10 rounded-md"
                  title="Download"
                  aria-label={`Download ${d.filename}`}
                >
                  <Download size={14} strokeWidth={1.75} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(d)}
                  disabled={!canDelete(d)}
                  className="p-1.5 text-ink-soft hover:text-danger disabled:opacity-30"
                  title={canDelete(d) ? 'Delete' : 'Only the uploader or LIC/SA can delete'}
                  aria-label="Delete document"
                >
                  <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
