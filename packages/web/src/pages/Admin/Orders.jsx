import { useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '@/stores/adminStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/utils/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'All Orders' },
  { value: 'ready', label: 'Ready' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'printing', label: 'Printing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'error', label: 'Error' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BADGE_VARIANTS = {
  ready: 'default',
  ordered: 'gold',
  printing: 'terracotta',
  shipped: 'sage',
  delivered: 'sage',
  cancelled: 'default',
  error: 'terracotta',
};

const MOCK_STATUSES = ['ordered', 'printing', 'shipped', 'delivered'];

function MockStatusControl({ orderId }) {
  const mockStatus = useAdminStore((s) => s.mockStatus);
  const [selected, setSelected] = useState('ordered');
  const [updating, setUpdating] = useState(false);

  const handleMock = useCallback(async () => {
    setUpdating(true);
    try {
      const extra = selected === 'shipped'
        ? { trackingId: `MOCK-${Date.now()}`, trackingUrl: 'https://example.com/track' }
        : {};
      await mockStatus(orderId, selected, extra.trackingId, extra.trackingUrl);
      toast(`Status set to "${selected}"`);
    } catch {
      toast('Failed to mock status', 'error');
    } finally {
      setUpdating(false);
    }
  }, [orderId, selected, mockStatus]);

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="font-ui text-[10px] border border-border rounded px-1.5 py-0.5 bg-cream-surface text-walnut"
      >
        {MOCK_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <Button size="sm" variant="ghost" onClick={handleMock} disabled={updating} className="text-[10px] px-2 py-0.5">
        {updating ? 'Setting...' : 'Set'}
      </Button>
    </div>
  );
}

function OrderDetailPanel({ detail, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (!detail) return null;

  const addr = detail.shippingAddress || {};
  const opts = detail.printOptions || {};

  return (
    <div className="mt-3 pt-3 border-t border-border-light grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 font-ui text-xs">
      {/* User */}
      <div>
        <p className="text-walnut-muted mb-0.5">Customer</p>
        <p className="text-walnut">{detail.userName || 'Unknown'} ({detail.userEmail || 'no email'})</p>
        <p className="text-walnut-muted">Tier: {detail.userTier || 'unknown'}</p>
      </div>

      {/* Shipping */}
      <div>
        <p className="text-walnut-muted mb-0.5">Shipping Address</p>
        {addr.name ? (
          <p className="text-walnut">
            {addr.name}<br />
            {addr.street1}{addr.street2 ? `, ${addr.street2}` : ''}<br />
            {addr.city}, {addr.state} {addr.postalCode}
          </p>
        ) : (
          <p className="text-walnut-muted">Not available</p>
        )}
      </div>

      {/* Print config */}
      <div>
        <p className="text-walnut-muted mb-0.5">Print Config</p>
        <p className="text-walnut capitalize">
          Tier: {opts.bookTier || 'classic'}
          {opts.addons?.length > 0 && ` + ${opts.addons.join(', ')}`}
        </p>
        <p className="text-walnut">{detail.pageCount || 0} pages, Qty: {detail.quantity || 1}</p>
      </div>

      {/* Payment */}
      <div>
        <p className="text-walnut-muted mb-0.5">Payment</p>
        {detail.payment ? (
          <p className="text-walnut">
            {formatCurrency(detail.payment.amount)} {detail.payment.currency?.toUpperCase()} — {detail.payment.status}
          </p>
        ) : (
          <p className="text-walnut-muted">No payment record</p>
        )}
      </div>

      {/* IDs */}
      <div>
        <p className="text-walnut-muted mb-0.5">Lulu IDs</p>
        <p className="text-walnut font-mono text-[10px] break-all">
          Order: {detail.luluOrderId || 'N/A'}<br />
          Project: {detail.luluProjectId || 'N/A'}
        </p>
      </div>

      <div>
        <p className="text-walnut-muted mb-0.5">Stripe IDs</p>
        <p className="text-walnut font-mono text-[10px] break-all">
          Session: {detail.stripeSessionId || 'N/A'}<br />
          PI: {detail.stripePaymentIntentId || 'N/A'}
        </p>
      </div>

      {/* Error */}
      {detail.errorMessage && (
        <div className="sm:col-span-2">
          <p className="text-walnut-muted mb-0.5">Error</p>
          <p className="text-red-600">{detail.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const { orders, total, page, limit, loading, filters, setFilters, fetchOrders } = useAdminStore();
  const fetchOrderDetail = useAdminStore((s) => s.fetchOrderDetail);
  const orderDetail = useAdminStore((s) => s.orderDetail);
  const detailLoading = useAdminStore((s) => s.detailLoading);
  const clearOrderDetail = useAdminStore((s) => s.clearOrderDetail);
  const isDev = import.meta.env.PROD !== true;
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchOrders().catch(() => toast('Failed to load orders', 'error'));
  }, [fetchOrders]);

  const handleFilterChange = useCallback((status) => {
    setFilters({ status });
    fetchOrders({ status, page: 1 }).catch(() => toast('Failed to load orders', 'error'));
  }, [setFilters, fetchOrders]);

  const handlePrev = useCallback(() => {
    if (page > 1) fetchOrders({ page: page - 1 }).catch(() => {});
  }, [page, fetchOrders]);

  const handleNext = useCallback(() => {
    if (page * limit < total) fetchOrders({ page: page + 1 }).catch(() => {});
  }, [page, limit, total, fetchOrders]);

  const toggleDetail = useCallback((orderId) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      clearOrderDetail();
    } else {
      setExpandedId(orderId);
      fetchOrderDetail(orderId).catch(() => toast('Failed to load order detail', 'error'));
    }
  }, [expandedId, fetchOrderDetail, clearOrderDetail]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-walnut">Order Dashboard</h1>
        <Badge variant="default">{total} order{total !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleFilterChange(opt.value)}
            className={`font-ui text-xs px-3 py-1.5 rounded-pill border transition-colors ${
              filters.status === opt.value
                ? 'bg-terracotta text-white border-terracotta'
                : 'bg-cream-surface text-walnut-secondary border-border hover:border-walnut-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-ui text-sm text-walnut-muted">No orders found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-ui text-sm font-semibold text-walnut truncate">
                      {order.title || 'Untitled Book'}
                    </h3>
                    <Badge variant={BADGE_VARIANTS[order.status] || 'default'}>
                      {order.status}
                    </Badge>
                    {order.paymentStatus && (
                      <Badge variant={order.paymentStatus === 'paid' ? 'sage' : 'gold'}>
                        {order.paymentStatus}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-ui text-[10px] text-walnut-muted">
                    {order.userEmail && <span>{order.userEmail}</span>}
                    {order.luluOrderId && <span>Lulu: {order.luluOrderId.slice(0, 16)}...</span>}
                    {order.quantity && <span>Qty: {order.quantity}</span>}
                    {order.orderCost && <span>{formatCurrency(order.orderCost)}</span>}
                    {order.pageCount && <span>{order.pageCount} pages</span>}
                    <span>{formatDate(order.updatedAt || order.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleDetail(order.id)}
                    className="text-[10px] px-2 py-0.5"
                  >
                    {expandedId === order.id ? 'Hide' : 'Details'}
                  </Button>
                  {isDev && <MockStatusControl orderId={order.id} />}
                </div>
              </div>

              {/* Expandable detail */}
              {expandedId === order.id && (
                <OrderDetailPanel
                  detail={orderDetail}
                  loading={detailLoading}
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={page <= 1}>
            Previous
          </Button>
          <span className="font-ui text-xs text-walnut-muted">
            Page {page} of {totalPages}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNext} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
