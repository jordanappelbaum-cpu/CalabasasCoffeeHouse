import { ADMIN_STATUS_LABEL } from '@cch/shared';
import type { OrderStatus } from '@cch/shared';

/** Colour carries the same meaning everywhere: red needs action, green is done. */
const TONE: Record<OrderStatus, string> = {
  created:            'bg-slate-100 text-slate-600',
  paid:               'bg-amber-100 text-amber-800',
  payment_failed:     'bg-red-100 text-red-700',
  fulfillment_pending:'bg-slate-100 text-slate-600',
  label_purchased:    'bg-blue-100 text-blue-800',
  label_failed:       'bg-red-100 text-red-700',
  shipped:            'bg-emerald-100 text-emerald-800',
  delivered:          'bg-emerald-100 text-emerald-800',
  cancelled:          'bg-slate-200 text-slate-600',
  refunded:           'bg-purple-100 text-purple-800',
  partially_refunded: 'bg-purple-100 text-purple-800',
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {ADMIN_STATUS_LABEL[status]}
    </span>
  );
}
