import React from 'react';
import { render, screen } from '@testing-library/react';
import StickyBar from './StickyBar';

describe('StickyBar Component', () => {
  // Visibility Tests
  describe('Visibility', () => {
    test('renders when visible prop is true', () => {
      render(
        <StickyBar visible={true}>
          <button>Action</button>
        </StickyBar>
      );
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    test('does not render when visible prop is false', () => {
      render(
        <StickyBar visible={false}>
          <button>Action</button>
        </StickyBar>
      );
      expect(screen.queryByText('Action')).not.toBeInTheDocument();
    });

    test('does not render when visible prop is undefined', () => {
      render(
        <StickyBar>
          <button>Action</button>
        </StickyBar>
      );
      expect(screen.queryByText('Action')).not.toBeInTheDocument();
    });
  });

  // Styling Tests
  describe('Styling', () => {
    test('applies fixed positioning classes', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
    });

    test('applies z-index for proper layering', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('z-40');
    });

    test('applies background and border styles', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('bg-white', 'dark:bg-gray-900');
      expect(bar).toHaveClass('border-t', 'border-gray-200', 'dark:border-gray-700');
    });

    test('applies proper padding', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('px-4', 'sm:px-6', 'py-4');
    });

    test('applies shadow for elevation', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('shadow-lg');
    });

    test('applies slide animation', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('animate-slide-up');
    });
  });

  // Custom Class Tests
  describe('Custom Classes', () => {
    test('applies custom className', () => {
      const { container } = render(
        <StickyBar visible={true} className="custom-class">
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('custom-class');
    });

    test('merges custom className with default styles', () => {
      const { container } = render(
        <StickyBar visible={true} className="bg-red-500">
          <button>Test</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      expect(bar).toHaveClass('bg-red-500', 'fixed', 'bottom-0');
    });
  });

  // Children Tests
  describe('Children', () => {
    test('renders children correctly', () => {
      render(
        <StickyBar visible={true}>
          <button>Button 1</button>
          <button>Button 2</button>
        </StickyBar>
      );
      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
    });

    test('renders complex children', () => {
      render(
        <StickyBar visible={true}>
          <div data-testid="wrapper">
            <span>Complex</span>
            <button>Action</button>
          </div>
        </StickyBar>
      );
      expect(screen.getByTestId('wrapper')).toBeInTheDocument();
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    test('children are wrapped in container with correct layout', () => {
      render(
        <StickyBar visible={true}>
          <button>Test</button>
        </StickyBar>
      );
      const button = screen.getByText('Test');
      const wrapper = button.parentElement;
      expect(wrapper).toHaveClass('max-w-7xl', 'mx-auto', 'flex', 'items-center', 'justify-end');
    });
  });

  // Toggle Visibility Tests
  describe('Visibility Toggle', () => {
    test('toggles visibility correctly', () => {
      const { rerender } = render(
        <StickyBar visible={false}>
          <button>Toggle Test</button>
        </StickyBar>
      );

      expect(screen.queryByText('Toggle Test')).not.toBeInTheDocument();

      rerender(
        <StickyBar visible={true}>
          <button>Toggle Test</button>
        </StickyBar>
      );

      expect(screen.getByText('Toggle Test')).toBeInTheDocument();

      rerender(
        <StickyBar visible={false}>
          <button>Toggle Test</button>
        </StickyBar>
      );

      expect(screen.queryByText('Toggle Test')).not.toBeInTheDocument();
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    test('handles empty children', () => {
      const { container } = render(<StickyBar visible={true} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('handles null children', () => {
      const { container } = render(
        <StickyBar visible={true}>
          {null}
        </StickyBar>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test('handles undefined children', () => {
      const { container } = render(
        <StickyBar visible={true}>
          {undefined}
        </StickyBar>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  // Integration Tests
  describe('Integration', () => {
    test('works with Button components', () => {
      const Button = ({ children, ...props }) => (
        <button className="btn" {...props}>{children}</button>
      );

      render(
        <StickyBar visible={true}>
          <Button>Save</Button>
          <Button>Cancel</Button>
        </StickyBar>
      );

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('maintains interactivity of child components', () => {
      const handleClick = jest.fn();
      render(
        <StickyBar visible={true}>
          <button onClick={handleClick}>Click me</button>
        </StickyBar>
      );

      const button = screen.getByText('Click me');
      button.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not interfere with child component props', () => {
      render(
        <StickyBar visible={true}>
          <button disabled aria-label="Disabled button">
            Disabled
          </button>
        </StickyBar>
      );

      const button = screen.getByText('Disabled');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Disabled button');
    });
  });

  // Responsive Tests
  describe('Responsive Design', () => {
    test('applies responsive padding', () => {
      const { container } = render(
        <StickyBar visible={true}>
          <button>Responsive</button>
        </StickyBar>
      );
      const bar = container.firstChild;
      // Mobile padding
      expect(bar).toHaveClass('px-4');
      // Desktop padding
      expect(bar).toHaveClass('sm:px-6');
    });

    test('content container has max width', () => {
      render(
        <StickyBar visible={true}>
          <button>Content</button>
        </StickyBar>
      );
      const button = screen.getByText('Content');
      const container = button.parentElement;
      expect(container).toHaveClass('max-w-7xl', 'mx-auto');
    });
  });
});