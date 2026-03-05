import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-cream pt-[3px]">
      {/* Simple header */}
      <header className="sticky top-[3px] z-30 bg-cream-surface/95 backdrop-blur-md border-b border-border-light">
        <div className="flex items-center justify-between px-6 py-3 max-w-container-lg mx-auto">
          <Link to="/" className="font-display text-lg font-extrabold text-walnut">
            Kept<span className="text-terracotta">Pages</span>
          </Link>
          <Link
            to="/signup"
            className="font-ui text-sm font-semibold text-cream bg-walnut px-4 py-2 rounded-pill hover:-translate-y-0.5 transition-all"
          >
            Join KeptPages
          </Link>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border-light py-8 px-6 text-center">
        <Link to="/" className="font-display text-lg font-extrabold text-walnut">
          Kept<span className="text-terracotta">Pages</span>
        </Link>
        <p className="font-body text-sm text-walnut-muted mt-2">
          Your family's pages — kept beautifully.
        </p>
      </footer>
    </div>
  );
}
