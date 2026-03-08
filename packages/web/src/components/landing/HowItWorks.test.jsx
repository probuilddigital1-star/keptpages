import { render, screen } from '@testing-library/react';
import HowItWorks from './HowItWorks';

describe('HowItWorks', () => {
  it('renders the section label', () => {
    render(<HowItWorks />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/three steps/i)).toBeInTheDocument();
    expect(screen.getByText(/forever\./i)).toBeInTheDocument();
  });

  it('renders all three steps', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Snap a Photo')).toBeInTheDocument();
    expect(screen.getByText('AI Extracts Every Word')).toBeInTheDocument();
    expect(screen.getByText('Keep & Print')).toBeInTheDocument();
  });

  it('renders step numbers', () => {
    render(<HowItWorks />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/point your phone/i)).toBeInTheDocument();
    expect(screen.getByText(/our ai reads/i)).toBeInTheDocument();
    expect(screen.getByText(/edit, organize/i)).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<HowItWorks />);
    expect(screen.getByText(/no scanning hardware/i)).toBeInTheDocument();
  });
});
