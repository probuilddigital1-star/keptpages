import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScanPage from './index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

const mockScanStore = {
  uploadScan: vi.fn(),
  processScan: vi.fn(),
  uploadProgress: 0,
  processing: false,
};

const mockDocumentsStore = {
  addToCollection: vi.fn(),
};

const mockSubscriptionStore = {
  tier: 'free',
  usage: { scans: 5 },
  limits: { scans: 25 },
  canScan: vi.fn(() => true),
  upgrade: vi.fn(),
  loading: false,
  fetchSubscription: vi.fn().mockResolvedValue({}),
};

vi.mock('@/stores/scanStore', () => ({
  useScanStore: () => mockScanStore,
}));

vi.mock('@/stores/documentsStore', () => ({
  useDocumentsStore: (selector) => selector(mockDocumentsStore),
}));

vi.mock('@/stores/subscriptionStore', () => ({
  useSubscriptionStore: () => mockSubscriptionStore,
}));

vi.mock('@/components/ui/Toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/components/scan/CameraCapture', () => ({
  __esModule: true,
  default: ({ onCapture, onClose }) => (
    <div data-testid="camera">
      <button onClick={() => onCapture(new File([], 'photo.jpg'))}>Capture</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/scan/DropZone', () => ({
  __esModule: true,
  default: ({ onFile }) => (
    <div data-testid="dropzone" onClick={() => onFile(new File([], 'upload.jpg', { type: 'image/jpeg' }))}>
      Drop files
    </div>
  ),
}));

vi.mock('@/components/scan/ImagePreprocessor', () => ({
  __esModule: true,
  default: ({ onConfirm, onCancel }) => (
    <div data-testid="preprocessor">
      <button onClick={() => onConfirm(new Blob(['img'], { type: 'image/jpeg' }))}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

function renderScan() {
  return render(
    <MemoryRouter>
      <ScanPage />
    </MemoryRouter>,
  );
}

describe('ScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionStore.tier = 'free';
    mockSubscriptionStore.usage = { scans: 5 };
    mockSubscriptionStore.limits = { scans: 25 };
    mockSubscriptionStore.canScan.mockReturnValue(true);
  });

  it('renders the New Scan heading', () => {
    renderScan();
    expect(screen.getByText('New Scan')).toBeInTheDocument();
  });

  it('header stacks vertically on mobile and horizontally on sm+', () => {
    renderScan();
    const header = screen.getByTestId('scan-header');
    expect(header.className).toContain('flex-col');
    expect(header.className).toContain('items-start');
    expect(header.className).toContain('sm:flex-row');
    expect(header.className).toContain('sm:items-center');
  });

  it('shows scan counter for free tier', () => {
    renderScan();
    expect(screen.getByText('5 of 25 scans used')).toBeInTheDocument();
  });

  it('shows Take Photo and Upload Photo options', () => {
    renderScan();
    expect(screen.getByText('Take Photo')).toBeInTheDocument();
    expect(screen.getByText('Upload Photo')).toBeInTheDocument();
  });

  it('shows the drop zone', () => {
    renderScan();
    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('shows at-limit banner and upgrade button when scan limit reached', () => {
    mockSubscriptionStore.canScan.mockReturnValue(false);
    renderScan();
    expect(screen.getByText("You've reached your free scan limit")).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('opens upgrade modal when at limit and trying to scan', () => {
    mockSubscriptionStore.canScan.mockReturnValue(false);
    renderScan();
    fireEvent.click(screen.getByText('Take Photo'));
    expect(screen.getByText('Upgrade to Keeper')).toBeInTheDocument();
  });

  it('transitions to camera step when Take Photo clicked', () => {
    renderScan();
    fireEvent.click(screen.getByText('Take Photo'));
    expect(screen.getByTestId('camera')).toBeInTheDocument();
  });

  it('transitions to preview step when file selected via dropzone', () => {
    renderScan();
    fireEvent.click(screen.getByTestId('dropzone'));
    expect(screen.getByTestId('preprocessor')).toBeInTheDocument();
  });

  it('goes back to choose step when camera is closed', () => {
    renderScan();
    fireEvent.click(screen.getByText('Take Photo'));
    expect(screen.getByTestId('camera')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByText('Take Photo')).toBeInTheDocument();
  });

  it('goes back to choose step when preprocess is cancelled', () => {
    renderScan();
    fireEvent.click(screen.getByTestId('dropzone'));
    expect(screen.getByTestId('preprocessor')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Take Photo')).toBeInTheDocument();
  });

  it('uploads and processes on confirm', async () => {
    mockScanStore.uploadScan.mockResolvedValue({ id: 'scan-1' });
    mockScanStore.processScan.mockResolvedValue({ id: 'scan-1' });

    renderScan();
    fireEvent.click(screen.getByTestId('dropzone'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockScanStore.uploadScan).toHaveBeenCalled();
      expect(mockScanStore.processScan).toHaveBeenCalledWith('scan-1');
      expect(mockNavigate).toHaveBeenCalledWith('/app/scan/scan-1', expect.anything());
    });
  });

  it('shows upgrade modal features list', () => {
    mockSubscriptionStore.canScan.mockReturnValue(false);
    renderScan();
    fireEvent.click(screen.getByText('Take Photo'));
    expect(screen.getByText('Unlimited scans')).toBeInTheDocument();
    expect(screen.getByText('Unlimited collections')).toBeInTheDocument();
    expect(screen.getByText('AI reprocessing')).toBeInTheDocument();
  });
});
