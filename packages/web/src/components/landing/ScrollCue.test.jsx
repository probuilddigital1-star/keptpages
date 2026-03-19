import { render, screen, fireEvent, act } from '@testing-library/react';
import ScrollCue from './ScrollCue';

describe('ScrollCue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the cue text', () => {
    render(<ScrollCue />);
    expect(screen.getByText('See the magic below')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<ScrollCue />);
    const cue = screen.getByRole('button', { name: /scroll to see more/i });
    expect(cue).toBeInTheDocument();
    expect(cue).toHaveAttribute('tabindex', '0');
  });

  it('calls scrollIntoView on click', () => {
    const mockElement = { scrollIntoView: vi.fn() };
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

    render(<ScrollCue />);
    const cue = screen.getByRole('button', { name: /scroll to see more/i });
    fireEvent.click(cue);

    expect(document.getElementById).toHaveBeenCalledWith('trust-bar');
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('becomes visible after delay', () => {
    render(<ScrollCue />);
    const cue = screen.getByRole('button', { name: /scroll to see more/i });

    // Initially hidden
    expect(cue).toHaveClass('opacity-0');

    // After 2s delay
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(cue).toHaveClass('opacity-100');
  });

  it('hides when user scrolls past 80px', () => {
    render(<ScrollCue />);
    const cue = screen.getByRole('button', { name: /scroll to see more/i });

    // Make visible first
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(cue).toHaveClass('opacity-100');

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    fireEvent.scroll(window);

    expect(cue).toHaveClass('opacity-0');
  });
});
