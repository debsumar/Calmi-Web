const INDIAN_NUMBER_FORMAT = new Intl.NumberFormat('en-IN');

/** Session fee as shown to members: rupee sign and Indian digit grouping (₹2,000, ₹1,25,000). */
export function formatRupees(amount: number): string {
  return `₹${INDIAN_NUMBER_FORMAT.format(Number.isFinite(amount) ? amount : 0)}`;
}
