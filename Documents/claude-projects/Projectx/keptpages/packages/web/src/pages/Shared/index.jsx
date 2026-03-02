import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/services/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import DocumentCard from '@/components/collection/DocumentCard';

export default function SharedCollection() {
  const { token } = useParams();

  const [collection, setCollection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    api
      .get(`/shared/${token}`, { isPublic: true })
      .then((data) => {
        setCollection(data.collection || data);
        // API returns items with nested scan objects — flatten for DocumentCard
        const docs = (data.items || data.documents || []).map((item) => {
          if (item.scan) {
            return {
              id: item.scan.id,
              title: item.scan.title,
              documentType: item.scan.documentType,
              extractedData: item.scan.extractedData,
              originalFilename: item.scan.originalFilename,
              status: item.scan.status,
              type: item.sectionTitle ? 'section' : undefined,
              sectionTitle: item.sectionTitle,
            };
          }
          return item;
        });
        setDocuments(docs);
      })
      .catch((err) => {
        setError(err.message || 'This link is invalid or has expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 sm:px-6 py-20 max-w-container-md mx-auto text-center">
        <div className="mx-auto w-20 h-20 bg-cream-alt rounded-full flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10 text-walnut-muted/50"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-walnut mb-2">
          Collection Not Found
        </h2>
        <p className="font-body text-walnut-secondary max-w-sm mx-auto mb-6">
          {error}
        </p>
        <Link to="/">
          <Button variant="secondary">Go to KeptPages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-container-lg mx-auto">
      {/* Collection header */}
      <div className="text-center mb-10">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-walnut mb-2">
          {collection?.name || 'Shared Collection'}
        </h1>
        {collection?.description && (
          <p className="font-body text-walnut-secondary max-w-lg mx-auto mb-4">
            {collection.description}
          </p>
        )}
        <Badge>
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </Badge>
      </div>

      {/* Ornament divider */}
      <div className="section-ornament mb-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-walnut-muted/40"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>

      {/* Documents (read-only) */}
      {documents.length === 0 ? (
        <p className="text-center font-body text-walnut-secondary py-12">
          This collection is empty.
        </p>
      ) : (
        <div className="space-y-3 max-w-container-md mx-auto">
          {documents.map((doc) => {
            // Section title divider
            if (doc.type === 'section') {
              return (
                <div key={doc.id} className="section-ornament">
                  <span className="font-display text-base font-semibold text-walnut px-4">
                    {doc.title}
                  </span>
                </div>
              );
            }

            return (
              <DocumentCard key={doc.id} document={doc} readOnly />
            );
          })}
        </div>
      )}

      {/* CTA banner */}
      <div className="mt-16 bg-cream-surface border border-border-light rounded-lg shadow-sm p-8 text-center max-w-container-md mx-auto">
        <h2 className="font-display text-xl font-semibold text-walnut mb-2">
          Preserve your family&apos;s memories too
        </h2>
        <p className="font-body text-walnut-secondary max-w-md mx-auto mb-6">
          KeptPages makes it easy to scan, organize, and turn family
          documents into beautiful keepsake books.
        </p>
        <Link to="/signup">
          <Button size="lg">
            Join KeptPages
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </Link>
      </div>
    </div>
  );
}
