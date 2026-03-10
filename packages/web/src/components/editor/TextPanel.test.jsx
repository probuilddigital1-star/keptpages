import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextPanel from './TextPanel';

describe('TextPanel', () => {
  it('renders recipe fields by default', () => {
    render(<TextPanel data={{ title: 'Cookies' }} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Cookies')).toBeInTheDocument();
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('renders letter fields for letter document type', () => {
    const data = { title: 'Dear Mom', from: 'Alice', to: 'Mom', date: 'Jan 1', content: 'Hello' };
    render(<TextPanel data={data} onChange={vi.fn()} documentType="letter" />);
    expect(screen.getByDisplayValue('Dear Mom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jan 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
  });

  it('renders journal fields for journal document type', () => {
    render(<TextPanel data={{ title: 'My Day', date: 'June 1' }} onChange={vi.fn()} documentType="journal" />);
    expect(screen.getByDisplayValue('My Day')).toBeInTheDocument();
    expect(screen.getByDisplayValue('June 1')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders artwork fields for artwork document type', () => {
    render(<TextPanel data={{ title: 'Sunset' }} onChange={vi.fn()} documentType="artwork" />);
    expect(screen.getByDisplayValue('Sunset')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('calls onChange when title is updated', () => {
    const onChange = vi.fn();
    render(<TextPanel data={{ title: 'Old' }} onChange={onChange} documentType="recipe" />);
    fireEvent.change(screen.getByDisplayValue('Old'), { target: { value: 'New' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'New' }));
  });

  it('falls back to RecipeFields for unknown document type', () => {
    render(<TextPanel data={{}} onChange={vi.fn()} documentType="unknown-type" />);
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<TextPanel onChange={vi.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  describe('EditableList (within recipe fields)', () => {
    it('renders ingredient items', () => {
      render(
        <TextPanel
          data={{ ingredients: ['flour', 'sugar'] }}
          onChange={vi.fn()}
          documentType="recipe"
        />,
      );
      expect(screen.getByDisplayValue('flour')).toBeInTheDocument();
      expect(screen.getByDisplayValue('sugar')).toBeInTheDocument();
    });

    it('adds a new item when Add button is clicked', () => {
      const onChange = vi.fn();
      render(
        <TextPanel
          data={{ ingredients: ['flour'] }}
          onChange={onChange}
          documentType="recipe"
        />,
      );
      fireEvent.click(screen.getByText(/Add ingredient/i));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ ingredients: ['flour', ''] }),
      );
    });

    it('removes an item when remove button is clicked', () => {
      const onChange = vi.fn();
      render(
        <TextPanel
          data={{ ingredients: ['flour', 'sugar'] }}
          onChange={onChange}
          documentType="recipe"
        />,
      );
      const removeButtons = screen.getAllByLabelText('Remove item');
      fireEvent.click(removeButtons[0]);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ ingredients: ['sugar'] }),
      );
    });

    it('shows numbered steps for instructions', () => {
      render(
        <TextPanel
          data={{ instructions: ['Mix', 'Bake'] }}
          onChange={vi.fn()}
          documentType="recipe"
        />,
      );
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
    });
  });
});
