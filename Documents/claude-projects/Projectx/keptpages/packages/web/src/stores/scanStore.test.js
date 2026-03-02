import { useScanStore } from './scanStore';
import api from '@/services/api';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

const initialState = {
  currentScan: null,
  uploadProgress: 0,
  processing: false,
  scans: [],
};

describe('scanStore', () => {
  beforeEach(() => {
    useScanStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has currentScan=null, uploadProgress=0, processing=false, scans=[]', () => {
      const state = useScanStore.getState();
      expect(state.currentScan).toBeNull();
      expect(state.uploadProgress).toBe(0);
      expect(state.processing).toBe(false);
      expect(state.scans).toEqual([]);
    });
  });

  describe('uploadScan', () => {
    it('calls api.upload and tracks progress', async () => {
      const mockScan = { id: 'scan-1', status: 'uploaded' };
      api.upload.mockImplementation((url, file, onProgress) => {
        onProgress(25);
        onProgress(50);
        onProgress(75);
        return Promise.resolve(mockScan);
      });

      const onProgress = vi.fn();
      const result = await useScanStore.getState().uploadScan('file.jpg', onProgress);

      expect(api.upload).toHaveBeenCalledWith('/scan', 'file.jpg', expect.any(Function));
      expect(onProgress).toHaveBeenCalledWith(25);
      expect(onProgress).toHaveBeenCalledWith(50);
      expect(onProgress).toHaveBeenCalledWith(75);
      expect(result).toEqual(mockScan);

      const state = useScanStore.getState();
      expect(state.currentScan).toEqual(mockScan);
      expect(state.uploadProgress).toBe(100);
      expect(state.scans).toEqual([mockScan]);
    });

    it('appends to existing scans array', async () => {
      const existingScan = { id: 'scan-0', status: 'done' };
      useScanStore.setState({ scans: [existingScan] });

      const newScan = { id: 'scan-1', status: 'uploaded' };
      api.upload.mockResolvedValue(newScan);

      await useScanStore.getState().uploadScan('file.jpg');

      expect(useScanStore.getState().scans).toEqual([existingScan, newScan]);
    });

    it('resets uploadProgress to 0 on failure', async () => {
      api.upload.mockRejectedValue(new Error('Upload failed'));

      await expect(
        useScanStore.getState().uploadScan('file.jpg')
      ).rejects.toThrow('Upload failed');

      expect(useScanStore.getState().uploadProgress).toBe(0);
    });

    it('works without onProgress callback', async () => {
      api.upload.mockImplementation((url, file, onProgress) => {
        onProgress(50);
        return Promise.resolve({ id: 'scan-1' });
      });

      // Should not throw when onProgress is undefined
      await useScanStore.getState().uploadScan('file.jpg');
      expect(useScanStore.getState().uploadProgress).toBe(100);
    });
  });

  describe('processScan', () => {
    it('calls api.post and sets processing=true then false', async () => {
      useScanStore.setState({
        scans: [{ id: 'scan-1', status: 'uploaded' }],
      });

      let resolveProcess;
      api.post.mockReturnValue(new Promise((resolve) => { resolveProcess = resolve; }));

      const processPromise = useScanStore.getState().processScan('scan-1');
      expect(useScanStore.getState().processing).toBe(true);

      const result = { id: 'scan-1', status: 'processed', extractedData: {} };
      resolveProcess(result);
      await processPromise;

      expect(api.post).toHaveBeenCalledWith('/scan/scan-1/process');
      const state = useScanStore.getState();
      expect(state.processing).toBe(false);
      expect(state.currentScan).toEqual(result);
      expect(state.scans).toEqual([result]);
    });

    it('sets processing=false on failure', async () => {
      api.post.mockRejectedValue(new Error('Process failed'));

      await expect(
        useScanStore.getState().processScan('scan-1')
      ).rejects.toThrow('Process failed');

      expect(useScanStore.getState().processing).toBe(false);
    });
  });

  describe('reprocessScan', () => {
    it('calls api.post with reprocess endpoint', async () => {
      useScanStore.setState({
        scans: [{ id: 'scan-1', status: 'processed' }],
      });
      const reprocessed = { id: 'scan-1', status: 'reprocessed' };
      api.post.mockResolvedValue(reprocessed);

      const result = await useScanStore.getState().reprocessScan('scan-1');

      expect(api.post).toHaveBeenCalledWith('/scan/scan-1/reprocess');
      expect(result).toEqual(reprocessed);
      expect(useScanStore.getState().currentScan).toEqual(reprocessed);
      expect(useScanStore.getState().processing).toBe(false);
    });

    it('sets processing=true during request', async () => {
      let resolvePost;
      api.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));

      const promise = useScanStore.getState().reprocessScan('scan-1');
      expect(useScanStore.getState().processing).toBe(true);

      resolvePost({ id: 'scan-1' });
      await promise;
      expect(useScanStore.getState().processing).toBe(false);
    });

    it('sets processing=false on failure', async () => {
      api.post.mockRejectedValue(new Error('Reprocess failed'));

      await expect(
        useScanStore.getState().reprocessScan('scan-1')
      ).rejects.toThrow('Reprocess failed');

      expect(useScanStore.getState().processing).toBe(false);
    });
  });

  describe('getScan', () => {
    it('calls api.get and sets currentScan', async () => {
      const scan = { id: 'scan-1', status: 'processed' };
      api.get.mockResolvedValue(scan);

      const result = await useScanStore.getState().getScan('scan-1');

      expect(api.get).toHaveBeenCalledWith('/scan/scan-1');
      expect(result).toEqual(scan);
      expect(useScanStore.getState().currentScan).toEqual(scan);
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValue(new Error('Not found'));

      await expect(
        useScanStore.getState().getScan('bad-id')
      ).rejects.toThrow('Not found');
    });
  });

  describe('updateScan', () => {
    it('calls api.put and updates currentScan when id matches', async () => {
      useScanStore.setState({
        currentScan: { id: 'scan-1', title: 'Old' },
        scans: [{ id: 'scan-1', title: 'Old' }],
      });
      const updated = { id: 'scan-1', title: 'New' };
      api.put.mockResolvedValue(updated);

      const result = await useScanStore.getState().updateScan('scan-1', { title: 'New' });

      expect(api.put).toHaveBeenCalledWith('/scan/scan-1', { title: 'New' });
      expect(result).toEqual(updated);
      expect(useScanStore.getState().currentScan).toEqual(updated);
      expect(useScanStore.getState().scans).toEqual([updated]);
    });

    it('does not overwrite currentScan when updating a different scan', async () => {
      useScanStore.setState({
        currentScan: { id: 'scan-1', title: 'Current' },
        scans: [
          { id: 'scan-1', title: 'Current' },
          { id: 'scan-2', title: 'Other' },
        ],
      });
      const updated = { id: 'scan-2', title: 'Updated Other' };
      api.put.mockResolvedValue(updated);

      await useScanStore.getState().updateScan('scan-2', { title: 'Updated Other' });

      expect(useScanStore.getState().currentScan).toEqual({ id: 'scan-1', title: 'Current' });
      expect(useScanStore.getState().scans[1]).toEqual(updated);
    });
  });

  describe('reset', () => {
    it('clears currentScan, uploadProgress, and processing', () => {
      useScanStore.setState({
        currentScan: { id: 'scan-1' },
        uploadProgress: 75,
        processing: true,
        scans: [{ id: 'scan-1' }],
      });

      useScanStore.getState().reset();

      const state = useScanStore.getState();
      expect(state.currentScan).toBeNull();
      expect(state.uploadProgress).toBe(0);
      expect(state.processing).toBe(false);
      // reset() does not clear the scans array per implementation
      expect(state.scans).toEqual([{ id: 'scan-1' }]);
    });
  });
});
