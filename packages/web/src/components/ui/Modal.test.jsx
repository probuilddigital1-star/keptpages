import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('returns null when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>Content</p>
      </Modal>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders content when open=true', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Visible">
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Title">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Backdrop test">
        <p>Content</p>
      </Modal>,
    );
    // The overlay is the outermost div with the fixed class.
    // Clicking the overlay (not the panel) should trigger onClose.
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Escape test">
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders close button that calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Close btn">
        <p>Content</p>
      </Modal>,
    );
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct size class (sm)', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Small" size="sm">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/max-w-container-sm/);
  });

  it('applies correct size class (md) by default', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Medium">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/max-w-container-md/);
  });

  it('applies correct size class (lg)', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Large" size="lg">
        <p>Content</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/max-w-container-lg/);
  });

  it('traps focus within the modal', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Focus trap">
        <button>First</button>
        <button>Second</button>
      </Modal>,
    );
    const first = screen.getByText('First');
    const closeBtn = screen.getByRole('button', { name: /close/i });
    const second = screen.getByText('Second');

    // Focus the last button, then Tab should cycle to Close (first focusable)
    second.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from close should cycle to last button
    closeBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(second);
  });

  it('focuses first focusable element on open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Auto-focus">
        <button>Focusable</button>
      </Modal>,
    );
    // Close button is the first focusable element in the panel
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('prevents body scroll when open', () => {
    const { unmount } = render(
      <Modal open={true} onClose={vi.fn()} title="Scroll lock">
        <p>Content</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    // Restores overflow when unmounting
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
