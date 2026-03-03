import { api } from './api';

export const shareService = {
  createLink: (collectionId, permissions = { canView: true, canDownload: false }) =>
    api.post('/share', { collectionId, permissions }),
  getShared: (token) =>
    api.get(`/shared/${token}`, { isPublic: true }),
};
