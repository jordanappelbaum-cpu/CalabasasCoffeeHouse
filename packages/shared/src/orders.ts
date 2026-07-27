/**
 * Order lifecycle helpers shared by the storefront, the admin dashboard and
 * the mobile app's admin tab, so all three describe an order identically.
 */

import type { OrderStatus } from './types';

/** Customer-facing wording. Deliberately hides internal failure states. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  created: 'Awaiting payment',
  paid: 'Confirmed',
  payment_failed: 'Payment failed',
  fulfillment_pending: 'Being prepared',
  // A customer does not care that a label exists; they care that it is packed.
  label_purchased: 'Preparing to ship',
  label_failed: 'Being prepared',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

/** Staff-facing wording. Says exactly what is true, including failures. */
export const ADMIN_STATUS_LABEL: Record<OrderStatus, string> = {
  created: 'Unpaid',
  paid: 'Needs packing',
  payment_failed: 'Payment failed',
  fulfillment_pending: 'Fulfillment pending',
  label_purchased: 'Label ready — ship it',
  label_failed: 'Label FAILED',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

/** Statuses that represent work the shop still owes the customer. */
export const OUTSTANDING_STATUSES: OrderStatus[] = [
  'paid',
  'label_failed',
  'label_purchased',
];

/** Statuses where money actually landed — the basis for all revenue math. */
export const REVENUE_STATUSES: OrderStatus[] = [
  'paid',
  'label_purchased',
  'label_failed',
  'shipped',
  'delivered',
  'partially_refunded',
];

/** Statuses needing staff attention right now, surfaced at the top of the dashboard. */
export const NEEDS_ATTENTION_STATUSES: OrderStatus[] = [
  'label_failed',
  'payment_failed',
];

export function isOutstanding(status: OrderStatus): boolean {
  return OUTSTANDING_STATUSES.includes(status);
}

export function countsAsRevenue(status: OrderStatus): boolean {
  return REVENUE_STATUSES.includes(status);
}

export function needsAttention(status: OrderStatus): boolean {
  return NEEDS_ATTENTION_STATUSES.includes(status);
}

/** Net revenue for an order: what was charged, less anything refunded. */
export function netRevenueCents(order: {
  status: OrderStatus;
  total_cents: number;
  refunded_cents: number;
}): number {
  if (!countsAsRevenue(order.status)) return 0;
  return Math.max(0, order.total_cents - order.refunded_cents);
}

/** Display form of an order number, e.g. 1042 -> "CCH-1042". */
export function formatOrderNumber(orderNumber: number): string {
  return `CCH-${orderNumber}`;
}

/** Which admin actions are legal from a given status. */
export function availableActions(status: OrderStatus): Array<
  'buy_label' | 'retry_label' | 'mark_shipped' | 'mark_delivered' | 'cancel' | 'refund'
> {
  switch (status) {
    case 'paid':
      return ['buy_label', 'cancel', 'refund'];
    case 'label_failed':
      return ['retry_label', 'cancel', 'refund'];
    case 'label_purchased':
      return ['mark_shipped', 'refund'];
    case 'shipped':
      return ['mark_delivered', 'refund'];
    case 'delivered':
    case 'partially_refunded':
      return ['refund'];
    default:
      return [];
  }
}
