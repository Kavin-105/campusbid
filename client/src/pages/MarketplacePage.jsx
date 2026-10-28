import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, RotateCw, ShoppingBag } from 'lucide-react';
import api from '../api/client';
import AuctionCard from '../components/AuctionCard';

const categories = ['bicycles', 'calculators', 'books', 'electronics', 'stationery', 'hostel essentials', 'other'];
const categoriesWithAll = ['all', ...categories];

export default function MarketplacePage() {
  const [query, setQuery] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const search = query.get('search') || '';
  const category = query.get('category') || 'all';
  const status = query.get('status') || '';
  const condition = query.get('condition') || '';
  const sort = query.get('sort') || 'newest';
  const page = Math.max(1, Number(query.get('page') || 1));
  const minPrice = query.get('minPrice') || '';
  const maxPrice = query.get('maxPrice') || '';
  const activeOnly = query.get('activeOnly') === 'true';
  const upcoming = query.get('upcoming') === 'true';
  const closingSoon = query.get('closingSoon') === 'true';
  const noBids = query.get('noBids') === 'true';

  const params = useMemo(() => Object.fromEntries([...query.entries()].filter(([key, value]) => value && key !== 'page' ? true : key === 'page')), [query]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const requestParams = { ...params, page, limit: 12 };
      const { data } = await api.get('/auctions', { params: requestParams });
      setAuctions(data.items || data.auctions || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: (data.items || data.auctions || []).length });
    } catch (e) { setError(e.response?.data?.message || 'We couldn’t load the marketplace. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [params, page, query]);

  useEffect(() => { load(); }, [load]);
  const updateQuery = (key, value) => {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setQuery(next, { replace: true });
  };
  const toggleAuctionWindow = (key, active) => {
    const next = new URLSearchParams(query);
    ['activeOnly', 'upcoming', 'closingSoon'].forEach((filter) => next.delete(filter));
    next.delete('status');
    if (!active) next.set(key, 'true');
    next.set('page', '1');
    setQuery(next, { replace: true });
  };
  const setStatusFilter = (value) => {
    const next = new URLSearchParams(query);
    if (value) next.set('status', value); else next.delete('status');
    ['activeOnly', 'upcoming', 'closingSoon'].forEach((filter) => next.delete(filter));
    next.set('page', '1');
    setQuery(next, { replace: true });
  };
  const toggleWatch = async (auction) => {
    setActionError('');
    try {
      if (auction.isWatching) await api.delete(`/buyer/watchlist/${auction._id}`);
      else await api.post(`/buyer/watchlist/${auction._id}`);
      setAuctions((current) => current.map((a) => a._id === auction._id ? { ...a, isWatching: !a.isWatching } : a));
    } catch (e) { setActionError(e.response?.data?.message || 'Could not update your watchlist.'); }
  };
  return <div className="space-y-8">
    <header className="page-heading"><div><p className="eyebrow text-campus-700">THE STUDENT EXCHANGE</p><h1 className="section-title mt-3">Find your next good thing.</h1><p className="mt-3 max-w-2xl text-slate-600">Good stuff, priced by students and waiting around the corner.</p></div><div className="heading-note"><ShoppingBag size={18} /><span>Every listing has another campus story.</span></div></header>
    <section className="market-controls space-y-4" aria-label="Search and filter listings">
      <label className="search-field"><Search size={19} aria-hidden="true" /><span className="sr-only">Search listings</span><input value={search} onChange={(e) => updateQuery('search', e.target.value)} placeholder="Search title, description, or category…" /><button type="button" className="clear-search" onClick={() => updateQuery('search', '')}>Clear</button></label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="form-label">Category<select className="form-input" value={category} onChange={(e) => updateQuery('category', e.target.value === 'all' ? '' : e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="form-label">Auction status<select className="form-input" value={status} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All listings</option>{['active', 'scheduled', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="form-label">Condition<select className="form-input" value={condition} onChange={(e) => updateQuery('condition', e.target.value)}><option value="">Any condition</option>{['new', 'like new', 'good', 'fair', 'needs repair'].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="form-label">Min price<input className="form-input" type="number" min="0" value={minPrice} onChange={(e) => updateQuery('minPrice', e.target.value)} /></label>
        <label className="form-label">Max price<input className="form-input" type="number" min="0" value={maxPrice} onChange={(e) => updateQuery('maxPrice', e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3"><span className="filter-label"><SlidersHorizontal size={15} /> FILTER & SORT</span><label className="form-label w-full sm:w-56">Sort by<select className="form-input" value={sort} onChange={(e) => updateQuery('sort', e.target.value)}><option value="newest">Recently listed</option><option value="endingSoon">Ending soon</option><option value="lowestPrice">Price: low to high</option><option value="highestPrice">Price: high to low</option></select></label></div>
      <div className="flex flex-wrap gap-2" aria-label="Quick listing filters">
        {[['activeOnly', 'Active now', activeOnly], ['upcoming', 'Upcoming', upcoming], ['closingSoon', 'Closing within 24h', closingSoon]].map(([key, label, active]) => <button key={key} type="button" className={`category-chip ${active ? 'category-chip-active' : ''}`} aria-pressed={active} onClick={() => toggleAuctionWindow(key, active)}>{label}</button>)}
        <button type="button" className={`category-chip ${noBids ? 'category-chip-active' : ''}`} aria-pressed={noBids} onClick={() => updateQuery('noBids', noBids ? '' : 'true')}>No bids yet</button>
      </div>
      <div className="category-row">{categoriesWithAll.map((item) => <button key={item} type="button" onClick={() => updateQuery('category', item === 'all' ? '' : item)} aria-pressed={category === item} className={`category-chip ${category === item ? 'category-chip-active' : ''}`}>{item === 'all' ? 'Everything' : item}</button>)}</div>
    </section>
    {actionError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{actionError}</p>}
    <section aria-live="polite">
      <div className="results-caption"><span>{loading ? 'Checking the latest listings…' : `${pagination.total ?? auctions.length} listings to explore`}</span><span className="hidden sm:inline">New finds, from your campus community</span></div>
      {loading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" role="status">{[1, 2, 3].map((i) => <div key={i} className="auction-skeleton"><div /><span /><span /></div>)}</div> : error ? <div className="page-state page-state-error"><h2>Marketplace temporarily unavailable</h2><p>{error}</p><button className="secondary-btn mt-5" onClick={load}><RotateCw size={16} className="mr-2" /> Try again</button></div> : auctions.length === 0 ? <div className="page-state"><ShoppingBag size={30} className="mx-auto text-campus-700" /><h2 className="mt-4">No listings match those filters.</h2><p>Try a different search or clear some filters.</p><button className="secondary-btn mt-5" onClick={() => setQuery({})}>Clear filters</button></div> : <><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{auctions.map((auction) => <AuctionCard key={auction._id} auction={auction} onToggleWatch={toggleWatch} />)}</div><div className="mt-8 flex items-center justify-center gap-3"><button className="secondary-btn" disabled={page <= 1} onClick={() => updateQuery('page', String(page - 1))}>Previous</button><span className="text-sm text-slate-600">Page {pagination.page || page} of {pagination.pages || 1}</span><button className="secondary-btn" disabled={page >= (pagination.pages || 1)} onClick={() => updateQuery('page', String(page + 1))}>Next</button></div></>}
    </section>
  </div>;
}
