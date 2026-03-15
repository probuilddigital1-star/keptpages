import { useEffect } from 'react';
import { useOrdersStore } from '@/stores/ordersStore';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { StatusStepper } from '@/components/order/StatusStepper';
import { formatDate } from '@/utils/formatters';
import { toast } from '@/components/ui/Toast';

export default function OrdersPage() {
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
        <Card className="p-8 text-center">
          <p className="font-ui text-sm text-walnut-muted">
            No orders yet. Once you purchase a printed book, it will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
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
