import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import Nav from '@/components/landing/Nav';
import Footer from '@/components/landing/Footer';
import SignupCTA from '@/components/articles/SignupCTA';
import { api } from '@/services/api';
import { CATEGORY_MAP } from '@/config/articleCategories';

function ArticleSkeleton() {
  return (
    <div className="animate-pulse max-w-container-md mx-auto">
      <div className="h-3 bg-cream-alt rounded w-32 mb-4" />
      <div className="h-4 bg-cream-alt rounded w-20 mb-3" />
      <div className="h-8 bg-cream-alt rounded w-3/4 mb-2" />
      <div className="h-8 bg-cream-alt rounded w-1/2 mb-4" />
      <div className="h-4 bg-cream-alt rounded w-40 mb-8" />
      <div className="h-64 bg-cream-alt rounded-lg mb-8" />
      <div className="space-y-3">
        <div className="h-4 bg-cream-alt rounded w-full" />
        <div className="h-4 bg-cream-alt rounded w-full" />
        <div className="h-4 bg-cream-alt rounded w-5/6" />
        <div className="h-4 bg-cream-alt rounded w-full" />
        <div className="h-4 bg-cream-alt rounded w-3/4" />
      </div>
    </div>
  );
}

function MarkdownContent({ content }) {
  // Split content on <!-- cta --> marker to insert inline CTA
  const parts = content.split('<!-- cta -->');

  if (parts.length <= 1) {
    return (
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    );
  }

  return (
    <>
      <ReactMarkdown components={markdownComponents}>
        {parts[0]}
      </ReactMarkdown>
      <SignupCTA variant="inline" />
      <ReactMarkdown components={markdownComponents}>
        {parts.slice(1).join('')}
      </ReactMarkdown>
    </>
  );
}

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="font-display font-semibold text-2xl sm:text-3xl text-walnut mt-8 mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display font-semibold text-xl sm:text-2xl text-walnut mt-8 mb-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display font-semibold text-lg text-walnut mt-6 mb-2">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="font-body text-[17px] text-walnut leading-[1.65] mb-4">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-terracotta hover:underline transition-colors">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gold bg-gold-light px-5 py-4 my-6 rounded-r-lg">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="font-body text-[17px] text-walnut leading-[1.65] mb-4 pl-6 list-disc space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="font-body text-[17px] text-walnut leading-[1.65] mb-4 pl-6 list-decimal space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ''}
      className="w-full rounded-lg my-6"
      loading="lazy"
    />
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-walnut">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),
  hr: () => <hr className="border-t border-border-light my-8" />,
};

export default function ArticleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get(`/articles/${slug}`, { isPublic: true });
        setArticle(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  const pageTitle = article?.seoTitle || article?.title || 'Article';
  const pageDescription = article?.seoDescription || article?.excerpt || '';
  const ogImage = article?.ogImageUrl || article?.coverImageUrl || '';
  const canonicalUrl = `https://keptpages.com/between-the-pages/${slug}`;
  const publishedDate = article?.publishedAt ? new Date(article.publishedAt).toISOString() : '';

  const formattedDate = article?.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-cream">
      <Helmet>
        <title>{pageTitle} | KeptPages</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {publishedDate && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: article?.title,
              description: pageDescription,
              image: ogImage || undefined,
              author: {
                '@type': 'Organization',
                name: article?.author || 'KeptPages Team',
              },
              publisher: {
                '@type': 'Organization',
                name: 'KeptPages',
                url: 'https://keptpages.com',
              },
              datePublished: publishedDate,
              mainEntityOfPage: canonicalUrl,
            })}
          </script>
        )}
      </Helmet>

      <Nav
        onCtaClick={() => navigate('/signup')}
        onLoginClick={() => navigate('/login')}
      />

      <main className="pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-container-md px-4 sm:px-6">
          {/* Back link */}
          <Link
            to="/between-the-pages"
            className="inline-flex items-center gap-1.5 font-ui text-sm text-walnut-secondary no-underline hover:text-terracotta transition-colors mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Between the Pages
          </Link>

          {/* Loading */}
          {loading && <ArticleSkeleton />}

          {/* Error / 404 */}
          {error && !loading && (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📄</p>
              <h1 className="font-display font-semibold text-2xl text-walnut mb-2">
                Article not found
              </h1>
              <p className="font-body text-walnut-secondary mb-6">
                We couldn't find the article you're looking for. It may have been moved or removed.
              </p>
              <Link
                to="/between-the-pages"
                className="font-ui text-sm text-terracotta no-underline hover:underline"
              >
                Browse all articles
              </Link>
            </div>
          )}

          {/* Article content */}
          {article && !loading && (
            <article>
              {/* Category label */}
              <span className="font-ui text-[11px] font-semibold uppercase tracking-[2.5px] text-terracotta">
                {CATEGORY_MAP[article.category] || article.category}
              </span>

              {/* Title */}
              <h1 className="font-display font-semibold text-[34px] sm:text-[42px] text-walnut leading-tight mt-2 mb-4">
                {article.title}
              </h1>

              {/* Author + date */}
              <div className="flex items-center gap-2 font-ui text-sm text-walnut-secondary mb-8">
                <span>{article.author}</span>
                {formattedDate && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{formattedDate}</span>
                  </>
                )}
              </div>

              {/* Cover image */}
              {article.coverImageUrl && (
                <img
                  src={article.coverImageUrl}
                  alt={article.title}
                  className="w-full rounded-lg mb-8"
                />
              )}

              {/* Markdown body */}
              <div className="article-content">
                <MarkdownContent content={article.content} />
              </div>

              {/* Tags */}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border-light">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-ui text-xs px-3 py-1 bg-cream-alt rounded-full text-walnut-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* End-of-article CTA */}
              <SignupCTA variant="end" />
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
