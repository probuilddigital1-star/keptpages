import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutSuccess from './index';

function renderWithRoute(route = '/checkout/success') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CheckoutSuccess />
    </MemoryRouter>
  );
}

describe('CheckoutSuccess', () => {
  it('renders the KeptPages header', () => {
    renderWithRoute();
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders Welcome to Keeper Pass for default (keeper) type', () => {
    renderWithRoute('/checkout/success?type=keeper');
    expect(screen.getByText('Welcome to Keeper Pass!')).toBeInTheDocument();
  });

  it('renders the Keeper Pass active message for keeper', () => {
    renderWithRoute('/checkout/success?type=keeper');
    expect(screen.getByText(/your keeper pass is now active/i)).toBeInTheDocument();
  });

  it('renders Book Order Confirmed for book type', () => {
    renderWithRoute('/checkout/success?type=book');
    expect(screen.getByText('Book Order Confirmed!')).toBeInTheDocument();
  });

  it('renders the book order message for book type', () => {
    renderWithRoute('/checkout/success?type=book');
    expect(screen.getByText(/your book order has been placed/i)).toBeInTheDocument();
  });

  it('shows Go to Dashboard button', () => {
    renderWithRoute();
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
  });

  it('shows View Order Status button for book type', () => {
    renderWithRoute('/checkout/success?type=book');
    expect(screen.getByRole('button', { name: /view order status/i })).toBeInTheDocument();
  });

  it('does not show View Order Status for keeper type', () => {
    renderWithRoute('/checkout/success?type=keeper');
    expect(screen.queryByRole('button', { name: /view order status/i })).not.toBeInTheDocument();
  });

  it('shows session ID when provided', () => {
    renderWithRoute('/checkout/success?session_id=cs_test_abc123def456ghi789jkl');
    expect(screen.getByText(/session:/i)).toBeInTheDocument();
    expect(screen.getByText(/cs_test_abc123def456/i)).toBeInTheDocument();
  });

  it('shows feature list for keeper type', () => {
    renderWithRoute('/checkout/success?type=keeper');
    expect(screen.getByText('What you can do now')).toBeInTheDocument();
    expect(screen.getByText('Unlimited scans')).toBeInTheDocument();
    expect(screen.getByText('Unlimited collections')).toBeInTheDocument();
    expect(screen.getByText('Family sharing')).toBeInTheDocument();
    expect(screen.getByText('15% off all books')).toBeInTheDocument();
  });

  it('does not show feature list for book type', () => {
    renderWithRoute('/checkout/success?type=book');
    expect(screen.queryByText('What you can do now')).not.toBeInTheDocument();
  });

  it('defaults to keeper type when no type param is provided', () => {
    renderWithRoute('/checkout/success');
    expect(screen.getByText('Welcome to Keeper Pass!')).toBeInTheDocument();
  });
});
