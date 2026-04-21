import api from './client';

export const getBallots = () => api.get('/ballots').then(r => r.data);
export const getBallot = (id: string) => api.get(`/ballots/${id}`).then(r => r.data);
export const createBallot = (data: unknown) => api.post('/ballots', data).then(r => r.data);
export const updateBallot = (id: string, data: unknown) => api.put(`/ballots/${id}`, data).then(r => r.data);
export const openBallot = (id: string) => api.post(`/ballots/${id}/open`).then(r => r.data);
export const closeBallot = (id: string) => api.post(`/ballots/${id}/close`).then(r => r.data);
export const getBallotResults = (id: string) => api.get(`/ballots/${id}/results`).then(r => r.data);
export const getMyVote = (id: string) => api.get(`/ballots/${id}/my-vote`).then(r => r.data);
export const getEffectiveProxy = (id: string) => api.get(`/ballots/${id}/effective-proxy`).then(r => r.data);
export const castVote = (id: string, optionId: string) => api.post(`/ballots/${id}/vote`, { optionId }).then(r => r.data);
export const castProxyVote = (id: string, principalId: string, optionId: string) =>
  api.post(`/ballots/${id}/proxy-vote`, { principalId, optionId }).then(r => r.data);
export const setProxyOverride = (id: string, proxyId: string) =>
  api.put(`/ballots/${id}/proxy-override`, { proxyId }).then(r => r.data);
export const removeProxyOverride = (id: string) =>
  api.delete(`/ballots/${id}/proxy-override`).then(r => r.data);
export const getProxyPrincipals = (id: string) =>
  api.get(`/ballots/${id}/proxy-principals`).then(r => r.data);
