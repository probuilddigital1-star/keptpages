import { useEffect } from 'react';
import { useOrdersStore } from '@/stores/ordersStore';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { StatusStepper } from '@/components/order/StatusStepper';
import { formatDate } from '@/utils/formatters';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { orders, loading, fetchOrders } = useOrdersStore();

  useEffect(() => {
    fetchOrders().catch(() => toast('Failed to load orders', 'error'));
  }, [fetchOrders]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-walnut mb-6">Your Orders</h1>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="mx-auto w-20 h-20 bg-cream-alt rounded-full flex items-center justify-center mb-5 animate-scale-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-terracotta/60">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-walnut mb-2">
            Your first book is waiting
          </h2>
          <p className="font-handwriting text-xl text-terracotta/60 mb-3">
            from your kitchen to your bookshelf
          </p>
          <p className="font-body text-sm text-walnut-secondary max-w-sm mx-auto mb-6">
            Turn your collections into beautiful printed books — hardcover, softcover, or coil-bound, shipped to your door.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate('/app')}>
              Browse Collections
            </Button>
            <Button variant="secondary" onClick={() => navigate('/app/scan')}>
              Start Scanning
            </Button>
          </div>
          <p className="font-ui text-xs text-walnut-muted mt-4">Starting at $39</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, index) => (
            <div
              key={order.id}
              className="animate-stagger-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <OrderCard order={order} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }) {
  const tracking = order.shippingAddress?.trackingId
    ? {
        id: order.shippingAddress.trackingId,
        url: order.shippingAddress.trackingUrl,
      }
    : null;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        {/* Title + date */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-ui text-sm font-semibold text-walnut truncate">
            {order.title || 'Untitled Book'}
          </h3>
          <span className="font-ui text-[10px] text-walnut-muted whitespace-nowrap">
            {formatDate(order.updatedAt || order.createdAt)}
          </span>
        </div>

        {/* Status stepper */}
        <StatusStepper status={order.status} />

        {/* Details row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-ui text-xs text-walnut-muted">
          {order.printOptions?.bookTier && (
            <span className="capitalize">{order.printOptions.bookTier}</span>
          )}
          {order.quantity > 1 && <span>Qty: {order.quantity}</span>}
          {order.pageCount && <span>{order.pageCount} pages</span>}
        </div>

        {/* Tracking info */}
        {tracking && (
          <div className="font-ui text-xs">
            <span className="text-walnut-muted">Tracking: </span>
            {tracking.url ? (
              <a
                href={tracking.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta hover:underline"
              >
                {tracking.id}
              </a>
            ) : (
              <span className="text-walnut">{tracking.id}</span>
            )}
          </div>
        )}

        {/* Error message */}
        {order.errorMessage && (
          <p className="font-ui text-xs text-red-600">{order.errorMessage}</p>
        )}
      </div>
    </Card>
  );
}
