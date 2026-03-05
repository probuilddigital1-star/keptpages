import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { relativeTime } from '@/utils/formatters';

/**
 * Collection card for the dashboard grid.
 *
 * Props:
 *  - collection: { id, name, description, coverImageUrl, itemCount, updatedAt }
 *  - onClick: optional click handler (if provided, wraps card in a button instead of Link)
 *  - onDelete: optional delete handler
 */
export default function CollectionCard({ collection, onClick, onDelete }) {
  const {
    id,
    name,
    description,
    coverImageUrl,
    itemCount = 0,
    updatedAt,
  } = collection;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(id);
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const content = (
    <Card hover className="overflow-hidden h-full flex flex-col group relative">
      {/* Cover image or placeholder */}
      <div className="aspect-[4/3] bg-cream-alt flex items-center justify-center overflow-hidden">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={name}
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
            className="w-12 h-12 text-walnut-muted/40"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )}
      </div>

      {/* Delete button (top-right, visible on hover) */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 text-walnut-muted hover:text-red-500 hover:bg-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shadow-sm"
          aria-label="Delete collection"
          title="Delete collection"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      )}

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-ui font-semibold text-walnut text-base leading-snug truncate">
          {name}
        </h3>

        {description && (
          <p className="font-body text-sm text-walnut-secondary mt-1 line-clamp-2">
            {description}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between">
          <Badge>
            {itemCount} {itemCount === 1 ? 'document' : 'documents'}
          </Badge>

          {updatedAt && (
            <span className="font-ui text-xs text-walnut-muted">
              {relativeTime(updatedAt)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );

  const card = onClick ? (
    <button
      type="button"
      onClick={() => onClick(collection)}
      className="text-left w-full"
    >
      {content}
    </button>
  ) : (
    <Link to={`/app/collection/${id}`} className="block">
      {content}
    </Link>
  );

  return (
    <>
      {card}
      {onDelete && (
        <Modal
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Collection"
          size="sm"
        >
          <div className="flex flex-col gap-4">
            <p className="font-body text-walnut-secondary">
              Are you sure you want to delete <strong>{name}</strong>? The scans themselves will not be deleted.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
