import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MarketingLayout } from './MarketingLayout';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<div>Marketing Child Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('MarketingLayout', () => {
  it('renders child content via Outlet', () => {
    renderLayout();
    expect(screen.getByText('Marketing Child Content')).toBeInTheDocument();
  });

  it('has min-h-screen and bg-cream classes', () => {
    const { container } = renderLayout();
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('min-h-screen');
    expect(wrapper).toHaveClass('bg-cream');
  });
});
