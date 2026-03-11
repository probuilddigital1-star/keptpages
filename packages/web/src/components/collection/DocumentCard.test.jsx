import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentCard from './DocumentCard';

// Mock the formatters utility
vi.mock('@/utils/formatters', () => ({
  truncate: vi.fn((str, max) => {
    if (!str) return '';
    if (str.length <= max) return str;
    return str.slice(0, max) + '\u2026';
  }),
}));

const baseDocument = {
  id: 'doc-456',
  title: 'Apple Pie Recipe',
  type: 'recipe',
  content: 'Mix flour, butter, and sugar together. Roll out the dough.',
  scan_url: null,
};

describe('DocumentCard', () => {
  it('renders document title', () => {
    render(<DocumentCard document={baseDocument} />);
    expect(screen.getByText('Apple Pie Recipe')).toBeInTheDocument();
  });

  it('renders "Untitled Document" when title is empty', () => {
    render(<DocumentCard document={{ ...baseDocument, title: '' }} />);
    expect(screen.getByText('Untitled Document')).toBeInTheDocument();
  });

  it('renders type badge with correct variant', () => {
    render(<DocumentCard document={baseDocument} />);
    expect(screen.getByText('recipe')).toBeInTheDocument();
  });

  it('renders type badge for letter type', () => {
    render(<DocumentCard document={{ ...baseDocument, type: 'letter' }} />);
    expect(screen.getByText('letter')).toBeInTheDocument();
  });

  it('renders content snippet', () => {
    render(<DocumentCard document={baseDocument} />);
    expect(
      screen.getByText(/mix flour, butter, and sugar/i)
    ).toBeInTheDocument();
  });

  it('shows action buttons when not readOnly', () => {
    render(
      <DocumentCard
        document={baseDocument}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByTitle('Move up')).toBeInTheDocument();
    expect(screen.getByTitle('Move down')).toBeInTheDocument();
    expect(screen.getByTitle('Remove from collection')).toBeInTheDocument();
  });

  it('hides action buttons when readOnly is true', () => {
    render(
      <DocumentCard
        document={baseDocument}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
        readOnly
      />
    );
    expect(screen.queryByTitle('Move up')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Move down')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Remove from collection')).not.toBeInTheDocument();
  });

  it('does not render action buttons when no callbacks provided', () => {
    render(<DocumentCard document={baseDocument} />);
    expect(screen.queryByTitle('Move up')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Move down')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Remove from collection')).not.toBeInTheDocument();
  });

  it('calls onMoveUp with document id when up button is clicked', async () => {
    const handleMoveUp = vi.fn();
    render(
      <DocumentCard
        document={baseDocument}
        onMoveUp={handleMoveUp}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Move up'));
    expect(handleMoveUp).toHaveBeenCalledWith('doc-456');
  });

  it('calls onMoveDown with document id when down button is clicked', async () => {
    const handleMoveDown = vi.fn();
    render(
      <DocumentCard
        document={baseDocument}
        onMoveDown={handleMoveDown}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Move down'));
    expect(handleMoveDown).toHaveBeenCalledWith('doc-456');
  });

  it('calls onRemove with document id when remove button is clicked', async () => {
    const handleRemove = vi.fn();
    render(
      <DocumentCard
        document={baseDocument}
        onRemove={handleRemove}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Remove from collection'));
    expect(handleRemove).toHaveBeenCalledWith('doc-456');
  });

  it('renders scan image when scan_url is provided', () => {
    render(
      <DocumentCard
        document={{ ...baseDocument, scan_url: 'https://example.com/scan.jpg' }}
      />
    );
    const img = screen.getByRole('img', { name: 'Apple Pie Recipe' });
    expect(img).toHaveAttribute('src', 'https://example.com/scan.jpg');
  });

  it('shows placeholder when no scan_url', () => {
    render(<DocumentCard document={baseDocument} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('action button container has responsive flex classes for mobile/desktop layout', () => {
    render(
      <DocumentCard
        document={baseDocument}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const container = screen.getByTestId('action-buttons');
    expect(container.className).toContain('flex-row');
    expect(container.className).toContain('md:flex-col');
  });
});
