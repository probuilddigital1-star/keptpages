import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders image when src provided', () => {
    render(<Avatar src="https://example.com/photo.jpg" name="Jane Doe" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows initials when no src', () => {
    render(<Avatar name="Jane Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('generates correct initials from single name', () => {
    render(<Avatar name="Jane" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('generates correct initials from multi-word name', () => {
    render(<Avatar name="John Michael Smith" />);
    // First + last initial
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('shows ? when name is empty', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('applies sm size classes', () => {
    render(<Avatar name="A B" size="sm" />);
    const avatar = screen.getByLabelText('A B');
    expect(avatar.className).toMatch(/h-8/);
    expect(avatar.className).toMatch(/w-8/);
  });

  it('applies md size classes by default', () => {
    render(<Avatar name="A B" />);
    const avatar = screen.getByLabelText('A B');
    expect(avatar.className).toMatch(/h-10/);
    expect(avatar.className).toMatch(/w-10/);
  });

  it('applies lg size classes', () => {
    render(<Avatar name="A B" size="lg" />);
    const avatar = screen.getByLabelText('A B');
    expect(avatar.className).toMatch(/h-14/);
    expect(avatar.className).toMatch(/w-14/);
  });

  it('falls back to initials on image error', () => {
    render(<Avatar src="https://example.com/broken.jpg" name="Jane Doe" />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    // After error, image should be gone, initials shown
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
