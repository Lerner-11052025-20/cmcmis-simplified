// ============================================================================
// src/lib/api/employees.js  —  Admin · Employees master HTTP wrappers
// ----------------------------------------------------------------------------

import { api } from '../api-client.js';

export async function fetchEmployeeList(params = {}, signal) {
  const r = await api.get('/admin/employees', { params, signal });
  return r.data.data;
}

export async function fetchEmployee(employeeId, signal) {
  const r = await api.get(`/admin/employees/${encodeURIComponent(employeeId)}`, { signal });
  return r.data.data;
}

export async function createEmployee(body) {
  const r = await api.post('/admin/employees', body);
  return r.data.data;
}

export async function updateEmployee(employeeId, body) {
  const r = await api.patch(`/admin/employees/${encodeURIComponent(employeeId)}`, body);
  return r.data.data;
}

export async function softDeleteEmployee(employeeId) {
  const r = await api.delete(`/admin/employees/${encodeURIComponent(employeeId)}`);
  return r.data.data;
}

export async function createAccount(employeeId, body = {}) {
  const r = await api.post(`/admin/employees/${encodeURIComponent(employeeId)}/create-account`, body);
  // Response contains { user_id, employee_id, role, initial_password }
  // initial_password is shown ONCE — caller must surface it to the SA.
  return r.data.data;
}
