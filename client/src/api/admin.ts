import api from './client';

export const getAuditLog = (params?: Record<string, string>) =>
  api.get('/admin/audit-log', { params }).then(r => r.data);
