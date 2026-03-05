import { api } from './api';

export const scansService = {
  upload: (file, onProgress) => api.upload('/scan', file, onProgress),
  process: (id) => api.post(`/scan/${id}/process`),
  reprocess: (id) => api.post(`/scan/${id}/reprocess`),
  get: (id) => api.get(`/scan/${id}`),
  update: (id, data) => api.put(`/scan/${id}`, data),
  list: () => api.get('/scan'),
};
