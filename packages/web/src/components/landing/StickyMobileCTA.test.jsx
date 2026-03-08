import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StickyMobileCTA from './StickyMobileCTA';

describe('StickyMobileCTA', () => {
  it('renders the KeptPages branding', () => {
    render(<StickyMobileCTA onCtaClick={vi.fn()} onLoginClick={vi.fn()} />);
    expect(screen.getByText('KeptPages')).toBeInTheDocument();
  });

  it('renders the free to start note', () => {
    render(<StickyMobileCTA onCtaClick={vi.fn()} onLoginClick={vi.fn()} />);
    expect(screen.getByText(/free to start/i)).toBeInTheDocument();
  });

  it('renders Log In and Get Started buttons', () => {
    render(<StickyMobileCTA onCtaClick={vi.fn()} onLoginClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('calls onCtaClick when Get Started is clicked', async () => {
    const onCta = vi.fn();
    const user = userEvent.setup();
    render(<StickyMobileCTA onCtaClick={onCta} onLoginClick={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it('calls onLoginClick when Log In is clicked', async () => {
    const onLogin = vi.fn();
    const user = userEvent.setup();
    render(<StickyMobileCTA onCtaClick={vi.fn()} onLoginClick={onLogin} />);

    await user.click(screen.getByRole('button', { name: /log in/i }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('starts hidden (translate-y-full) since scroll has not passed hero', () => {
    const { container } = render(
      <StickyMobileCTA onCtaClick={vi.fn()} onLoginClick={vi.fn()} />
    );
    const stickyDiv = container.firstChild;
    expect(stickyDiv.className).toContain('translate-y-full');
  });
});
