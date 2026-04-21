import api from './client';

export const getProxyHolders = () => api.get('/admin/proxy-holders').then(r => r.data);
export const addProxyHolder = (userId: string) =>
  api.post('/admin/proxy-holders', { userId }).then(r => r.data);
export const removeProxyHolder = (userId: string) =>
  api.delete(`/admin/proxy-holders/${userId}`).then(r => r.data);
export const getAuditLog = (params?: Record<string, string>) =>
  api.get('/admin/audit-log', { params }).then(r => r.data);
