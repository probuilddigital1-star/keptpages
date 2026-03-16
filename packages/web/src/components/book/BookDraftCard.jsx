import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { COLOR_SCHEMES } from './constants';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function BookDraftCard({ draft }) {
  const navigate = useNavigate();

  if (!draft) return null;

  const scheme = COLOR_SCHEMES.find((s) => s.id === draft.colorScheme) || COLOR_SCHEMES[0];

  return (
    <div className="bg-cream-warm border border-border-light rounded-lg p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Mini cover preview */}
        <div
          className="w-12 h-16 sm:w-12 sm:h-16 rounded shadow-sm shrink-0 flex items-center justify-center border"
          style={{ backgroundColor: scheme.bg, borderColor: scheme.accent }}
        >
          <span
            className="font-display text-[8px] font-bold text-center leading-tight px-1 truncate"
            style={{ color: scheme.accent }}
          >
            {draft.title ? draft.title.slice(0, 20) : ''}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold text-walnut mb-0.5">
            Your book is waiting
          </h3>
          <p className="font-body text-sm text-walnut-secondary mb-3">
            {draft.title ? `"${draft.title}"` : 'Untitled Book'}
            {draft.pageCount ? ` · ${draft.pageCount} pages` : ''}
            {draft.updatedAt && ` · Last edited ${formatRelativeTime(draft.updatedAt)}`}
          </p>
          <Button
            size="sm"
            onClick={() => navigate(`/app/book/${draft.collectionId}?bookId=${draft.id}`)}
          >
            Continue Designing
          </Button>
        </div>
      </div>
    </div>
  );
}
