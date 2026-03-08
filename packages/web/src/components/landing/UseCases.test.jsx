import { render, screen } from '@testing-library/react';
import UseCases from './UseCases';

describe('UseCases', () => {
  it('renders the section label', () => {
    render(<UseCases />);
    expect(screen.getByText('Beyond Recipes')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<UseCases />);
    expect(screen.getByText(/more than/i)).toBeInTheDocument();
    expect(screen.getByText(/recipes\./i)).toBeInTheDocument();
  });

  it('renders all four use cases', () => {
    render(<UseCases />);
    expect(screen.getByText('Recipe Cards')).toBeInTheDocument();
    expect(screen.getByText('Old Letters')).toBeInTheDocument();
    expect(screen.getByText('Journals')).toBeInTheDocument();
    expect(screen.getByText("Children's Art")).toBeInTheDocument();
  });

  it('renders use case descriptions', () => {
    render(<UseCases />);
    expect(screen.getByText(/handwritten family recipes/i)).toBeInTheDocument();
    expect(screen.getByText(/love letters/i)).toBeInTheDocument();
    expect(screen.getByText(/diaries, travel logs/i)).toBeInTheDocument();
    expect(screen.getByText(/drawings, stories/i)).toBeInTheDocument();
  });

  it('renders emoji icons with accessible labels', () => {
    render(<UseCases />);
    expect(screen.getByRole('img', { name: 'Recipe card' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Letter' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Journal' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Art' })).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<UseCases />);
    expect(screen.getByText(/any page worth keeping/i)).toBeInTheDocument();
  });
});
