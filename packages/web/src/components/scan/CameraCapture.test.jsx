import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CameraCapture from './CameraCapture';

// Mock navigator.mediaDevices
const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn(),
    },
  });
});

describe('CameraCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);
  });

  it('renders camera controls', () => {
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Close camera')).toBeInTheDocument();
    expect(screen.getByLabelText('Take photo')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch camera')).toBeInTheDocument();
  });

  it('requests camera with environment facing mode by default', () => {
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
  });

  it('disables capture button when camera is not ready', () => {
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);
    const captureBtn = screen.getByLabelText('Take photo');
    expect(captureBtn).toBeDisabled();
  });

  it('shows error message when camera is denied (NotAllowedError)', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/camera access was denied/i)).toBeInTheDocument();
    });
  });

  it('shows error message when no camera found (NotFoundError)', async () => {
    const error = new Error('No camera');
    error.name = 'NotFoundError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/no camera found/i)).toBeInTheDocument();
    });
  });

  it('shows generic error for unknown camera errors', async () => {
    const error = new Error('Unknown');
    error.name = 'SomeOtherError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/could not access the camera/i)).toBeInTheDocument();
    });
  });

  it('shows Go Back button on error', async () => {
    const error = new Error('No camera');
    error.name = 'NotFoundError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CameraCapture onCapture={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByLabelText('Close camera'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Go Back is clicked on error', async () => {
    const onClose = vi.fn();
    const error = new Error('No camera');
    error.name = 'NotFoundError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(error);

    const user = userEvent.setup();
    render(<CameraCapture onCapture={vi.fn()} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /go back/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('stops tracks when unmounting', async () => {
    const stopFn = vi.fn();
    const stream = { getTracks: () => [{ stop: stopFn }] };
    navigator.mediaDevices.getUserMedia.mockResolvedValue(stream);

    const { unmount } = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} />);

    // Wait for the async getUserMedia to resolve and set streamRef
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
    // Allow microtask to complete so streamRef.current is set
    await new Promise((r) => setTimeout(r, 0));

    unmount();

    // Cleanup should stop the stream tracks
    expect(stopFn).toHaveBeenCalled();
  });

  it('renders without crashing when onCapture is not provided', () => {
    render(<CameraCapture onClose={vi.fn()} />);
    expect(screen.getByLabelText('Take photo')).toBeInTheDocument();
  });
});
