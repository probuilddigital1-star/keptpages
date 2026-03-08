import { render, screen } from '@testing-library/react';
import TrustBar from './TrustBar';

describe('TrustBar', () => {
  it('renders the accuracy trust item', () => {
    render(<TrustBar />);
    expect(screen.getByText('95%+ Accuracy')).toBeInTheDocument();
  });

  it('renders the private & secure trust item', () => {
    render(<TrustBar />);
    expect(screen.getByText('Private & Secure')).toBeInTheDocument();
  });

  it('renders the free to start trust item', () => {
    render(<TrustBar />);
    expect(screen.getByText('Free to Start')).toBeInTheDocument();
  });

  it('renders exactly 3 trust items', () => {
    const { container } = render(<TrustBar />);
    // Each trust item has the text plus an SVG icon
    const items = container.querySelectorAll('svg');
    expect(items.length).toBe(3);
  });
});
