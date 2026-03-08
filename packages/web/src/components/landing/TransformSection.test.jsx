import { render, screen } from '@testing-library/react';
import TransformSection from './TransformSection';

describe('TransformSection', () => {
  it('renders the section label', () => {
    render(<TransformSection />);
    expect(screen.getByText('The Magic')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<TransformSection />);
    expect(screen.getByText(/from faded ink/i)).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<TransformSection />);
    expect(screen.getByText(/see what happens when ai meets/i)).toBeInTheDocument();
  });

  it('renders the Original label on the before card', () => {
    render(<TransformSection />);
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('renders the Preserved label on the after card', () => {
    render(<TransformSection />);
    expect(screen.getByText('Preserved')).toBeInTheDocument();
  });

  it('renders the recipe title in both cards', () => {
    render(<TransformSection />);
    const titles = screen.getAllByText(/Grandma Rose/i);
    expect(titles.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the AI Magic label', () => {
    render(<TransformSection />);
    expect(screen.getByText('AI Magic')).toBeInTheDocument();
  });

  it('renders the ingredients section', () => {
    render(<TransformSection />);
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
  });

  it('renders the instructions section', () => {
    render(<TransformSection />);
    expect(screen.getByText('Instructions')).toBeInTheDocument();
  });

  it('renders the Family Note section', () => {
    render(<TransformSection />);
    expect(screen.getByText('Family Note')).toBeInTheDocument();
  });
});
