import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropZone from './DropZone';

describe('DropZone', () => {
  it('renders the upload prompt text', () => {
    render(<DropZone onFile={vi.fn()} />);
    expect(screen.getByText(/drop your photo here/i)).toBeInTheDocument();
    expect(screen.getByText(/supports jpeg, png, and heic/i)).toBeInTheDocument();
  });

  it('has an accessible file input', () => {
    render(<DropZone onFile={vi.fn()} />);
    const input = screen.getByLabelText(/upload a photo/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('has role="button" for accessibility', () => {
    render(<DropZone onFile={vi.fn()} />);
    const dropZone = screen.getByRole('button');
    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveAttribute('tabIndex', '0');
  });

  it('calls onFile when a valid image is dropped', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const dropZone = screen.getByRole('button');
    const file = new File(['image-data'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('calls onFile when a valid PNG is dropped', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const dropZone = screen.getByRole('button');
    const file = new File(['png-data'], 'test.png', { type: 'image/png' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('does NOT call onFile for non-image files', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const dropZone = screen.getByRole('button');
    const file = new File(['pdf-data'], 'doc.pdf', { type: 'application/pdf' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFile).not.toHaveBeenCalled();
  });

  it('accepts HEIC files with empty MIME type (fixed: checks extension fallback)', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const dropZone = screen.getByRole('button');
    // Some browsers report HEIC files with an empty type
    const file = new File(['heic-data'], 'photo.heic', { type: '' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Fixed: now checks file extension as fallback for HEIC/HEIF files
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('BUG: silently rejects HEIC files with non-standard MIME type', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const dropZone = screen.getByRole('button');
    // Some browsers report HEIC as 'image/heif'
    const heicFile = new File(['heic-data'], 'photo.heic', { type: 'image/heif' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [heicFile] },
    });

    // This one actually works because image/heif starts with 'image/'
    expect(onFile).toHaveBeenCalledWith(heicFile);
  });

  it('shows drag-over overlay when dragging over', () => {
    render(<DropZone onFile={vi.fn()} />);

    const dropZone = screen.getByRole('button');

    fireEvent.dragOver(dropZone);

    expect(screen.getByText('Drop to upload')).toBeInTheDocument();
  });

  it('hides drag-over overlay on drag leave', () => {
    render(<DropZone onFile={vi.fn()} />);

    const dropZone = screen.getByRole('button');

    fireEvent.dragOver(dropZone);
    expect(screen.getByText('Drop to upload')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(screen.queryByText('Drop to upload')).not.toBeInTheDocument();
  });

  it('opens file picker on Enter key press', () => {
    render(<DropZone onFile={vi.fn()} />);

    const dropZone = screen.getByRole('button');
    const input = screen.getByLabelText(/upload a photo/i);
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.keyDown(dropZone, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalled();
  });

  it('opens file picker on Space key press', () => {
    render(<DropZone onFile={vi.fn()} />);

    const dropZone = screen.getByRole('button');
    const input = screen.getByLabelText(/upload a photo/i);
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.keyDown(dropZone, { key: ' ' });

    expect(clickSpy).toHaveBeenCalled();
  });

  it('resets input value after file selection so same file can be re-selected', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const input = screen.getByLabelText(/upload a photo/i);
    const file = new File(['img'], 'test.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
  });

  it('accepts custom accept prop', () => {
    render(<DropZone onFile={vi.fn()} accept="image/jpeg,image/png" />);
    const input = screen.getByLabelText(/upload a photo/i);
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png');
  });

  it('renders without crashing when onFile is not provided', () => {
    render(<DropZone />);
    expect(screen.getByText(/drop your photo here/i)).toBeInTheDocument();
  });

  it('handles drop with no dataTransfer files gracefully', () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);

    const dropZone = screen.getByRole('button');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [] },
    });

    expect(onFile).not.toHaveBeenCalled();
  });

  it('has responsive padding classes (p-6 on mobile, sm:p-10 on desktop)', () => {
    render(<DropZone onFile={vi.fn()} />);
    const dropZone = screen.getByRole('button');
    expect(dropZone.className).toMatch(/p-6/);
    expect(dropZone.className).toMatch(/sm:p-10/);
  });

  it('renders both mobile and desktop text variants in the DOM', () => {
    render(<DropZone onFile={vi.fn()} />);
    expect(screen.getByText(/drop your photo here/i)).toBeInTheDocument();
    expect(screen.getByText(/tap to choose a photo/i)).toBeInTheDocument();
  });
});
