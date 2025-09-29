import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
  // Visibility Tests
  describe('Visibility', () => {
    test('renders when open prop is true', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Confirm Action"
        />
      );
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    test('does not render when open prop is false', () => {
      render(
        <ConfirmDialog
          open={false}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Confirm Action"
        />
      );
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    test('toggles visibility correctly', () => {
      const { rerender } = render(
        <ConfirmDialog
          open={false}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Toggle Test"
        />
      );

      expect(screen.queryByText('Toggle Test')).not.toBeInTheDocument();

      rerender(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Toggle Test"
        />
      );

      expect(screen.getByText('Toggle Test')).toBeInTheDocument();
    });
  });

  // Content Tests
  describe('Content', () => {
    test('displays title', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Delete Item?"
        />
      );
      expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    });

    test('displays description when provided', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Delete Item?"
          description="This action cannot be undone."
        />
      );
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    test('uses default title when not provided', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    test('displays custom button text', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          confirmText="Delete"
          cancelText="Keep"
        />
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });

    test('uses default button text when not provided', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  // Interaction Tests
  describe('Interactions', () => {
    test('calls onConfirm when confirm button is clicked', () => {
      const handleConfirm = jest.fn();
      render(
        <ConfirmDialog
          open={true}
          onConfirm={handleConfirm}
          onCancel={() => {}}
        />
      );

      fireEvent.click(screen.getByText('Confirm'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    test('calls onCancel when cancel button is clicked', () => {
      const handleCancel = jest.fn();
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    test('calls onCancel when backdrop is clicked', () => {
      const handleCancel = jest.fn();
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      fireEvent.click(backdrop);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    test('calls onCancel when Escape key is pressed', () => {
      const handleCancel = jest.fn();
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={handleCancel}
        />
      );

      const dialog = container.querySelector('[role="dialog"]').parentElement;
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  // Loading State Tests
  describe('Loading State', () => {
    test('disables buttons when loading', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          loading={true}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      const cancelButton = screen.getByText('Cancel');

      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    test('prevents backdrop click when loading', () => {
      const handleCancel = jest.fn();
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={handleCancel}
          loading={true}
        />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      fireEvent.click(backdrop);
      expect(handleCancel).not.toHaveBeenCalled();
    });

    test('prevents Escape key when loading', () => {
      const handleCancel = jest.fn();
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={handleCancel}
          loading={true}
        />
      );

      const dialog = container.querySelector('[role="dialog"]').parentElement;
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      expect(handleCancel).not.toHaveBeenCalled();
    });
  });

  // Focus Management Tests
  describe('Focus Management', () => {
    test('focuses cancel button when dialog opens', async () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        expect(document.activeElement).toBe(cancelButton);
      }, { timeout: 200 });
    });

    test('returns focus to previous element when dialog closes', async () => {
      const triggerButton = document.createElement('button');
      triggerButton.textContent = 'Trigger';
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const { rerender } = render(
        <ConfirmDialog
          open={false}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      expect(document.activeElement).toBe(triggerButton);

      rerender(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      await waitFor(() => {
        expect(document.activeElement).not.toBe(triggerButton);
      });

      rerender(
        <ConfirmDialog
          open={false}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      expect(document.activeElement).toBe(triggerButton);

      document.body.removeChild(triggerButton);
    });
  });

  // Button Variant Tests
  describe('Button Variants', () => {
    test('applies destructive variant to confirm button', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          confirmVariant="destructive"
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-red-600');
    });

    test('applies custom variant to confirm button', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          confirmVariant="primary"
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-blue-600');
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Delete Item?"
          description="This cannot be undone."
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'confirm-description');
    });

    test('title has proper ID for aria-labelledby', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title="Test Title"
        />
      );

      const title = screen.getByText('Test Title');
      expect(title).toHaveAttribute('id', 'confirm-title');
    });

    test('description has proper ID for aria-describedby', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          description="Test Description"
        />
      );

      const description = screen.getByText('Test Description');
      expect(description).toHaveAttribute('id', 'confirm-description');
    });

    test('backdrop has aria-hidden', () => {
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const backdrop = container.querySelector('.bg-black\\/50');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // Styling Tests
  describe('Styling', () => {
    test('applies proper dialog styling', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('bg-white', 'dark:bg-gray-900', 'rounded-2xl', 'shadow-2xl');
    });

    test('applies animation class', () => {
      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-scale-in');
    });

    test('centers dialog in viewport', () => {
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
    });

    test('has proper z-index layering', () => {
      const { container } = render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('z-50');
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    test('handles rapid open/close transitions', () => {
      const { rerender } = render(
        <ConfirmDialog
          open={false}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      rerender(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      rerender(
        <ConfirmDialog
          open={false}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      rerender(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('handles missing callbacks gracefully', () => {
      // Should not throw even without callbacks
      const { container } = render(
        <ConfirmDialog
          open={true}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test('handles very long text content', () => {
      const longTitle = 'A'.repeat(200);
      const longDescription = 'B'.repeat(500);

      render(
        <ConfirmDialog
          open={true}
          onConfirm={() => {}}
          onCancel={() => {}}
          title={longTitle}
          description={longDescription}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });
});