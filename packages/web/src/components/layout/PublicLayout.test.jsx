import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './PublicLayout';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<div>Public Child Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicLayout', () => {
  it('renders KeptPages logo in header', () => {
    renderLayout();
    // The logo text is split across elements: "Kept" + "Pages"
    const logos = screen.getAllByText(/Kept/);
    expect(logos.length).toBeGreaterThanOrEqual(1);
    // Header logo should link to "/"
    const headerLink = logos[0].closest('a');
    expect(headerLink).toHaveAttribute('href', '/');
  });

  it('renders "Join KeptPages" link', () => {
    renderLayout();
    const joinLink = screen.getByText('Join KeptPages');
    expect(joinLink).toBeInTheDocument();
    expect(joinLink).toHaveAttribute('href', '/signup');
  });

  it('renders footer with logo and copyright', () => {
    renderLayout();
    expect(
      screen.getByText("Your family's pages \u2014 kept beautifully.")
    ).toBeInTheDocument();
    // Footer also has the logo
    const footerElement = screen.getByText(
      "Your family's pages \u2014 kept beautifully."
    ).closest('footer');
    expect(footerElement).toBeInTheDocument();
  });

  it('renders child content via Outlet', () => {
    renderLayout();
    expect(screen.getByText('Public Child Content')).toBeInTheDocument();
  });
});
