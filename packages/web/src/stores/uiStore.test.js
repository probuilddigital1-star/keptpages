import { useUIStore } from './uiStore';

const initialState = {
  sidebarOpen: false,
  theme: 'light',
  toasts: [],
};

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState(initialState);
  });

  describe('initial state', () => {
    it('has sidebarOpen=false, theme=light, toasts=[]', () => {
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(false);
      expect(state.theme).toBe('light');
      expect(state.toasts).toEqual([]);
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebarOpen from false to true', () => {
      useUIStore.getState().toggleSidebar();

      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('toggles sidebarOpen from true to false', () => {
      useUIStore.setState({ sidebarOpen: true });

      useUIStore.getState().toggleSidebar();

      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggles back and forth correctly', () => {
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('addToast', () => {
    it('adds a toast to the toasts array with a generated id', () => {
      useUIStore.getState().addToast('Hello world');

      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe('Hello world');
      expect(toasts[0].variant).toBe('info');
      expect(toasts[0].id).toMatch(/^toast-/);
    });

    it('uses the provided variant', () => {
      useUIStore.getState().addToast('Error occurred', 'error');

      const toasts = useUIStore.getState().toasts;
      expect(toasts[0].variant).toBe('error');
    });

    it('defaults to info variant when none specified', () => {
      useUIStore.getState().addToast('Just info');

      expect(useUIStore.getState().toasts[0].variant).toBe('info');
    });

    it('returns the generated toast id', () => {
      const id = useUIStore.getState().addToast('Test');

      expect(id).toMatch(/^toast-/);
      expect(useUIStore.getState().toasts[0].id).toBe(id);
    });

    it('appends multiple toasts', () => {
      useUIStore.getState().addToast('First');
      useUIStore.getState().addToast('Second', 'success');
      useUIStore.getState().addToast('Third', 'error');

      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts[0].message).toBe('First');
      expect(toasts[1].message).toBe('Second');
      expect(toasts[2].message).toBe('Third');
    });

    it('generates unique ids for each toast', () => {
      const id1 = useUIStore.getState().addToast('A');
      const id2 = useUIStore.getState().addToast('B');

      expect(id1).not.toBe(id2);
    });
  });

  describe('removeToast', () => {
    it('removes a toast by id', () => {
      const id1 = useUIStore.getState().addToast('First');
      const id2 = useUIStore.getState().addToast('Second');

      useUIStore.getState().removeToast(id1);

      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id2);
      expect(toasts[0].message).toBe('Second');
    });

    it('does nothing when id does not exist', () => {
      useUIStore.getState().addToast('Existing');

      useUIStore.getState().removeToast('nonexistent-id');

      expect(useUIStore.getState().toasts).toHaveLength(1);
    });

    it('can remove all toasts one by one', () => {
      const id1 = useUIStore.getState().addToast('A');
      const id2 = useUIStore.getState().addToast('B');

      useUIStore.getState().removeToast(id1);
      useUIStore.getState().removeToast(id2);

      expect(useUIStore.getState().toasts).toEqual([]);
    });
  });

  describe('setTheme', () => {
    it('updates theme to dark', () => {
      useUIStore.getState().setTheme('dark');

      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('updates theme to light', () => {
      useUIStore.setState({ theme: 'dark' });

      useUIStore.getState().setTheme('light');

      expect(useUIStore.getState().theme).toBe('light');
    });

    it('accepts custom theme values', () => {
      useUIStore.getState().setTheme('system');

      expect(useUIStore.getState().theme).toBe('system');
    });
  });
});
