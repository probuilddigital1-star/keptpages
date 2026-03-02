import { useDocumentsStore } from './documentsStore';
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
  documents: {},
  loading: false,
};

describe('documentsStore', () => {
  beforeEach(() => {
    useDocumentsStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty documents object and loading=false', () => {
      const state = useDocumentsStore.getState();
      expect(state.documents).toEqual({});
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchDocuments', () => {
    it('calls api.get and stores documents keyed by collectionId', async () => {
      const mockDocs = [
        { id: 'doc1', sortOrder: 0 },
        { id: 'doc2', sortOrder: 1 },
      ];
      api.get.mockResolvedValue(mockDocs);

      await useDocumentsStore.getState().fetchDocuments('col-1');

      expect(api.get).toHaveBeenCalledWith('/collections/col-1');
      expect(useDocumentsStore.getState().documents).toEqual({
        'col-1': mockDocs,
      });
    });

    it('preserves documents from other collections', async () => {
      useDocumentsStore.setState({
        documents: { 'col-1': [{ id: 'doc1', sortOrder: 0 }] },
      });
      api.get.mockResolvedValue([{ id: 'doc3', sortOrder: 0 }]);

      await useDocumentsStore.getState().fetchDocuments('col-2');

      const docs = useDocumentsStore.getState().documents;
      expect(docs['col-1']).toEqual([{ id: 'doc1', sortOrder: 0 }]);
      expect(docs['col-2']).toEqual([{ id: 'doc3', sortOrder: 0 }]);
    });

    it('sets loading during request', async () => {
      let resolveGet;
      api.get.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));

      const fetchPromise = useDocumentsStore.getState().fetchDocuments('col-1');
      expect(useDocumentsStore.getState().loading).toBe(true);

      resolveGet([]);
      await fetchPromise;
      expect(useDocumentsStore.getState().loading).toBe(false);
    });

    it('sets loading=false on failure', async () => {
      api.get.mockRejectedValue(new Error('Fetch failed'));

      await expect(
        useDocumentsStore.getState().fetchDocuments('col-1')
      ).rejects.toThrow('Fetch failed');

      expect(useDocumentsStore.getState().loading).toBe(false);
    });
  });

  describe('addToCollection', () => {
    it('calls api.post and appends document to local state', async () => {
      useDocumentsStore.setState({
        documents: { 'col-1': [{ id: 'doc1', sortOrder: 0 }] },
      });
      api.post.mockResolvedValue();

      await useDocumentsStore.getState().addToCollection('col-1', 'doc2', 1);

      expect(api.post).toHaveBeenCalledWith('/collections/col-1/documents', {
        documentId: 'doc2',
        sortOrder: 1,
      });
      expect(useDocumentsStore.getState().documents['col-1']).toEqual([
        { id: 'doc1', sortOrder: 0 },
        { id: 'doc2', sortOrder: 1 },
      ]);
    });

    it('creates collection entry if none exists', async () => {
      api.post.mockResolvedValue();

      await useDocumentsStore.getState().addToCollection('col-new', 'doc1', 0);

      expect(useDocumentsStore.getState().documents['col-new']).toEqual([
        { id: 'doc1', sortOrder: 0 },
      ]);
    });

    it('throws on failure', async () => {
      api.post.mockRejectedValue(new Error('Add failed'));

      await expect(
        useDocumentsStore.getState().addToCollection('col-1', 'doc1', 0)
      ).rejects.toThrow('Add failed');
    });
  });

  describe('removeFromCollection', () => {
    it('calls api.delete and removes document from local state', async () => {
      useDocumentsStore.setState({
        documents: {
          'col-1': [
            { id: 'doc1', sortOrder: 0 },
            { id: 'doc2', sortOrder: 1 },
          ],
        },
      });
      api.delete.mockResolvedValue();

      await useDocumentsStore.getState().removeFromCollection('col-1', 'doc1');

      expect(api.delete).toHaveBeenCalledWith('/collections/col-1/documents/doc1');
      expect(useDocumentsStore.getState().documents['col-1']).toEqual([
        { id: 'doc2', sortOrder: 1 },
      ]);
    });

    it('results in empty array when removing the only document', async () => {
      useDocumentsStore.setState({
        documents: { 'col-1': [{ id: 'doc1', sortOrder: 0 }] },
      });
      api.delete.mockResolvedValue();

      await useDocumentsStore.getState().removeFromCollection('col-1', 'doc1');

      expect(useDocumentsStore.getState().documents['col-1']).toEqual([]);
    });

    it('throws on failure', async () => {
      api.delete.mockRejectedValue(new Error('Remove failed'));

      await expect(
        useDocumentsStore.getState().removeFromCollection('col-1', 'doc1')
      ).rejects.toThrow('Remove failed');
    });
  });

  describe('reorderDocuments', () => {
    it('calls api.put and updates sort order', async () => {
      useDocumentsStore.setState({
        documents: {
          'col-1': [
            { id: 'doc1', sortOrder: 0, title: 'First' },
            { id: 'doc2', sortOrder: 1, title: 'Second' },
            { id: 'doc3', sortOrder: 2, title: 'Third' },
          ],
        },
      });
      api.put.mockResolvedValue();

      await useDocumentsStore.getState().reorderDocuments('col-1', ['doc3', 'doc1', 'doc2']);

      expect(api.put).toHaveBeenCalledWith('/collections/col-1/reorder', {
        orderedIds: ['doc3', 'doc1', 'doc2'],
      });

      const reordered = useDocumentsStore.getState().documents['col-1'];
      expect(reordered[0]).toEqual({ id: 'doc3', sortOrder: 0, title: 'Third' });
      expect(reordered[1]).toEqual({ id: 'doc1', sortOrder: 1, title: 'First' });
      expect(reordered[2]).toEqual({ id: 'doc2', sortOrder: 2, title: 'Second' });
    });

    it('throws on failure', async () => {
      api.put.mockRejectedValue(new Error('Reorder failed'));

      await expect(
        useDocumentsStore.getState().reorderDocuments('col-1', ['doc1'])
      ).rejects.toThrow('Reorder failed');
    });
  });
});
