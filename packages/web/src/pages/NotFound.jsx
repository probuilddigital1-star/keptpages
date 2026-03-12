import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page Not Found — KeptPages</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-20 h-20 bg-cream-alt rounded-full flex items-center justify-center mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10 text-terracotta/60"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
            </svg>
          </div>
          <h1 className="font-display text-4xl font-bold text-walnut mb-3">
            404
          </h1>
          <p className="font-display text-xl text-walnut mb-2">
            Page not found
          </p>
          <p className="font-body text-walnut-secondary mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-terracotta text-cream font-ui font-medium rounded-md hover:bg-terracotta-hover transition-colors"
            >
              Go Home
            </Link>
            <Link
              to="/between-the-pages"
              className="inline-flex items-center justify-center px-6 py-3 border border-border-light text-walnut font-ui font-medium rounded-md hover:bg-cream-alt transition-colors"
            >
              Read Articles
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
