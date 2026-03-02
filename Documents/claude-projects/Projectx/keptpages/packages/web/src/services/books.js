import { api } from './api';

export const booksService = {
  create: (collectionId) => api.post('/books', { collectionId }),
  get: (id) => api.get(`/books/${id}`),
  update: (id, data) => api.put(`/books/${id}`, data),
  generatePdf: (id) => api.post(`/books/${id}/generate`),
  order: (id, data) => api.post(`/books/${id}/order`, data),
  getStatus: (id) => api.get(`/books/${id}/status`),
};
