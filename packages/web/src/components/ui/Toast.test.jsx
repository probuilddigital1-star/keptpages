import { render, screen, fireEvent, act } from '@testing-library/react';
import { toast, ToastContainer, useToastStore } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    // Reset the store between tests
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toast() function adds a toast to the store', () => {
    toast('Saved successfully');
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Saved successfully');
    expect(toasts[0].variant).toBe('success');
  });

  it('toast() with explicit variant adds correct variant', () => {
    toast('Something failed', 'error');
    const { toasts } = useToastStore.getState();
    expect(toasts[0].variant).toBe('error');
  });

  it('ToastContainer renders toasts from store', () => {
    toast('Hello world');
    render(<ToastContainer />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders success variant with sage styles', () => {
    toast('Saved!', 'success');
    render(<ToastContainer />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toMatch(/bg-sage-light/);
    expect(alert.className).toMatch(/text-sage/);
  });

  it('renders error variant with red styles', () => {
    toast('Error!', 'error');
    render(<ToastContainer />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toMatch(/bg-red-50/);
    expect(alert.className).toMatch(/text-red-600/);
  });

  it('renders info variant with terracotta styles', () => {
    toast('Info note', 'info');
    render(<ToastContainer />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toMatch(/bg-terracotta-light/);
    expect(alert.className).toMatch(/text-terracotta/);
  });

  it('auto-dismisses after timeout', () => {
    toast('Temporary');
    render(<ToastContainer />);
    expect(screen.getByText('Temporary')).toBeInTheDocument();

    // The toast auto-dismisses after 4000ms, then exit animation takes 200ms
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
  });

  it('dismiss button removes toast', () => {
    toast('Dismissable');
    render(<ToastContainer />);
    expect(screen.getByText('Dismissable')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    // Wait for exit animation (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Dismissable')).not.toBeInTheDocument();
  });
});
