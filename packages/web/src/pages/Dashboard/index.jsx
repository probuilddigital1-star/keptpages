import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollectionsStore } from '@/stores/collectionsStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useBookStore } from '@/stores/bookStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import CollectionCard from '@/components/collection/CollectionCard';
import BookDraftCard from '@/components/book/BookDraftCard';

function SkeletonCard() {
  return (
    <div className="bg-cream-surface border border-border-light rounded-lg p-5 animate-pulse">
      <div className="h-5 bg-cream-alt rounded w-3/4 mb-3" />
      <div className="h-3 bg-cream-alt rounded w-full mb-2" />
      <div className="h-3 bg-cream-alt rounded w-2/3 mb-4" />
      <div className="flex gap-2">
        <div className="h-6 bg-cream-alt rounded-full w-16" />
        <div className="h-6 bg-cream-alt rounded-full w-20" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Collections state
  const collections = useCollectionsStore((s) => s.collections);
  const collectionsLoading = useCollectionsStore((s) => s.loading);
  const collectionsError = useCollectionsStore((s) => s.error);
  const fetchCollections = useCollectionsStore((s) => s.fetchCollections);
  const createCollection = useCollectionsStore((s) => s.createCollection);
  const deleteCollection = useCollectionsStore((s) => s.deleteCollection);

  // Subscription state
  const tier = useSubscriptionStore((s) => s.tier);
  const usage = useSubscriptionStore((s) => s.usage);
  const limits = useSubscriptionStore((s) => s.limits);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);

  // Book drafts
  const drafts = useBookStore((s) => s.drafts);
  const fetchLatestDraft = useBookStore((s) => s.fetchLatestDraft);
  const latestDraft = drafts[0] || null;

  // Book promo state
  const [promoDismissed, setPromoDismissed] = useState(false);

  // Local state for create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCollections().catch(() => {});
    fetchSubscription().catch(() => {});
    fetchLatestDraft().catch(() => {});
  }, [fetchCollections, fetchSubscription, fetchLatestDraft]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const collection = await createCollection({
        name: newName.trim(),
        description: newDescription.trim(),
      });
      toast('Collection created!');
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      navigate(`/app/collection/${collection.id}`);
    } catch {
      toast('Failed to create collection.', 'error');
    } finally {
      setCreating(false);
    }
  }

  // Scan usage for free users
  const scansUsed = usage.scans || 0;
  const scansLimit = limits.scans === Infinity ? null : limits.scans;
  const scanPercent = scansLimit ? Math.min((scansUsed / scansLimit) * 100, 100) : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-container-lg mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-walnut">
          Your Collections
        </h1>
        <Button onClick={() => setShowCreateModal(true)}>
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Collection
        </Button>
      </div>

      {/* Scan usage progress bar (free and book_purchaser tiers) */}
      {tier !== 'keeper' && scansLimit && (
        <div className="mb-8 bg-cream-surface border border-border-light rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-ui text-sm font-medium text-walnut">
              Scan Usage
            </span>
            <span className="font-ui text-sm text-walnut-secondary">
              {scansUsed} of {scansLimit} scans used
            </span>
          </div>
          <div className="h-2 bg-cream-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-terracotta rounded-full transition-all duration-500 ease-out"
              style={{ width: `${scanPercent}%` }}
            />
          </div>
          {scanPercent >= 80 && (
            <p className="font-ui text-xs text-terracotta mt-2">
              Running low on scans.{' '}
              <button
                onClick={() => navigate('/app/settings#subscription')}
                className="underline font-medium hover:text-terracotta-hover transition-colors"
              >
                Get Keeper Pass
              </button>{' '}
              for unlimited scans.
            </p>
          )}
        </div>
      )}

      {/* Book draft card — "pick up where you left off" */}
      {latestDraft && <BookDraftCard draft={latestDraft} />}

      {/* Book promo banner — show when no draft and a collection has 5+ docs */}
      {!latestDraft && !promoDismissed && (() => {
        const eligible = collections.find((c) => c.documentCount >= 5);
        if (!eligible) return null;
        return (
          <div className="bg-cream-alt border border-terracotta/15 rounded-lg p-5 mb-6 relative">
            <button
              onClick={() => setPromoDismissed(true)}
              className="absolute top-3 right-3 text-walnut-muted hover:text-walnut transition-colors"
              title="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="font-display text-base font-semibold text-walnut mb-1">
              Your pages are ready for a book
            </h3>
            <p className="font-body text-sm text-walnut-secondary mb-3">
              &ldquo;{eligible.name}&rdquo; has {eligible.documentCount} documents — enough to create a beautiful printed book.
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => navigate(`/app/book/${eligible.id}`)}>
                Create Your First Book
              </Button>
              <span className="font-ui text-xs text-walnut-muted">Starting at $39</span>
            </div>
          </div>
        );
      })()}

      {/* Loading skeleton */}
      {collectionsLoading && collections.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {collectionsError && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6 text-sm text-red-600 font-ui">
          {collectionsError}
        </div>
      )}

      {/* Empty state */}
      {!collectionsLoading && collections.length === 0 && !collectionsError && (
        <div className="text-center py-20 px-4">
          {/* Book illustration placeholder */}
          <div className="mx-auto w-24 h-24 bg-cream-alt rounded-full flex items-center justify-center mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 text-terracotta/60"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-walnut mb-2">
            Start preserving your family&apos;s memories
          </h2>
          <p className="font-body text-walnut-secondary max-w-md mx-auto mb-6">
            Create your first collection to organize and digitize recipes,
            letters, journals, and other family documents.
          </p>
          <Button onClick={() => setShowCreateModal(true)} size="lg">
            Create Your First Collection
          </Button>
        </div>
      )}

      {/* Collection grid */}
      {collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onDelete={(collectionId) => {
                let cancelled = false;
                toast(`"${collection.name}" deleted`, 'info', {
                  label: 'Undo',
                  onClick: () => { cancelled = true; },
                });
                setTimeout(async () => {
                  if (cancelled) return;
                  try {
                    await deleteCollection(collectionId);
                  } catch {
                    toast('Failed to delete collection', 'error');
                  }
                }, 5000);
              }}
            />
          ))}
        </div>
      )}

      {/* Create collection modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Collection"
        size="sm"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <Input
            label="Collection Name"
            placeholder="e.g. Grandma's Recipes"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            required
            disabled={creating}
          />
          <Input
            label="Description (optional)"
            placeholder="A brief description of this collection"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            disabled={creating}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating} disabled={!newName.trim()}>
              Create Collection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
