import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookStore } from '@/stores/bookStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Button } from '@/components/ui/Button';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

export default function BookDraftButton({ collectionId, documentCount = 0 }) {
  const navigate = useNavigate();
  const drafts = useBookStore((s) => s.drafts);
  const fetchDrafts = useBookStore((s) => s.fetchDrafts);
  const tier = useSubscriptionStore((s) => s.tier);

  useEffect(() => {
    if (collectionId) {
      fetchDrafts(collectionId);
    }
  }, [collectionId, fetchDrafts]);

  const latestDraft = drafts[0] || null;
  const hasEnoughDocs = documentCount >= 5;

  // Book creation is available to all authenticated tiers (CTA-2)
  if (!tier || tier === 'no_account') return null;

  // State B — Draft exists: show continue card
  if (latestDraft) {
    return (
      <div className="bg-cream-alt border border-terracotta/20 rounded-lg p-4 w-full sm:w-auto">
        <div className="flex items-start gap-3">
          {/* Mini cover color swatch */}
          <MiniCoverSwatch colorScheme={latestDraft.colorScheme} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-terracotta shrink-0">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="font-display text-sm font-semibold text-walnut truncate">
                Continue Your Cookbook
              </span>
            </div>
            <p className="font-ui text-xs text-walnut-muted mb-2.5">
              {latestDraft.pageCount ? `${latestDraft.pageCount} pages` : latestDraft.title || 'In progress'}
              {latestDraft.updatedAt && ` · Edited ${formatRelativeTime(latestDraft.updatedAt)}`}
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => navigate(`/app/book/${collectionId}?bookId=${latestDraft.id}`)}
              >
                Continue Designing
              </Button>
            </div>
            <button
              onClick={() => navigate(`/app/book/${collectionId}`)}
              className="font-ui text-[10px] text-walnut-muted hover:text-terracotta transition-colors mt-2 underline"
            >
              or start a new book
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State A — No draft: show create button
  return (
    <div className="flex flex-col items-start gap-1.5 w-full sm:w-auto">
      <Button
        variant={hasEnoughDocs ? 'primary' : 'light'}
        onClick={() => navigate(`/app/book/${collectionId}`)}
        disabled={!hasEnoughDocs}
        title={!hasEnoughDocs ? 'Add more recipes first' : undefined}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        {hasEnoughDocs ? 'Create Book' : 'Add more recipes to create a book'}
      </Button>
      {tier !== 'keeper' && hasEnoughDocs && (
        <span className="font-ui text-[10px] text-walnut-muted">
          Keeper Pass members save 15% on every book
        </span>
      )}
    </div>
  );
}

function MiniCoverSwatch({ colorScheme }) {
  const SCHEME_COLORS = {
    default: '#C65D3E',
    midnight: '#e2b04a',
    forest: '#2d5a3d',
    plum: '#7b3f6e',
    ocean: '#2a6496',
  };
  const color = SCHEME_COLORS[colorScheme] || SCHEME_COLORS.default;

  return (
    <div
      className="w-8 h-10 rounded shrink-0 border border-black/10"
      style={{ backgroundColor: color }}
    />
  );
}
