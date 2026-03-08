import clsx from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { truncate } from '@/utils/formatters';

const typeBadgeVariant = {
  recipe: 'terracotta',
  letter: 'sage',
  journal: 'gold',
  artwork: 'default',
};

/**
 * Document card for collection views.
 *
 * Props:
 *  - document: { id, title, type, content, scan_url }
 *  - onMoveUp: callback (omit to hide button)
 *  - onMoveDown: callback (omit to hide button)
 *  - onRemove: callback (omit to hide button)
 *  - onClick: callback when the card body is clicked
 *  - readOnly: boolean - hides action buttons entirely
 */
export default function DocumentCard({
  document,
  onMoveUp,
  onMoveDown,
  onRemove,
  onClick,
  readOnly = false,
}) {
  const { id, title, type, content, scan_url } = document;

  return (
    <div
      className={clsx(
        'flex gap-4 bg-cream-surface border border-border-light rounded-md p-4 shadow-sm',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 shrink-0 rounded bg-cream-alt overflow-hidden flex items-center justify-center">
        {scan_url ? (
          <img
            src={scan_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-walnut-muted/40"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-ui font-semibold text-walnut text-sm leading-snug truncate">
            {title || 'Untitled Document'}
          </h4>
          {type && (
            <Badge
              variant={typeBadgeVariant[type] || 'default'}
              className="shrink-0"
            >
              {type}
            </Badge>
          )}
        </div>

        {content && (
          <p className="font-body text-sm text-walnut-secondary mt-1.5 line-clamp-2">
            {truncate(content, 100)}
          </p>
        )}
      </div>

      {/* Action buttons */}
      {!readOnly && (onMoveUp || onMoveDown || onRemove) && (
        <div className="flex flex-col items-center gap-1 shrink-0">
          {onMoveUp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(id);
              }}
              className="p-2 rounded hover:bg-cream-alt text-walnut-muted hover:text-walnut transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Move up"
              title="Move up"
            >
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
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(id);
              }}
              className="p-2 rounded hover:bg-cream-alt text-walnut-muted hover:text-walnut transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Move down"
              title="Move down"
            >
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className="p-2 rounded hover:bg-red-50 text-walnut-muted hover:text-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Remove"
              title="Remove from collection"
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
