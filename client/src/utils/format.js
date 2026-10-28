export const formatPrice = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(Number(value || 0));

export const formatTimeRemaining = (date, now = Date.now()) => {
  const remainingSeconds = Math.ceil((new Date(date).getTime() - now) / 1000);
  if (!Number.isFinite(remainingSeconds)) return 'Time unavailable';
  if (remainingSeconds <= 0) return 'Auction ended';
  if (remainingSeconds >= 3600) {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}m ${seconds}s`;
};
