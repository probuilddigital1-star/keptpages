import { api } from './api';

export const collectionsService = {
  list: () => api.get('/collections'),
  create: (data) => api.post('/collections', data),
  get: (id) => api.get(`/collections/${id}`),
  update: (id, data) => api.put(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
  export: (id) => api.post(`/collections/${id}/export`),
  addItem: (id, scanId, position) =>
    api.post(`/collections/${id}/items`, { scanId, position }),
  removeItem: (id, itemId) =>
    api.delete(`/collections/${id}/items/${itemId}`),
  reorderItems: (id, orderedIds) =>
    api.put(`/collections/${id}/reorder`, { orderedIds }),
};
