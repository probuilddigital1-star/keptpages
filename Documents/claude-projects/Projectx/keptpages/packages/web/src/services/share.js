import { api } from './api';

export const shareService = {
  createLink: (collectionId, permission = 'viewer') =>
    api.post('/share', { collectionId, permission }),
  getShared: (token) =>
    api.get(`/shared/${token}`, { isPublic: true }),
};
