import { useState, useCallback } from 'react';
import { useBookStore } from '@/stores/bookStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/formatters';

const STATUS_STEPS = ['ready', 'ordered', 'printing', 'shipped', 'delivered'];

const STATUS_LABELS = {
  ready: 'Ready',
  ordered: 'Ordered',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  error: 'Error',
};

const BADGE_VARIANTS = {
  ready: 'default',
  ordered: 'gold',
  printing: 'terracotta',
  shipped: 'sage',
  delivered: 'sage',
  cancelled: 'default',
  error: 'terracotta',
};

const PRINT_OPTION_LABELS = {
  binding: { PB: 'Paperback', CW: 'Hardcover', CO: 'Coil Bound' },
  interior: { BW: 'Black & White', FC: 'Full Color' },
  paper: { '060UW444': 'Standard Paper', '080CW444': 'Premium Paper' },
  cover: { M: 'Matte Finish', G: 'Glossy Finish' },
};

function StatusStepper({ currentStatus }) {
  const isCancelled = currentStatus === 'cancelled';
  const isError = currentStatus === 'error';

  if (isCancelled || isError) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className={`w-3 h-3 rounded-full ${isError ? 'bg-red-500' : 'bg-walnut-muted'}`} />
        <span className={`font-ui text-sm font-medium ${isError ? 'text-red-600' : 'text-walnut-muted'}`}>
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1 py-3 overflow-x-auto">
      {STATUS_STEPS.map((step, i) => {
        const isPast = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-terracotta ring-2 ring-terracotta/30'
                    : isPast
                      ? 'bg-sage'
                      : 'bg-border'
                }`}
              />
              <span
                className={`font-ui text-[10px] ${
                  isCurrent ? 'text-terracotta font-semibold' : isPast ? 'text-sage' : 'text-walnut-muted'
                }`}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mb-4 ${isPast && i < currentIndex ? 'bg-sage' : 'bg-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderStatusPanel({ bookId }) {
  const book = useBookStore((s) => s.book);
  const checkStatus = useBookStore((s) => s.checkStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [statusData, setStatusData] = useState(null);

  const handleRefresh = useCallback(async () => {
    if (!bookId) return;
    setRefreshing(true);
    try {
      const data = await checkStatus(bookId);
      setStatusData(data);
      toast('Status updated');
    } catch {
      toast('Failed to refresh status', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [bookId, checkStatus]);

  if (!book) return null;

  const status = book.status;
  const trackingInfo = statusData?.trackingInfo || [];
  const printOptions = statusData?.printOptions || book.printOptions || {};
  const shippingAddress = statusData?.shippingAddress || book.shippingAddress || null;
  const quantity = statusData?.quantity || book.quantity || 1;
  const orderCost = statusData?.orderCost || book.orderCost || null;

  return (
    <div className="max-w-lg mx-auto w-full space-y-4">
      {/* Status Stepper */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-ui text-sm font-semibold text-walnut">Order Status</h3>
          <Badge variant={BADGE_VARIANTS[status] || 'default'}>
            {STATUS_LABELS[status] || status}
          </Badge>
        </div>
        <StatusStepper currentStatus={status} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2"
        >
          {refreshing ? <><Spinner size="sm" className="mr-1.5" /> Refreshing...</> : 'Refresh Status'}
        </Button>
      </Card>

      {/* Error message */}
      {status === 'error' && book.errorMessage && (
        <Card className="p-5 border-red-200 bg-red-50/50">
          <h4 className="font-ui text-sm font-semibold text-red-700 mb-1">Order Error</h4>
          <p className="font-ui text-xs text-red-600">{book.errorMessage}</p>
          <p className="font-ui text-[10px] text-red-500 mt-2">
            If this persists, contact support at support@keptpages.com
          </p>
        </Card>
      )}

      {/* Tracking info */}
      {trackingInfo.length > 0 && (
        <Card className="p-5">
          <h4 className="font-ui text-sm font-semibold text-walnut mb-2">Tracking</h4>
          {trackingInfo.map((t, i) => (
            <div key={i} className="flex items-center gap-2 font-ui text-xs">
              <span className="text-walnut-secondary">Tracking ID:</span>
              {t.trackingUrl ? (
                <a
                  href={t.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terracotta underline"
                >
                  {t.trackingId}
                </a>
              ) : (
                <span className="text-walnut">{t.trackingId}</span>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Order details */}
      <Card className="p-5">
        <h4 className="font-ui text-sm font-semibold text-walnut mb-3">Order Details</h4>
        <div className="space-y-2">
          <div className="flex justify-between font-ui text-xs">
            <span className="text-walnut-secondary">Quantity</span>
            <span className="text-walnut">{quantity}</span>
          </div>
          {orderCost && (
            <div className="flex justify-between font-ui text-xs">
              <span className="text-walnut-secondary">Total</span>
              <span className="text-walnut font-medium">{formatCurrency(orderCost)}</span>
            </div>
          )}
          {Object.entries(printOptions).map(([key, value]) => {
            const label = PRINT_OPTION_LABELS[key]?.[value] || value;
            const groupLabel = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="flex justify-between font-ui text-xs">
                <span className="text-walnut-secondary">{groupLabel}</span>
                <span className="text-walnut">{label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Shipping address */}
      {shippingAddress && (
        <Card className="p-5">
          <h4 className="font-ui text-sm font-semibold text-walnut mb-2">Shipping Address</h4>
          <div className="font-ui text-xs text-walnut-secondary space-y-0.5">
            <p>{shippingAddress.name}</p>
            <p>{shippingAddress.street1}</p>
            {shippingAddress.street2 && <p>{shippingAddress.street2}</p>}
            <p>
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
            </p>
            {shippingAddress.country && shippingAddress.country !== 'US' && (
              <p>{shippingAddress.country}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
