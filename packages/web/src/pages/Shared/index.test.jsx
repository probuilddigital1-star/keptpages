import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedCollection from './index';

// Mock the api named export
vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/services/api';

function renderWithRoute(token = 'test-token-123') {
  return render(
    <MemoryRouter initialEntries={[`/shared/${token}`]}>
      <Routes>
        <Route path="/shared/:token" element={<SharedCollection />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    // Never resolves — stays loading
    api.get.mockReturnValue(new Promise(() => {}));
    renderWithRoute();
    // The spinner should be rendered (a loading state)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('shows collection data after successful load', async () => {
    api.get.mockResolvedValue({
      collection: { name: 'Rose Family Recipes', description: 'Treasured recipes' },
      items: [
        {
          scan: {
            id: 'scan-1',
            title: 'Apple Pie',
            documentType: 'recipe',
            extractedData: { text: 'Delicious apple pie' },
            status: 'completed',
          },
        },
      ],
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Rose Family Recipes')).toBeInTheDocument();
    });
    expect(screen.getByText('Treasured recipes')).toBeInTheDocument();
    expect(screen.getByText('1 document')).toBeInTheDocument();
  });

  it('shows error state for invalid token', async () => {
    api.get.mockRejectedValue(new Error('This link is invalid or has expired.'));

    renderWithRoute('bad-token');

    await waitFor(() => {
      expect(screen.getByText('Collection Not Found')).toBeInTheDocument();
    });
    expect(screen.getByText(/this link is invalid/i)).toBeInTheDocument();
  });

  it('renders the CTA banner to join KeptPages', async () => {
    api.get.mockResolvedValue({
      collection: { name: 'My Collection' },
      items: [],
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText(/preserve your family/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /join keptpages/i })).toBeInTheDocument();
  });

  it('shows empty message when collection has no documents', async () => {
    api.get.mockResolvedValue({
      collection: { name: 'Empty Collection' },
      items: [],
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('This collection is empty.')).toBeInTheDocument();
    });
  });

  it('renders "Shared Collection" as default name when name is missing', async () => {
    api.get.mockResolvedValue({
      collection: {},
      items: [],
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Shared Collection')).toBeInTheDocument();
    });
  });

  it('shows Go to KeptPages button on error', async () => {
    api.get.mockRejectedValue(new Error('Expired'));

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to keptpages/i })).toBeInTheDocument();
    });
  });

  it('renders document badge with plural when multiple', async () => {
    api.get.mockResolvedValue({
      collection: { name: 'Test' },
      items: [
        { scan: { id: 's1', title: 'Doc 1', documentType: 'recipe', status: 'completed', extractedData: {} } },
        { scan: { id: 's2', title: 'Doc 2', documentType: 'letter', status: 'completed', extractedData: {} } },
      ],
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('2 documents')).toBeInTheDocument();
    });
  });
});
