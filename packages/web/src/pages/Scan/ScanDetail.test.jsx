import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '@/test/helpers';
import ScanDetail from './ScanDetail';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetScan = vi.fn();
const mockReprocessScan = vi.fn();
const mockLoadScan = vi.fn();
const mockUpdateField = vi.fn();
const mockSave = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-scan-id' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/stores/scanStore', () => ({
  useScanStore: vi.fn(),
}));

vi.mock('@/stores/editorStore', () => {
  const fn = vi.fn();
  fn.getState = vi.fn(() => ({ originalImage: null }));
  fn.setState = vi.fn();
  return { useEditorStore: fn };
});

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn().mockRejectedValue(new Error('not available')),
    upload: vi.fn(),
  },
}));

vi.mock('@/components/collection/CollectionPickerModal', () => ({
  CollectionPickerModal: () => null,
}));

// Mock the editor sub-components to simplify assertions
vi.mock('@/components/editor/PhotoPanel', () => ({
  default: ({ imageUrl }) => (
    <div data-testid="photo-panel">{imageUrl ? 'Image loaded' : 'No image'}</div>
  ),
}));

vi.mock('@/components/editor/TextPanel', () => ({
  default: ({ data, documentType }) => (
    <div data-testid="text-panel">
      <span data-testid="doc-type">{documentType}</span>
      <span data-testid="doc-data">{JSON.stringify(data)}</span>
    </div>
  ),
}));

import { useScanStore } from '@/stores/scanStore';
import { useEditorStore } from '@/stores/editorStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupScanStore(overrides = {}) {
  const defaults = {
    getScan: mockGetScan,
    reprocessScan: mockReprocessScan,
    processing: false,
  };

  const merged = { ...defaults, ...overrides };
  useScanStore.mockReturnValue(merged);
}

function setupEditorStore(overrides = {}) {
  const defaults = {
    originalImage: 'https://example.com/scan.jpg',
    editedData: { title: 'Test Recipe' },
    confidence: 0.85,
    isDirty: false,
    saving: false,
    loadScan: mockLoadScan,
    updateField: mockUpdateField,
    save: mockSave,
  };

  const merged = { ...defaults, ...overrides };
  useEditorStore.mockReturnValue(merged);
}

const mockScanData = {
  id: 'test-scan-id',
  imageUrl: 'https://example.com/scan.jpg',
  extractedData: { title: 'Test Recipe', documentType: 'recipe' },
  confidence: 0.85,
};

function renderScanDetail() {
  return renderWithRouter(<ScanDetail />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScanDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScan.mockResolvedValue(mockScanData);
    setupScanStore();
    setupEditorStore();
  });

  it('renders photo panel and text panel', async () => {
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByTestId('photo-panel')).toBeInTheDocument();
    });
    expect(screen.getByTestId('text-panel')).toBeInTheDocument();
  });

  it('shows confidence badge', async () => {
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/(85%)/)).toBeInTheDocument();
  });

  it('shows medium confidence badge', async () => {
    setupEditorStore({ confidence: 0.6 });
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByText(/medium confidence/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/(60%)/)).toBeInTheDocument();
  });

  it('shows low confidence badge', async () => {
    setupEditorStore({ confidence: 0.3 });
    renderScanDetail();

    await waitFor(() => {
      // Badge and warning banner both contain "low confidence" text, use getAllBy
      const matches = screen.getAllByText(/low confidence/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/(30%)/)).toBeInTheDocument();
  });

  it('shows reprocess button when confidence is low (< 0.7)', async () => {
    setupEditorStore({ confidence: 0.4 });
    renderScanDetail();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /reprocess with ai/i }),
      ).toBeInTheDocument();
    });
  });

  it('does not show reprocess button when confidence is high (>= 0.7)', async () => {
    setupEditorStore({ confidence: 0.85 });
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByTestId('photo-panel')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /reprocess with ai/i }),
    ).not.toBeInTheDocument();
  });

  it('renders save button', async () => {
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    });
  });

  it('save button is disabled when there are no unsaved changes', async () => {
    setupEditorStore({ isDirty: false });
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });
  });

  it('save button is enabled when there are unsaved changes', async () => {
    setupEditorStore({ isDirty: true });
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
    });
  });

  it('shows document type selector', async () => {
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByText('Document Type')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Recipe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Letter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Journal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Artwork' })).toBeInTheDocument();
  });

  it('calls getScan on mount with the scan id from params', () => {
    renderScanDetail();
    expect(mockGetScan).toHaveBeenCalledWith('test-scan-id');
  });

  it('calls loadScan with the result of getScan', async () => {
    renderScanDetail();

    await waitFor(() => {
      expect(mockLoadScan).toHaveBeenCalledWith(mockScanData);
    });
  });

  it('shows loading state initially', () => {
    // Make getScan never resolve so loading stays true
    mockGetScan.mockReturnValue(new Promise(() => {}));
    renderScanDetail();

    expect(screen.getByText(/loading scan/i)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('shows error state when scan fails to load', async () => {
    mockGetScan.mockRejectedValue(new Error('Scan not found'));
    renderScanDetail();

    expect(await screen.findByText(/could not load scan/i)).toBeInTheDocument();
    expect(screen.getByText('Scan not found')).toBeInTheDocument();
  });

  it('shows low confidence warning banner when confidence < 0.5', async () => {
    setupEditorStore({ confidence: 0.3 });
    renderScanDetail();

    await waitFor(() => {
      expect(
        screen.getByText(/the ai had low confidence reading this document/i),
      ).toBeInTheDocument();
    });
  });

  it('does not show low confidence warning when confidence >= 0.5', async () => {
    setupEditorStore({ confidence: 0.6 });
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByTestId('photo-panel')).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/the ai had low confidence reading this document/i),
    ).not.toBeInTheDocument();
  });

  it('shows "Unsaved changes" text when isDirty is true', async () => {
    setupEditorStore({ isDirty: true });
    renderScanDetail();

    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });

  it('renders "Add to Collection" button', async () => {
    renderScanDetail();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add to collection/i }),
      ).toBeInTheDocument();
    });
  });
});
