import { useCollectionsStore } from './collectionsStore';
import api from '@/services/api';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const initialState = {
  collections: [],
  loading: false,
  error: null,
};

describe('collectionsStore', () => {
  beforeEach(() => {
    useCollectionsStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty collections array and loading=false', () => {
      const state = useCollectionsStore.getState();
      expect(state.collections).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchCollections', () => {
    it('calls api.get and populates collections', async () => {
      const mockCollections = [
        { id: '1', name: 'Recipes' },
        { id: '2', name: 'Letters' },
      ];
      api.get.mockResolvedValue({ collections: mockCollections });

      await useCollectionsStore.getState().fetchCollections();

      expect(api.get).toHaveBeenCalledWith('/collections');
      expect(useCollectionsStore.getState().collections).toEqual(mockCollections);
    });

    it('sets loading=true during request and false after', async () => {
      let resolveGet;
      api.get.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));

      const fetchPromise = useCollectionsStore.getState().fetchCollections();
      expect(useCollectionsStore.getState().loading).toBe(true);

      resolveGet([]);
      await fetchPromise;
      expect(useCollectionsStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(
        useCollectionsStore.getState().fetchCollections()
      ).rejects.toThrow('Network error');

      const state = useCollectionsStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });
  });

  describe('createCollection', () => {
    it('calls api.post and appends to collections', async () => {
      useCollectionsStore.setState({
        collections: [{ id: '1', name: 'Existing' }],
      });
      const newCollection = { id: '2', name: 'New', createdAt: '2026-03-01T00:00:00Z' };
      api.post.mockResolvedValue(newCollection);

      const result = await useCollectionsStore.getState().createCollection({ name: 'New' });

      expect(api.post).toHaveBeenCalledWith('/collections', { name: 'New' });
      const expected = { id: '2', name: 'New', createdAt: '2026-03-01T00:00:00Z', itemCount: 0, coverImageUrl: null, updatedAt: '2026-03-01T00:00:00Z' };
      expect(result).toEqual(expected);
      expect(useCollectionsStore.getState().collections).toEqual([
        { id: '1', name: 'Existing' },
        expected,
      ]);
      expect(useCollectionsStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      api.post.mockRejectedValue(new Error('Create failed'));

      await expect(
        useCollectionsStore.getState().createCollection({ name: 'X' })
      ).rejects.toThrow('Create failed');

      expect(useCollectionsStore.getState().error).toBe('Create failed');
    });
  });

  describe('updateCollection', () => {
    it('calls api.put and updates the matching item', async () => {
      useCollectionsStore.setState({
        collections: [
          { id: '1', name: 'Old Name' },
          { id: '2', name: 'Other' },
        ],
      });
      api.put.mockResolvedValue({ id: '1', name: 'New Name' });

      const result = await useCollectionsStore.getState().updateCollection('1', { name: 'New Name' });

      expect(api.put).toHaveBeenCalledWith('/collections/1', { name: 'New Name' });
      expect(result).toEqual({ id: '1', name: 'New Name' });
      expect(useCollectionsStore.getState().collections).toEqual([
        { id: '1', name: 'New Name' },
        { id: '2', name: 'Other' },
      ]);
    });

    it('does not modify non-matching items', async () => {
      useCollectionsStore.setState({
        collections: [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ],
      });
      api.put.mockResolvedValue({ id: '1', name: 'Updated' });

      await useCollectionsStore.getState().updateCollection('1', { name: 'Updated' });

      expect(useCollectionsStore.getState().collections[1]).toEqual({ id: '2', name: 'B' });
    });

    it('sets error on failure', async () => {
      api.put.mockRejectedValue(new Error('Update failed'));

      await expect(
        useCollectionsStore.getState().updateCollection('1', {})
      ).rejects.toThrow('Update failed');

      expect(useCollectionsStore.getState().error).toBe('Update failed');
    });
  });

  describe('deleteCollection', () => {
    it('calls api.delete and removes from array', async () => {
      useCollectionsStore.setState({
        collections: [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ],
      });
      api.delete.mockResolvedValue();

      await useCollectionsStore.getState().deleteCollection('1');

      expect(api.delete).toHaveBeenCalledWith('/collections/1');
      expect(useCollectionsStore.getState().collections).toEqual([
        { id: '2', name: 'B' },
      ]);
      expect(useCollectionsStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      api.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(
        useCollectionsStore.getState().deleteCollection('1')
      ).rejects.toThrow('Delete failed');

      expect(useCollectionsStore.getState().error).toBe('Delete failed');
    });
  });
});
