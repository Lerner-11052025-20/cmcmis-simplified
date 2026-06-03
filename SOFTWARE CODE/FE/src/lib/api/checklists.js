import { api } from '../api-client.js';

export async function fetchChecklists(params = {}, signal) {
  const r = await api.get('/checklists', { params, signal });
  return r.data.data.items;
}

export async function fetchChecklist(id, signal) {
  const r = await api.get(`/checklists/${encodeURIComponent(id)}`, { signal });
  return r.data.data.item;
}

export async function resolveChecklistEquipment(code, signal) {
  const r = await api.get('/checklists/equipment', { params: { code }, signal });
  return r.data.data.item;
}

export async function fetchChecklistTaskMaster(params = {}, signal) {
  const r = await api.get('/checklists/task-master', { params, signal });
  return r.data.data.items;
}

export async function createChecklist(body) {
  const r = await api.post('/checklists', body);
  return r.data.data.item;
}

export async function updateChecklist(id, body) {
  const r = await api.put(`/checklists/${encodeURIComponent(id)}`, body);
  return r.data.data.item;
}

export async function deleteChecklist(id) {
  const r = await api.delete(`/checklists/${encodeURIComponent(id)}`);
  return r.data.data;
}

export async function fetchChecklistsForEquipment(equipmentType, equipmentId, signal) {
  if (!equipmentType || !equipmentId) return [];
  const r = await api.get('/checklists/for-equipment', {
    params: { equipment_type: equipmentType, equipment_id: equipmentId },
    signal,
  });
  return r.data.data.items;
}

export async function applyChecklistToJobCard(jobCardId, checklistId) {
  const r = await api.post(`/checklists/job-cards/${encodeURIComponent(jobCardId)}/apply`, {
    checklist_id: checklistId,
  });
  return r.data.data;
}
