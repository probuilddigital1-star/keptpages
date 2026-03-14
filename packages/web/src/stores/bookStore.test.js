import { useBookStore } from './bookStore';
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
  book: null,
  template: 'classic',
  chapters: [],
  coverDesign: {
    title: '',
    subtitle: '',
    photo: null,
    colorScheme: 'default',
  },
  generatingPdf: false,
  loading: false,
};

describe('bookStore', () => {
  beforeEach(() => {
    useBookStore.setState(initialState);
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has book=null, template=classic, and default coverDesign', () => {
      const state = useBookStore.getState();
      expect(state.book).toBeNull();
      expect(state.template).toBe('classic');
      expect(state.chapters).toEqual([]);
      expect(state.coverDesign).toEqual({
        title: '',
        subtitle: '',
        photo: null,
        colorScheme: 'default',
      });
      expect(state.generatingPdf).toBe(false);
      expect(state.loading).toBe(false);
    });
  });

  describe('createBook', () => {
    it('calls api.post and sets book state', async () => {
      const mockBook = {
        id: 'book-1',
        template: 'modern',
        chapters: [{ id: 'ch1', title: 'Chapter 1' }],
        coverDesign: { title: 'My Book', subtitle: '', photo: null, colorScheme: 'blue' },
      };
      api.post.mockResolvedValue(mockBook);

      const result = await useBookStore.getState().createBook('col-1');

      expect(api.post).toHaveBeenCalledWith('/books', { collectionId: 'col-1' });
      expect(result).toEqual(mockBook);

      const state = useBookStore.getState();
      expect(state.book).toEqual(mockBook);
      expect(state.template).toBe('modern');
      expect(state.chapters).toEqual(mockBook.chapters);
      expect(state.coverDesign).toEqual(mockBook.coverDesign);
      expect(state.loading).toBe(false);
    });

    it('falls back to heritage template when book has no template', async () => {
      api.post.mockResolvedValue({ id: 'book-1' });

      await useBookStore.getState().createBook('col-1');

      expect(useBookStore.getState().template).toBe('heritage');
    });

    it('sets loading during request', async () => {
      let resolvePost;
      api.post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));

      const promise = useBookStore.getState().createBook('col-1');
      expect(useBookStore.getState().loading).toBe(true);

      resolvePost({ id: 'book-1' });
      await promise;
      expect(useBookStore.getState().loading).toBe(false);
    });

    it('sets loading=false on failure', async () => {
      api.post.mockRejectedValue(new Error('Create failed'));

      await expect(
        useBookStore.getState().createBook('col-1')
      ).rejects.toThrow('Create failed');

      expect(useBookStore.getState().loading).toBe(false);
    });
  });

  describe('loadBook', () => {
    it('calls api.get and sets book state', async () => {
      const mockBook = {
        id: 'book-1',
        template: 'vintage',
        chapters: [{ id: 'ch1' }],
        coverDesign: { title: 'Loaded', subtitle: 'Sub', photo: 'url', colorScheme: 'warm' },
      };
      api.get.mockResolvedValue(mockBook);

      const result = await useBookStore.getState().loadBook('book-1');

      expect(api.get).toHaveBeenCalledWith('/books/book-1');
      expect(result).toEqual(mockBook);

      const state = useBookStore.getState();
      expect(state.book).toEqual(mockBook);
      expect(state.template).toBe('vintage');
      expect(state.chapters).toEqual(mockBook.chapters);
      expect(state.coverDesign).toEqual(mockBook.coverDesign);
    });

    it('uses default coverDesign when book has none', async () => {
      api.get.mockResolvedValue({ id: 'book-1' });

      await useBookStore.getState().loadBook('book-1');

      // Falls back to the current coverDesign in state (the initial default)
      expect(useBookStore.getState().coverDesign).toEqual({
        title: '',
        subtitle: '',
        photo: null,
        colorScheme: 'default',
      });
    });

    it('sets loading=false on failure', async () => {
      api.get.mockRejectedValue(new Error('Not found'));

      await expect(
        useBookStore.getState().loadBook('bad-id')
      ).rejects.toThrow('Not found');

      expect(useBookStore.getState().loading).toBe(false);
    });
  });

  describe('updateTemplate', () => {
    it('updates template', () => {
      useBookStore.getState().updateTemplate('modern');

      expect(useBookStore.getState().template).toBe('modern');
    });
  });

  describe('updateCover', () => {
    it('merges cover design data with existing state', () => {
      useBookStore.getState().updateCover({ title: 'New Title' });

      expect(useBookStore.getState().coverDesign).toEqual({
        title: 'New Title',
        subtitle: '',
        photo: null,
        colorScheme: 'default',
      });
    });

    it('can update multiple fields at once', () => {
      useBookStore.getState().updateCover({
        title: 'Title',
        subtitle: 'Subtitle',
        colorScheme: 'blue',
      });

      const cover = useBookStore.getState().coverDesign;
      expect(cover.title).toBe('Title');
      expect(cover.subtitle).toBe('Subtitle');
      expect(cover.colorScheme).toBe('blue');
      expect(cover.photo).toBeNull();
    });

    it('preserves fields not included in the update', () => {
      useBookStore.setState({
        coverDesign: {
          title: 'Existing Title',
          subtitle: 'Existing Sub',
          photo: 'existing.jpg',
          colorScheme: 'warm',
        },
      });

      useBookStore.getState().updateCover({ photo: 'new.jpg' });

      expect(useBookStore.getState().coverDesign).toEqual({
        title: 'Existing Title',
        subtitle: 'Existing Sub',
        photo: 'new.jpg',
        colorScheme: 'warm',
      });
    });
  });

  describe('generatePdf', () => {
    it('returns immediately when POST returns ready', async () => {
      api.post.mockResolvedValue({ status: 'ready', pageCount: 12 });

      const result = await useBookStore.getState().generatePdf('book-1');

      expect(api.post).toHaveBeenCalledWith('/books/book-1/generate');
      expect(api.get).not.toHaveBeenCalled();
      expect(result.status).toBe('ready');
      expect(result.pageCount).toBe(12);
      expect(useBookStore.getState().generatingPdf).toBe(false);
    });

    it('polls status when POST returns generating', async () => {
      api.post.mockResolvedValue({ status: 'generating' });
      api.get.mockResolvedValue({ status: 'ready', pageCount: 12 });

      const result = await useBookStore.getState().generatePdf('book-1');

      expect(api.post).toHaveBeenCalledWith('/books/book-1/generate');
      expect(api.get).toHaveBeenCalledWith('/books/book-1/status');
      expect(result.status).toBe('ready');
      expect(useBookStore.getState().generatingPdf).toBe(false);
    });

    it('falls back to polling on network error', async () => {
      api.post.mockRejectedValue(new TypeError('Failed to fetch'));
      api.get.mockResolvedValue({ status: 'ready', pageCount: 8 });

      const result = await useBookStore.getState().generatePdf('book-1');

      expect(api.get).toHaveBeenCalledWith('/books/book-1/status');
      expect(result.status).toBe('ready');
      expect(useBookStore.getState().generatingPdf).toBe(false);
    });

    it('sets generatingPdf=false on failure', async () => {
      api.post.mockRejectedValue(new Error('PDF generation failed'));

      await expect(
        useBookStore.getState().generatePdf('book-1')
      ).rejects.toThrow('PDF generation failed');

      expect(useBookStore.getState().generatingPdf).toBe(false);
    });
  });

  describe('orderBook', () => {
    it('calls api.post with shipping address and default tier', async () => {
      const address = { street: '123 Main', city: 'Town', zip: '12345' };
      const mockOrder = { orderId: 'ord-1', status: 'placed' };
      api.post.mockResolvedValue(mockOrder);

      const result = await useBookStore.getState().orderBook('book-1', address);

      expect(api.post).toHaveBeenCalledWith('/books/book-1/order', {
        shippingAddress: address,
        quantity: 1,
        bookTier: 'premium',
        addons: [],
      });
      expect(result).toEqual(mockOrder);
      expect(useBookStore.getState().loading).toBe(false);
    });

    it('forwards bookTier and addons when provided', async () => {
      const address = { street: '123 Main', city: 'Town', zip: '12345' };
      api.post.mockResolvedValue({ orderId: 'ord-2' });

      await useBookStore.getState().orderBook('book-1', address, 2, 'heirloom', ['coil', 'glossy']);

      expect(api.post).toHaveBeenCalledWith('/books/book-1/order', {
        shippingAddress: address,
        quantity: 2,
        bookTier: 'heirloom',
        addons: ['coil', 'glossy'],
      });
    });

    it('sets loading=false on failure', async () => {
      api.post.mockRejectedValue(new Error('Order failed'));

      await expect(
        useBookStore.getState().orderBook('book-1', {})
      ).rejects.toThrow('Order failed');

      expect(useBookStore.getState().loading).toBe(false);
    });
  });

  describe('checkStatus', () => {
    it('updates book status when id matches', async () => {
      useBookStore.setState({
        book: { id: 'book-1', status: 'pending' },
      });
      api.get.mockResolvedValue({ status: 'shipped' });

      const result = await useBookStore.getState().checkStatus('book-1');

      expect(api.get).toHaveBeenCalledWith('/books/book-1/status');
      expect(result).toEqual({ status: 'shipped' });
      expect(useBookStore.getState().book.status).toBe('shipped');
    });

    it('does not update book when id does not match', async () => {
      useBookStore.setState({
        book: { id: 'book-1', status: 'pending' },
      });
      api.get.mockResolvedValue({ status: 'shipped' });

      await useBookStore.getState().checkStatus('book-2');

      expect(useBookStore.getState().book).toEqual({ id: 'book-1', status: 'pending' });
    });
  });
});
