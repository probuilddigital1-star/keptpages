import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CheckoutCancel from './index';

function renderWithRouter() {
  return render(
    <BrowserRouter>
      <CheckoutCancel />
    </BrowserRouter>
  );
}

describe('CheckoutCancel', () => {
  it('renders the KeptPages header', () => {
    renderWithRouter();
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders the Payment Cancelled heading', () => {
    renderWithRouter();
    expect(screen.getByText('Payment Cancelled')).toBeInTheDocument();
  });

  it('renders the reassurance message', () => {
    renderWithRouter();
    expect(screen.getByText(/no worries/i)).toBeInTheDocument();
    expect(screen.getByText(/your payment was not processed/i)).toBeInTheDocument();
  });

  it('renders the support message', () => {
    renderWithRouter();
    expect(screen.getByText(/if you ran into an issue/i)).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    renderWithRouter();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders Back to Dashboard button', () => {
    renderWithRouter();
    expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it('Try Again links to settings page', () => {
    renderWithRouter();
    const tryAgainLink = screen.getByRole('link', { name: /try again/i });
    expect(tryAgainLink).toHaveAttribute('href', '/app/settings');
  });

  it('Back to Dashboard links to app page', () => {
    renderWithRouter();
    const dashLink = screen.getByRole('link', { name: /back to dashboard/i });
    expect(dashLink).toHaveAttribute('href', '/app');
  });
});
