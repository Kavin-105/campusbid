import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, RotateCw, ShoppingBag } from 'lucide-react';
import api from '../api/client';
import { formatPrice } from '../utils/format';
import { imageUrl } from '../utils/imageUrl';

const filters = [
  { value: 'all', label: 'All bids' },
  { value: 'leading', label: 'Leading' },
  { value: 'outbid', label: 'Outbid' },
  ...['active', 'scheduled', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup']
    .map((status) => ({ value: status, label: status }))
];

export default function BidHistoryPage() {
  const [query, setQuery] = useSearchParams();
  const [bids, setBids] = useState([]); const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const filter = query.get('result') || query.get('status') || 'all'; const page = Math.max(1, Number(query.get('page') || 1));
  const params = useMemo(() => ({
    ...(filter === 'leading' || filter === 'outbid'
      ? { result: filter }
      : filter === 'all' ? {} : { status: filter }),
    page,
    limit: 12
  }), [filter, page]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/buyer/bids', { params }); setBids(data.items || data.bids || []); setPagination(data.pagination || { page: 1, pages: 1, total: (data.items || data.bids || []).length }); }
    catch (e) { setError(e.response?.data?.message || 'We couldn’t load your bids. Please try again.'); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);
  const setFilter = (status) => setQuery(status === 'all'
    ? {}
    : ['leading', 'outbid'].includes(status) ? { result: status } : { status });
  return <div className="space-y-8">
    <header className="workspace-heading"><div><p className="eyebrow text-campus-700">BUYER DESK</p><h1 className="section-title mt-3">Your bids, all together.</h1><p className="mt-3 text-slate-600">Keep up with the campus finds you’ve had your eye on.</p></div><Link to="/buyer/marketplace" className="primary-btn"><ShoppingBag size={17} className="mr-2" /> Browse listings</Link></header>
    <section aria-live="polite">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-slate-500">BID ACTIVITY</p><h2 className="mt-1 text-xl font-bold text-slate-900">Your recent bids</h2></div><span className="count-badge">{pagination.total ?? bids.length} {pagination.total === 1 ? 'auction' : 'auctions'}</span></div>
      <div className="mb-5 flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} className={`category-chip ${filter === item.value ? 'category-chip-active' : ''}`} onClick={() => setFilter(item.value)} aria-pressed={filter === item.value}>{item.label}</button>)}</div>
      {loading ? <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading bids">{[1, 2].map((item) => <div key={item} className="listing-skeleton" />)}</div> : error ? <div className="page-state page-state-error"><h2>Couldn’t load your bids</h2><p>{error}</p><button className="secondary-btn mt-5" onClick={load}><RotateCw size={16} className="mr-2" /> Try again</button></div> : bids.length === 0 ? <div className="page-state"><ShoppingBag size={30} className="mx-auto text-campus-700" /><h2 className="mt-4">{filter === 'all' ? 'No bids yet.' : `No ${filter} bids.`}</h2><p>Find something useful for campus and place your first bid.</p><Link to="/buyer/marketplace" className="secondary-btn mt-5">Explore the marketplace <ArrowRight size={16} className="ml-2" /></Link></div> : <>
        <div className="grid gap-4 md:grid-cols-2">{bids.map((bid) => {
          const auction = bid.auction || bid.listing; const auctionId = typeof auction === 'object' ? auction?._id : auction;
          const status = ['awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'].includes(auction?.status)
            ? auction.status
            : bid.isLeading ? 'leading' : 'outbid';
          return <article key={bid.latestBid?._id || auctionId} className="listing-row"><div className="listing-swatch relative overflow-hidden">{auction?.images?.[0] ? <img src={imageUrl(auction.images[0])} alt="" className="h-full w-full object-cover" /> : <span>{(auction?.title || 'B').slice(0, 1).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900">{auction?.title || 'Listing no longer available'}</h3><span className={`status-pill status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></div><p className="mt-1 text-sm capitalize text-slate-500">{auction?.category || 'Campus listing'}</p><p className="mt-3 text-sm text-slate-600">Your bid <strong className="ml-1 text-slate-900">{formatPrice(bid.latestBid?.amount ?? bid.amount)}</strong>{auction?.currentPrice != null && <> <span className="mx-1">·</span> Current {formatPrice(auction.currentPrice)}</>}</p></div>{auctionId && <Link to={`/auction/${auctionId}`} className="listing-open" aria-label={`View ${auction?.title || 'listing'}`}><ArrowRight size={18} /></Link>}</article>;
        })}</div>
        {pagination.pages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button className="secondary-btn" disabled={page <= 1} onClick={() => setQuery({ ...(filter === 'all' ? {} : { status: filter }), page: String(page - 1) })}>Previous</button><span className="text-sm text-slate-600">Page {pagination.page || page} of {pagination.pages}</span><button className="secondary-btn" disabled={page >= pagination.pages} onClick={() => setQuery({ ...(filter === 'all' ? {} : { status: filter }), page: String(page + 1) })}>Next</button></div>}
      </>}
    </section>
  </div>;
}
