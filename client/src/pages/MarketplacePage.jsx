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
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchLoading, setSavedSearchLoading] = useState(true);
  const [savedSearchError, setSavedSearchError] = useState('');
  const [savedSearchAction, setSavedSearchAction] = useState(false);
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
  const loadSavedSearches = useCallback(async () => {
    setSavedSearchLoading(true);
    setSavedSearchError('');
    try {
      const { data } = await api.get('/buyer/saved-searches');
      setSavedSearches(data.items || data.savedSearches || []);
    } catch (e) {
      setSavedSearchError(e.response?.data?.message || 'Could not load saved searches.');
    } finally {
      setSavedSearchLoading(false);
    }
  }, []);
  useEffect(() => { loadSavedSearches(); }, [loadSavedSearches]);
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
  const saveSearch = async () => {
    setSavedSearchAction(true);
    setSavedSearchError('');
    try {
      const payload = {
        name: search.trim() || [category !== 'all' ? category : '', minPrice ? `min ₹${minPrice}` : '', maxPrice ? `max ₹${maxPrice}` : ''].filter(Boolean).join(' · ') || 'Campus listings',
        query: search.trim(),
        category: category === 'all' ? '' : category,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined
      };
      await api.post('/buyer/saved-searches', payload);
      await loadSavedSearches();
    } catch (e) {
      setSavedSearchError(e.response?.data?.message || 'Could not save this search.');
    } finally {
      setSavedSearchAction(false);
    }
  };
  const removeSavedSearch = async (savedSearch) => {
    setSavedSearchAction(true);
    setSavedSearchError('');
    try {
      await api.delete(`/buyer/saved-searches/${savedSearch._id}`);
      setSavedSearches((current) => current.filter((entry) => entry._id !== savedSearch._id));
    } catch (e) {
      setSavedSearchError(e.response?.data?.message || 'Could not remove this saved search.');
    } finally {
      setSavedSearchAction(false);
    }
  };
  const applySavedSearch = (savedSearch) => {
    const next = new URLSearchParams();
    if (savedSearch.query) next.set('search', savedSearch.query);
    if (savedSearch.category) next.set('category', savedSearch.category);
    if (savedSearch.minPrice !== undefined && savedSearch.minPrice !== null) next.set('minPrice', String(savedSearch.minPrice));
    if (savedSearch.maxPrice !== undefined && savedSearch.maxPrice !== null) next.set('maxPrice', String(savedSearch.maxPrice));
    next.set('page', '1');
    setQuery(next);
  };

  return <div className="space-y-8">
    <header className="page-heading"><div><p className="eyebrow text-campus-700">THE STUDENT EXCHANGE</p><h1 className="section-title mt-3">Find your next good thing.</h1><p className="mt-3 max-w-2xl text-slate-600">Good stuff, priced by students and waiting around the corner.</p></div><div className="heading-note"><ShoppingBag size={18} /><span>Every listing has another campus story.</span></div></header>
    <section className="market-controls space-y-4" aria-label="Search and filter listings">
      <label className="search-field"><Search size={19} aria-hidden="true" /><span className="sr-only">Search listings</span><input value={search} onChange={(e) => updateQuery('search', e.target.value)} placeholder="Search title, description, or category…" /><button type="button" className="clear-search" onClick={() => updateQuery('search', '')}>Clear</button></label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="form-label">Category<select className="form-input" value={category} onChange={(e) => updateQuery('category', e.target.value === 'all' ? '' : e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="form-label">Auction status<select className="form-input" value={status} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Active & upcoming</option>{['active', 'scheduled', 'awaiting seller decision', 'reserved', 'sold', 'unsold'].map((s) => <option key={s}>{s}</option>)}</select></label>
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
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Save the active keyword, category, and price filters to get matching-listing notifications.</p>
        <button type="button" className="secondary-btn shrink-0" disabled={savedSearchAction || (!search.trim() && category === 'all' && !minPrice && !maxPrice)} onClick={saveSearch}>{savedSearchAction ? 'Saving…' : 'Save these filters'}</button>
      </div>
    </section>
    <section className="detail-panel p-5" aria-labelledby="saved-searches-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-campus-700">PERSONAL ALERTS</p><h2 id="saved-searches-title" className="mt-1 text-lg font-bold">Saved searches</h2></div><button type="button" className="secondary-btn" disabled={savedSearchLoading || savedSearchAction} onClick={loadSavedSearches}><RotateCw size={15} className="mr-2" /> Refresh</button></div>
      {savedSearchError && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{savedSearchError}</p>}
      {savedSearchLoading ? <p className="mt-4 text-sm text-slate-600" role="status">Loading saved searches…</p> : savedSearches.length ? <ul className="mt-4 divide-y divide-slate-100">{savedSearches.map((item) => <li key={item._id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"><button className="min-w-0 flex-1 text-left" type="button" onClick={() => applySavedSearch(item)}><strong className="block truncate text-slate-900">{item.name || item.query || item.category || 'Price alert'}</strong><span className="mt-1 block text-sm text-slate-500">{[item.query, item.category, item.minPrice != null ? `from ₹${item.minPrice}` : '', item.maxPrice != null ? `up to ₹${item.maxPrice}` : ''].filter(Boolean).join(' · ')}</span></button><button type="button" className="secondary-btn text-rose-700" disabled={savedSearchAction} onClick={() => removeSavedSearch(item)}>Remove</button></li>)}</ul> : <p className="mt-4 text-sm text-slate-600">No saved searches yet. Save your keyword, category, or price filters above.</p>}
    </section>
    {actionError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{actionError}</p>}
    <section aria-live="polite">
      <div className="results-caption"><span>{loading ? 'Checking the latest listings…' : `${pagination.total ?? auctions.length} listings to explore`}</span><span className="hidden sm:inline">New finds, from your campus community</span></div>
      {loading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" role="status">{[1, 2, 3].map((i) => <div key={i} className="auction-skeleton"><div /><span /><span /></div>)}</div> : error ? <div className="page-state page-state-error"><h2>Marketplace temporarily unavailable</h2><p>{error}</p><button className="secondary-btn mt-5" onClick={load}><RotateCw size={16} className="mr-2" /> Try again</button></div> : auctions.length === 0 ? <div className="page-state"><ShoppingBag size={30} className="mx-auto text-campus-700" /><h2 className="mt-4">No listings match those filters.</h2><p>Try a different search or clear some filters.</p><button className="secondary-btn mt-5" onClick={() => setQuery({})}>Clear filters</button></div> : <><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{auctions.map((auction) => <AuctionCard key={auction._id} auction={auction} onToggleWatch={toggleWatch} />)}</div><div className="mt-8 flex items-center justify-center gap-3"><button className="secondary-btn" disabled={page <= 1} onClick={() => updateQuery('page', String(page - 1))}>Previous</button><span className="text-sm text-slate-600">Page {pagination.page || page} of {pagination.pages || 1}</span><button className="secondary-btn" disabled={page >= (pagination.pages || 1)} onClick={() => updateQuery('page', String(page + 1))}>Next</button></div></>}
    </section>
  </div>;
}
