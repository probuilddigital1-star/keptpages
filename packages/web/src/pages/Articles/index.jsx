import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Nav from '@/components/landing/Nav';
import Footer from '@/components/landing/Footer';
import { api } from '@/services/api';
import { ARTICLE_CATEGORIES, CATEGORY_MAP } from '@/config/articleCategories';

function SkeletonCard() {
  return (
    <div className="bg-cream-surface border border-border-light rounded-lg overflow-hidden animate-pulse">
      <div className="h-44 bg-cream-alt" />
      <div className="p-5">
        <div className="h-3 bg-cream-alt rounded w-20 mb-3" />
        <div className="h-5 bg-cream-alt rounded w-3/4 mb-2" />
        <div className="h-3 bg-cream-alt rounded w-full mb-2" />
        <div className="h-3 bg-cream-alt rounded w-2/3 mb-4" />
        <div className="h-3 bg-cream-alt rounded w-24" />
      </div>
    </div>
  );
}

function ArticleCard({ article }) {
  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Link
      to={`/between-the-pages/${article.slug}`}
      className="group block bg-cream-surface border border-border-light rounded-lg overflow-hidden no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {article.coverImageUrl && (
        <div className="h-44 overflow-hidden">
          <img
            src={article.coverImageUrl}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      {!article.coverImageUrl && (
        <div className="h-44 bg-gradient-to-br from-cream-alt to-aged-paper flex items-center justify-center">
          <span className="text-4xl opacity-30">📄</span>
        </div>
      )}
      <div className="p-5">
        <span className="font-ui text-[11px] font-semibold uppercase tracking-[2.5px] text-terracotta">
          {CATEGORY_MAP[article.category] || article.category}
        </span>
        <h3 className="font-display font-semibold text-lg text-walnut mt-1.5 mb-2 leading-snug group-hover:text-terracotta transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="font-body text-sm text-walnut-secondary leading-relaxed mb-3 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 font-ui text-xs text-walnut-muted">
          <span>{article.author}</span>
          {date && (
            <>
              <span className="opacity-40">·</span>
              <span>{date}</span>
            </>
          )}
        </div>
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-ui text-[11px] px-2 py-0.5 bg-cream-alt rounded-full text-walnut-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function ArticleListing() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '12' });
        if (activeCategory) params.set('category', activeCategory);
        const data = await api.get(`/articles?${params}`, { isPublic: true });
        setArticles(data.articles || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, [activeCategory, page]);

  function handleCategoryChange(cat) {
    setActiveCategory(cat);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-cream">
      <Helmet>
        <title>Between the Pages | KeptPages</title>
        <meta name="description" content="Guides, stories, and inspiration for preserving old family recipes, letters, and journals. Learn how to digitize and keep what matters most." />
        <link rel="canonical" href="https://keptpages.com/between-the-pages" />
        <link rel="alternate" type="application/rss+xml" title="Between the Pages - KeptPages" href="/api/articles/rss" />
        <meta property="og:title" content="Between the Pages | KeptPages" />
        <meta property="og:description" content="Guides, stories, and inspiration for preserving what matters most." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://keptpages.com/between-the-pages" />
      </Helmet>
      <Nav
        onCtaClick={() => navigate('/signup')}
        onLoginClick={() => navigate('/login')}
      />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-container-sm md:max-w-container-md lg:max-w-container-lg px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-14">
            <span className="section-label">Our Stories & Guides</span>
            <h1 className="font-display font-semibold text-section sm:text-section-lg text-walnut mt-2 mb-3">
              Between the Pages
            </h1>
            <p className="font-body text-base sm:text-lg text-walnut-secondary max-w-container-md mx-auto leading-relaxed">
              Guides, stories, and inspiration for preserving what matters most.
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-10">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`font-ui text-[13px] font-medium px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                !activeCategory
                  ? 'bg-walnut text-cream border-walnut'
                  : 'bg-transparent text-walnut-secondary border-border-light hover:border-walnut hover:text-walnut'
              }`}
            >
              All
            </button>
            {ARTICLE_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`font-ui text-[13px] font-medium px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer ${
                  activeCategory === cat.slug
                    ? 'bg-walnut text-cream border-walnut'
                    : 'bg-transparent text-walnut-secondary border-border-light hover:border-walnut hover:text-walnut'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-16">
              <p className="font-body text-walnut-secondary">
                Something went wrong loading articles. Please try again.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && articles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📚</p>
              <h2 className="font-display font-semibold text-xl text-walnut mb-2">
                No articles yet
              </h2>
              <p className="font-body text-walnut-secondary">
                We're working on something special. Check back soon.
              </p>
            </div>
          )}

          {/* Articles grid */}
          {!loading && !error && articles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="font-ui text-sm px-4 py-2 rounded-lg border border-border-light bg-cream-surface text-walnut disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream-alt transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="font-ui text-sm text-walnut-secondary flex items-center px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="font-ui text-sm px-4 py-2 rounded-lg border border-border-light bg-cream-surface text-walnut disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream-alt transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}

          {/* RSS link */}
          <div className="text-center mt-10">
            <a
              href="/api/articles/rss"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-ui text-xs text-walnut-muted hover:text-terracotta transition-colors no-underline"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
              </svg>
              RSS Feed
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
