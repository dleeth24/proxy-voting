import api from './client';

export const getUsers = () => api.get('/users').then(r => r.data);
export const getPartners = () => api.get('/users/partners').then(r => r.data);
export const getMe = () => api.get('/users/me').then(r => r.data);
export const setStandingProxy = (proxyId: string) =>
  api.put('/users/me/standing-proxy', { proxyId }).then(r => r.data);
export const removeStandingProxy = () => api.delete('/users/me/standing-proxy').then(r => r.data);
