import { api } from './api';

export const shareService = {
  createLink: (collectionId, permissions = { canView: true, canDownload: false }) =>
    api.post('/share', { collectionId, permissions }),
  listLinks: (collectionId) =>
    api.get(`/share${collectionId ? `?collectionId=${collectionId}` : ''}`),
  deleteLink: (shareId) =>
    api.delete(`/share/${shareId}`),
  getShared: (token) =>
    api.get(`/shared/${token}`, { isPublic: true }),
};
