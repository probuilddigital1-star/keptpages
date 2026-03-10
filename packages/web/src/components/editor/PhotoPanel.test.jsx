import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoPanel from './PhotoPanel';

describe('PhotoPanel', () => {
  it('shows "No image loaded" when no imageUrl', () => {
    render(<PhotoPanel />);
    expect(screen.getByText('No image loaded')).toBeInTheDocument();
  });

  it('renders the image when imageUrl is provided', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    const img = screen.getByAltText('Original scan');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('shows zoom percentage at 100%', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('has zoom in, zoom out, and fit buttons', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit to view')).toBeInTheDocument();
  });

  it('increments zoom when zoom in is clicked', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('decrements zoom when zoom out is clicked', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('150%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  it('resets zoom and pan when fit is clicked', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('150%')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Fit to view'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('does not zoom below minimum (50%)', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    fireEvent.click(screen.getByLabelText('Zoom out'));
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(screen.getByText('50%')).toBeInTheDocument();
    // Zoom out button should be disabled at min
    expect(screen.getByLabelText('Zoom out')).toBeDisabled();
  });

  it('does not zoom above maximum (500%)', () => {
    render(<PhotoPanel imageUrl="https://example.com/photo.jpg" />);
    // Click zoom in many times
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByLabelText('Zoom in'));
    }
    expect(screen.getByText('500%')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom in')).toBeDisabled();
  });
});
