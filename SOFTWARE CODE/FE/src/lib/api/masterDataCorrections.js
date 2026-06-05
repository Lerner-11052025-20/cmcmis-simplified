import { api } from '../api-client.js';

export async function fetchMasterDataCorrectionContext(params, signal) {
  const r = await api.get('/master-data-corrections/context', { params, signal });
  return r.data.data;
}

export async function createMasterDataCorrection(body) {
  const r = await api.post('/master-data-corrections', body);
  return r.data.data;
}

export async function fetchMasterDataCorrections(params = {}, signal) {
  const r = await api.get('/master-data-corrections', { params, signal });
  return r.data.data;
}

export async function approveMasterDataCorrection(id, body = {}) {
  const r = await api.post(`/master-data-corrections/${encodeURIComponent(id)}/approve`, body);
  return r.data.data;
}

export async function rejectMasterDataCorrection(id, body = {}) {
  const r = await api.post(`/master-data-corrections/${encodeURIComponent(id)}/reject`, body);
  return r.data.data;
}
