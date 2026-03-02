import { useEditorStore } from './editorStore';
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
  originalImage: null,
  extractedData: null,
  editedData: null,
  confidence: 0,
  isDirty: false,
  saving: false,
};

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has all fields null/false/zero', () => {
      const state = useEditorStore.getState();
      expect(state.originalImage).toBeNull();
      expect(state.extractedData).toBeNull();
      expect(state.editedData).toBeNull();
      expect(state.confidence).toBe(0);
      expect(state.isDirty).toBe(false);
      expect(state.saving).toBe(false);
    });
  });

  describe('loadScan', () => {
    it('populates originalImage, extractedData, editedData, and confidence', () => {
      const scan = {
        imageUrl: 'https://example.com/img.jpg',
        extractedData: { title: 'My Recipe', author: 'Jane' },
        confidence: 0.92,
      };

      useEditorStore.getState().loadScan(scan);

      const state = useEditorStore.getState();
      expect(state.originalImage).toBe('https://example.com/img.jpg');
      expect(state.extractedData).toEqual({ title: 'My Recipe', author: 'Jane' });
      expect(state.editedData).toEqual({ title: 'My Recipe', author: 'Jane' });
      expect(state.confidence).toBe(0.92);
      expect(state.isDirty).toBe(false);
      expect(state.saving).toBe(false);
    });

    it('uses originalImage field as fallback', () => {
      const scan = {
        originalImage: 'https://example.com/original.jpg',
        extractedData: { title: 'Test' },
        confidence: 0.5,
      };

      useEditorStore.getState().loadScan(scan);

      expect(useEditorStore.getState().originalImage).toBe('https://example.com/original.jpg');
    });

    it('handles scan without extractedData', () => {
      const scan = { imageUrl: 'https://example.com/img.jpg' };

      useEditorStore.getState().loadScan(scan);

      const state = useEditorStore.getState();
      expect(state.extractedData).toBeNull();
      expect(state.editedData).toBeNull();
      expect(state.confidence).toBe(0);
    });

    it('creates a copy of extractedData for editedData (no shared reference)', () => {
      const extractedData = { title: 'Original' };
      useEditorStore.getState().loadScan({ extractedData, confidence: 1 });

      const state = useEditorStore.getState();
      expect(state.editedData).not.toBe(state.extractedData);
      expect(state.editedData).toEqual(state.extractedData);
    });
  });

  describe('updateField', () => {
    beforeEach(() => {
      useEditorStore.getState().loadScan({
        imageUrl: 'img.jpg',
        extractedData: { title: 'Original', author: 'Alice' },
        confidence: 0.9,
      });
    });

    it('updates editedData and sets isDirty=true when value differs', () => {
      useEditorStore.getState().updateField('title', 'Changed');

      const state = useEditorStore.getState();
      expect(state.editedData.title).toBe('Changed');
      expect(state.isDirty).toBe(true);
    });

    it('keeps isDirty=false when value matches extractedData', () => {
      // First change it
      useEditorStore.getState().updateField('title', 'Changed');
      expect(useEditorStore.getState().isDirty).toBe(true);

      // Then change it back to original
      useEditorStore.getState().updateField('title', 'Original');
      expect(useEditorStore.getState().isDirty).toBe(false);
    });

    it('adds new fields to editedData', () => {
      useEditorStore.getState().updateField('newField', 'new value');

      expect(useEditorStore.getState().editedData.newField).toBe('new value');
      expect(useEditorStore.getState().isDirty).toBe(true);
    });
  });

  describe('acceptChanges', () => {
    it('updates extractedData from editedData and sets isDirty=false', () => {
      useEditorStore.getState().loadScan({
        extractedData: { title: 'Original' },
        confidence: 1,
      });
      useEditorStore.getState().updateField('title', 'Edited');
      expect(useEditorStore.getState().isDirty).toBe(true);

      useEditorStore.getState().acceptChanges();

      const state = useEditorStore.getState();
      expect(state.extractedData).toEqual({ title: 'Edited' });
      expect(state.isDirty).toBe(false);
    });

    it('creates a copy so extractedData and editedData are not the same reference', () => {
      useEditorStore.getState().loadScan({
        extractedData: { title: 'T' },
        confidence: 1,
      });
      useEditorStore.getState().acceptChanges();

      const state = useEditorStore.getState();
      expect(state.extractedData).not.toBe(state.editedData);
    });
  });

  describe('revertChanges', () => {
    it('resets editedData to extractedData and sets isDirty=false', () => {
      useEditorStore.getState().loadScan({
        extractedData: { title: 'Original', author: 'Alice' },
        confidence: 0.9,
      });
      useEditorStore.getState().updateField('title', 'Changed');
      expect(useEditorStore.getState().isDirty).toBe(true);

      useEditorStore.getState().revertChanges();

      const state = useEditorStore.getState();
      expect(state.editedData).toEqual({ title: 'Original', author: 'Alice' });
      expect(state.isDirty).toBe(false);
    });

    it('handles null extractedData gracefully', () => {
      useEditorStore.setState({ extractedData: null, editedData: { title: 'X' }, isDirty: true });

      useEditorStore.getState().revertChanges();

      expect(useEditorStore.getState().editedData).toBeNull();
      expect(useEditorStore.getState().isDirty).toBe(false);
    });
  });

  describe('save', () => {
    it('calls api.put with edited data and updates state', async () => {
      useEditorStore.getState().loadScan({
        extractedData: { title: 'Original' },
        confidence: 0.9,
      });
      useEditorStore.getState().updateField('title', 'Saved Title');

      const mockResult = { id: 'scan-1', extractedData: { title: 'Saved Title' } };
      api.put.mockResolvedValue(mockResult);

      const result = await useEditorStore.getState().save('scan-1');

      expect(api.put).toHaveBeenCalledWith('/scan/scan-1', {
        extractedData: { title: 'Saved Title' },
      });
      expect(result).toEqual(mockResult);

      const state = useEditorStore.getState();
      expect(state.extractedData).toEqual({ title: 'Saved Title' });
      expect(state.isDirty).toBe(false);
      expect(state.saving).toBe(false);
    });

    it('sets saving=true during request and false after', async () => {
      useEditorStore.getState().loadScan({
        extractedData: { title: 'T' },
        confidence: 1,
      });

      let resolvePut;
      api.put.mockReturnValue(new Promise((resolve) => { resolvePut = resolve; }));

      const savePromise = useEditorStore.getState().save('scan-1');
      expect(useEditorStore.getState().saving).toBe(true);

      resolvePut({ id: 'scan-1' });
      await savePromise;
      expect(useEditorStore.getState().saving).toBe(false);
    });

    it('sets saving=false on failure', async () => {
      useEditorStore.getState().loadScan({
        extractedData: { title: 'T' },
        confidence: 1,
      });
      api.put.mockRejectedValue(new Error('Save failed'));

      await expect(
        useEditorStore.getState().save('scan-1')
      ).rejects.toThrow('Save failed');

      expect(useEditorStore.getState().saving).toBe(false);
    });
  });
});
