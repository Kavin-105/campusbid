import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bell, Check, CircleDollarSign, Clock3, PackageCheck, RotateCw, ShoppingBag, Store, Trash2, UserRound } from 'lucide-react';
import api from '../api/client';
import AuctionCard from '../components/AuctionCard';
import { formatPrice } from '../utils/format';
import { imageUrl } from '../utils/imageUrl';
import { useAuth } from '../context/AuthContext';

const categories = ['bicycles', 'calculators', 'books', 'electronics', 'stationery', 'hostel essentials', 'other'];
const toItems = (data) => data?.items || data?.auctions || data?.selling || data?.bids || data?.handovers || [];
const statusClass = (status = '') => `status-pill status-${status.toLowerCase().replaceAll(' ', '-').replaceAll('_', '-')}`;
const dateText = (date) => date ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';

function PageTitle({ eyebrow, title, copy, action }) {
  return <header className="workspace-heading"><div><p className="eyebrow text-campus-700">{eyebrow}</p><h1 className="section-title mt-3">{title}</h1>{copy && <p className="mt-3 text-slate-600">{copy}</p>}</div>{action}</header>;
}

function LoadPanel({ loading, error, empty, retry, children }) {
  if (loading) return <div className="page-state" role="status">Loading your campus account…</div>;
  if (error) return <div className="page-state page-state-error"><h2>We couldn’t load this right now</h2><p>{error}</p><button className="secondary-btn mt-5" onClick={retry}><RotateCw size={16} className="mr-2" /> Try again</button></div>;
  if (empty) return <div className="page-state"><PackageCheck size={30} className="mx-auto text-campus-700" /><h2 className="mt-4">Nothing to show yet.</h2><p>New activity will appear here when it’s available.</p></div>;
  return children;
}

function Stat({ label, value, note }) {
  return <article className="detail-fact"><span>{label}</span><strong>{value ?? '—'}</strong>{note && <small className="mt-1 block text-slate-500">{note}</small>}</article>;
}

function ResourceList({ url, params, children }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = (await api.get(url, { params })).data; setData(toItems(response)); setPagination(response?.pagination || null); }
    catch (err) { setError(err.response?.data?.message || 'Please try again in a moment.'); }
    finally { setLoading(false); }
  }, [url, JSON.stringify(params || {})]);
  useEffect(() => { reload(); }, [reload]);
  const items = [...data];
  items.pagination = pagination;
  return <LoadPanel loading={loading} error={error} retry={reload}>{children(items, reload)}</LoadPanel>;
}

export function BuyerDashboardPage() {
  const [payload, setPayload] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setPayload((await api.get('/buyer/dashboard')).data); } catch (e) { setError(e.response?.data?.message || 'Could not load your buyer dashboard.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const stats = payload?.stats || {};
  return <div className="space-y-8">
    <PageTitle eyebrow="BUYER DESK" title="Your campus activity." copy="Bids, watchlist finds, and handovers in one place." action={<Link className="primary-btn" to="/buyer/marketplace"><ShoppingBag size={17} className="mr-2" /> Find something good</Link>} />
    <LoadPanel loading={loading} error={error} retry={load}>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="ACTIVE BIDS" value={stats.activeBids} />
        <Stat label="LEADING" value={stats.leading} />
        <Stat label="OUTBID" value={stats.outbid} />
        <Stat label="CLOSING SOON" value={stats.closingSoon} />
        <Stat label="AUTOMATIC BIDS" value={stats.automaticBids} />
        <Stat label="RESERVED" value={stats.reserved} />
        <Stat label="COMPLETED PURCHASES" value={stats.completedPurchases} />
        <Stat label="SAVED ITEMS" value={stats.savedItems} />
        <Stat label="TOTAL ACCEPTED BIDS" value={stats.totalAcceptedBids} />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['My bids', '/buyer/my-bids', CircleDollarSign], ['Watchlist', '/buyer/watchlist', Check], ['Purchases & handovers', '/buyer/purchases', PackageCheck], ['Notifications', '/buyer/notifications', Bell]].map(([label, path, Icon]) => <Link key={path} to={path} className="listing-row"><span className="seller-overview-icon"><Icon size={20} /></span><strong className="flex-1">{label}</strong><ArrowRight size={17} /></Link>)}
      </section>
      <section><div className="mb-5"><p className="eyebrow text-slate-500">FRESH FROM CAMPUS</p><h2 className="mt-1 text-xl font-bold">Recently listed</h2></div>{payload?.recentAuctions?.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{payload.recentAuctions.map((auction) => <AuctionCard key={auction._id} auction={auction} />)}</div> : <div className="page-state">No recent listings yet.</div>}</section>
    </LoadPanel>
  </div>;
}

export function SellerDashboardPage() {
  const [payload, setPayload] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dashboard, topBids] = await Promise.all([
        api.get('/seller/dashboard'),
        api.get('/seller/auctions', { params: { sort: 'highestBid', limit: 50 } })
      ]);
      const currentBids = (topBids.data.items || topBids.data.auctions || [])
        .filter((auction) => auction.bidCount > 0 && ['active', 'scheduled', 'awaiting seller decision'].includes(auction.status))
        .slice(0, 3);
      setPayload({ ...dashboard.data, highestBids: currentBids });
    } catch (e) { setError(e.response?.data?.message || 'Could not load your seller dashboard.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const stats = payload?.stats || {};
  return <div className="seller-dashboard min-w-0 space-y-8">
    <PageTitle eyebrow="SELLER DESK" title="Keep good things moving." copy="Your inventory, endings, and next handovers at a glance." action={<Link className="primary-btn" to="/seller/create-listing"><Store size={17} className="mr-2" /> List an item</Link>} />
    <LoadPanel loading={loading} error={error} retry={load}>
      <section className="seller-dashboard-kpis grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5" aria-label="Seller performance metrics">
        <Stat label="TOTAL LISTED" value={stats.totalListed} />
        <Stat label="ACTIVE" value={stats.active} />
        <Stat label="UPCOMING" value={stats.upcoming} />
        <Stat label="CLOSED" value={stats.closed} />
        <Stat label="SOLD" value={stats.sold} />
        <Stat label="RESERVED" value={stats.reserved} />
        <Stat label="UNSOLD" value={stats.unsold} />
        <Stat label="REVENUE" value={formatPrice(stats.revenue || 0)} />
        <Stat label="PENDING HANDOVERS" value={stats.pendingHandovers} />
        <Stat label="FAILED PICKUPS" value={stats.failedPickups} />
      </section>
      <div className="seller-dashboard-sections grid min-w-0 gap-8 xl:grid-cols-2">
        <section className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Recent listings</h2><Link className="shrink-0 font-semibold text-campus-700" to="/seller/my-listings">All listings</Link></div><AuctionRows items={payload?.recentListings || []} empty="No listings yet." /></section>
        <section className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Ending soon</h2><Link className="shrink-0 font-semibold text-campus-700" to="/seller/auction-management">Manage auctions</Link></div><AuctionRows items={payload?.endingSoon || []} empty="Nothing is ending soon." /></section>
      </div>
      {(payload?.highestBids || []).length > 0 && <section className="min-w-0"><h2 className="mb-4 text-xl font-bold">Highest current bids</h2><AuctionRows items={payload.highestBids} /></section>}
      <section className="min-w-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Recently completed sales</h2><Link className="shrink-0 font-semibold text-campus-700" to="/seller/sales-history">Sales history <ArrowRight size={15} className="ml-1 inline" /></Link></div><AuctionRows items={payload?.recentSales || []} empty="No sales completed yet." sales /></section>
      <section className="min-w-0"><h2 className="mb-4 text-xl font-bold">Pending decisions & handovers</h2><div className="grid min-w-0 gap-4 md:grid-cols-2"><AuctionRows items={payload?.pendingDecisions || []} empty="No winner decisions need attention." />{(payload?.handovers || []).length ? payload.handovers.map((h) => <HandoverCard key={h._id} handover={h} linkToDetails />) : <div className="page-state">No handovers to coordinate.</div>}</div></section>
    </LoadPanel>
  </div>;
}

function AuctionRows({ items, empty, sales = false }) {
  if (!items?.length) return <div className="page-state">{empty}</div>;
  return <div className="seller-dashboard-rows min-w-0 space-y-3">{items.map((a) => <article key={a._id} className="listing-row seller-dashboard-row"><div className="listing-swatch relative overflow-hidden">{a.images?.[0] ? <img src={imageUrl(a.images[0])} alt="" className="h-full w-full object-cover" /> : <span>{(a.title || 'I').slice(0, 1).toUpperCase()}</span>}</div><div className="seller-dashboard-row-copy min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><strong className="truncate">{a.title}</strong>{a.status && <span className={statusClass(a.status)}>{a.status}</span>}</div><p className="seller-dashboard-row-meta mt-1 text-sm text-slate-500">{sales ? 'Sale price' : 'Current bid'} {formatPrice(a.approvedFinalPrice || a.currentPrice || a.startingPrice)} · ends {dateText(a.endTime)}</p></div><Link to={sales ? `/seller/sales-history/${a._id}` : `/auction/${a._id}`} className="listing-open" aria-label={`${sales ? 'View sale' : 'View'} ${a.title}`}><ArrowRight size={17} /></Link></article>)}</div>;
}

export function SellerListingsPage() {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [sort, setSort] = useState('newest'); const [params, setParams] = useSearchParams(); const [revision, setRevision] = useState(0);
  const [actionError, setActionError] = useState('');
  const currentPage = Number(params.get('page') || 1);
  const [edit, setEdit] = useState(null);
  const reloadKey = `${search}|${status}|${sort}|${currentPage}`;
  return <div className="space-y-6">
    <PageTitle eyebrow="YOUR INVENTORY" title="My listings." copy="Manage the items you’re passing on." action={<Link className="primary-btn" to="/seller/create-listing">Create listing <ArrowRight size={16} className="ml-2" /></Link>} />
    {actionError && <p className="page-state-error rounded-xl p-4" role="alert">{actionError}</p>}
    <div className="market-controls grid gap-3 md:grid-cols-3">
      <input className="form-input" placeholder="Search your listings" value={search} onChange={(e) => { setSearch(e.target.value); setParams({ page: '1' }); }} aria-label="Search listings" />
      <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{['scheduled', 'active', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'].map((s) => <option key={s}>{s}</option>)}</select>
      <select className="form-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings"><option value="newest">Newest first</option><option value="closing">Ending soon</option><option value="highestBid">Highest bid</option></select>
    </div>
    <ResourceList key={revision} url="/seller/auctions" params={{ page: currentPage, search: search || undefined, status: status || undefined, sort }}>
      {(items, reload) => items.length ? <><div className="grid gap-4 md:grid-cols-2">{items.map((auction) => <article className="listing-row flex-wrap" key={auction._id}><div className="listing-swatch relative overflow-hidden">{auction.images?.[0] ? <img src={imageUrl(auction.images[0])} alt="" className="h-full w-full object-cover" /> : <span>{(auction.title || 'I').slice(0, 1).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{auction.title}</strong><span className={statusClass(auction.status)}>{auction.status}</span></div><p className="mt-1 text-sm text-slate-500">{auction.category} · {auction.bidCount || 0} bids · {formatPrice(auction.currentPrice || auction.startingPrice)}</p><div className="mt-3 flex flex-wrap gap-2"><Link className="secondary-btn" to={`/auction/${auction._id}`}>View</Link>{auction.status === 'scheduled' && auction.bidCount === 0 && <button className="secondary-btn" onClick={() => setEdit(auction)}>Edit</button>}<Link className="secondary-btn" to={`/seller/sales-history/${auction._id}`}>History</Link><Link className="secondary-btn" to={`/seller/create-listing?relist=${auction._id}`}>Relist</Link>{['scheduled', 'active'].includes(auction.status) && <button className="secondary-btn text-rose-700" onClick={async () => { if (!window.confirm('Cancel this auction? Existing bid history will be retained.')) return; try { await api.post(`/auctions/${auction._id}/cancel`); await reload(); } catch (e) { setActionError(e.response?.data?.message || 'Could not cancel this listing.'); } }}>Cancel</button>}{auction.status === 'awaiting seller decision' && <><DecisionButton id={auction._id} action="approve-winner" label="Approve winner" reload={reload} onError={setActionError} /><DecisionButton id={auction._id} action="reject-winner" label="Reject winner" reload={reload} onError={setActionError} /></>}</div></div></article>)}</div><Pagination pagination={items.pagination} page={currentPage} setPage={(p) => setParams({ page: String(p) })} /></> : <div className="page-state">No listings match these filters.</div>}
    </ResourceList>
    {edit && <EditListingModal auction={edit} close={() => setEdit(null)} onSaved={async () => { setEdit(null); setRevision((value) => value + 1); }} />}
    <span className="sr-only">{reloadKey}</span>
  </div>;
}

function DecisionButton({ id, action, label, reload, onError }) {
  return <button className={action === 'approve-winner' ? 'primary-btn' : 'secondary-btn'} onClick={async () => { if (!window.confirm(`${label}?`)) return; try { await api.post(`/auctions/${id}/${action}`); await reload(); } catch (e) { onError(e.response?.data?.message || `Could not ${label.toLowerCase()}.`); } }}>{label}</button>;
}

const toLocalDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function EditListingModal({ auction, close, onSaved }) {
  const [values, setValues] = useState({ title: auction.title || '', description: auction.description || '', category: auction.category || 'other', condition: auction.condition || 'good', startingPrice: auction.startingPrice || 0, minimumBidIncrement: auction.minimumBidIncrement || 25, startTime: toLocalDateTimeInput(auction.startTime), endTime: toLocalDateTimeInput(auction.endTime) });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4"><form className="auth-panel my-8 w-full max-w-2xl space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); setError(''); try { const start = new Date(values.startTime); const end = new Date(values.endTime); if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error('Choose a valid start and end time; end must be later.'); await api.patch(`/auctions/${auction._id}`, { ...values, startTime: start.toISOString(), endTime: end.toISOString(), startingPrice: Number(values.startingPrice), minimumBidIncrement: Number(values.minimumBidIncrement) }); await onSaved(); } catch (err) { setError(err.response?.data?.message || err.message || 'Could not save your changes.'); } finally { setSaving(false); } }}><div className="flex justify-between"><h2 className="text-xl font-bold">Edit listing</h2><button type="button" className="secondary-btn" onClick={close}>Close</button></div><label className="form-label">Title<input className="form-input" required value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} /></label><label className="form-label">Description<textarea className="form-input min-h-24" required value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="form-label">Category<select className="form-input" value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label className="form-label">Condition<select className="form-input" value={values.condition} onChange={(e) => setValues({ ...values, condition: e.target.value })}>{['new', 'like new', 'good', 'fair', 'needs repair'].map((c) => <option key={c}>{c}</option>)}</select></label><label className="form-label">Starting price<input className="form-input" type="number" min="1" required value={values.startingPrice} onChange={(e) => setValues({ ...values, startingPrice: Number(e.target.value) })} /></label><label className="form-label">Bid increment<input className="form-input" type="number" min="1" required value={values.minimumBidIncrement} onChange={(e) => setValues({ ...values, minimumBidIncrement: Number(e.target.value) })} /></label><label className="form-label">Starts<input className="form-input" type="datetime-local" required value={values.startTime} onChange={(e) => setValues({ ...values, startTime: e.target.value })} /></label><label className="form-label">Ends<input className="form-input" type="datetime-local" required value={values.endTime} onChange={(e) => setValues({ ...values, endTime: e.target.value })} /></label></div>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button className="primary-btn w-full" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></form></div>;
}

function Pagination({ pagination, page, setPage }) {
  const pages = pagination?.pages || 1;
  if (pages <= 1) return null;
  return <div className="mt-6 flex items-center justify-center gap-3"><button className="secondary-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm text-slate-600">Page {page} of {pages}</span><button className="secondary-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>;
}

export function AuctionManagementPage() {
  const [status, setStatus] = useState('awaiting seller decision');
  const [error, setError] = useState('');
  const [, setTick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setTick((n) => n + 1), 60000); return () => window.clearInterval(timer); }, []);
  return <div className="space-y-6"><PageTitle eyebrow="AUCTION CONTROL" title="Manage your auctions." copy="Review bid activity and make final winner decisions." /><div className="flex flex-wrap gap-2">{['awaiting seller decision', 'active', 'scheduled', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'].map((s) => <button key={s} onClick={() => setStatus(s)} className={`category-chip ${status === s ? 'category-chip-active' : ''}`}>{s}</button>)}</div>{error && <p role="alert" className="text-rose-700">{error}</p>}<ResourceList url="/seller/auctions" params={{ status, sort: 'closing' }}>{(items, reload) => !items.length ? <div className="page-state">No auctions in this status.</div> : <div className="grid gap-4 md:grid-cols-2">{items.map((a) => <article className="listing-row" key={a._id}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong>{a.title}</strong><span className={statusClass(a.status)}>{a.status}</span></div><p className="mt-2 text-sm text-slate-600">Current bid: {formatPrice(a.currentPrice || a.startingPrice)} · {a.bidCount || 0} bids</p><p className="mt-1 text-sm text-slate-500">Ends {dateText(a.endTime)} · <Countdown endTime={a.endTime} /></p><p className="mt-1 text-sm text-slate-500">Leading bidder: {a.currentLeader?.name || 'No bids yet'}</p><div className="mt-3 flex flex-wrap gap-2"><Link to={`/auction/${a._id}`} className="secondary-btn">Open auction</Link>{status === 'awaiting seller decision' && <><DecisionButton id={a._id} action="approve-winner" label="Approve winner" reload={reload} onError={setError} /><DecisionButton id={a._id} action="reject-winner" label="Reject winner" reload={reload} onError={setError} /></>}</div></div></article>)}</div>}</ResourceList></div>;
}

function Countdown({ endTime }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const n = new Date(endTime).getTime() - now;
  if (!Number.isFinite(n)) return 'time unavailable';
  if (n <= 0) return 'ended';
  const h = Math.floor(n / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${Math.floor((n % 3600000) / 60000)}m left`;
}

export function SellerSalesHistoryPage() {
  const { auctionId } = useParams(); const [params, setParams] = useSearchParams(); const [filters, setFilters] = useState({ search: '', category: '', outcome: '', from: '', to: '', sort: 'newest' }); const [detail, setDetail] = useState(null); const [error, setError] = useState('');
  const page = Number(params.get('page') || 1);
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setParams({ page: '1' }, { replace: true });
  };
  const dateFilter = (value, endOfDay = false) => {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    const date = endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day);
    return date.toISOString();
  };
  useEffect(() => { if (!auctionId) { setDetail(null); return; } let live = true; setError(''); setDetail(null); api.get(`/seller/sales-history/${auctionId}`).then(({ data }) => live && setDetail(data)).catch((e) => live && setError(e.response?.data?.message || 'Could not load this sale.')); return () => { live = false; }; }, [auctionId]);
  if (auctionId) return <SalesDetail detail={detail} error={error} />;
  const requestFilters = { ...filters, from: dateFilter(filters.from), to: dateFilter(filters.to, true), page };
  return <div className="space-y-6"><PageTitle eyebrow="SELLER RECORDS" title="Sales history." copy="Track outcomes and coordinate successful handovers." /><SalesSummary /><div className="market-controls grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><input className="form-input" placeholder="Search title" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} /><select className="form-input" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><select className="form-input" value={filters.outcome} onChange={(e) => updateFilter('outcome', e.target.value)}><option value="">All outcomes</option>{[['completed', 'Completed'], ['unsold', 'Unsold'], ['rejected', 'Rejected'], ['reserved', 'Reserved'], ['awaiting seller decision', 'Awaiting seller decision'], ['cancelled', 'Cancelled'], ['failed pickup', 'Failed pickup']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label="From date" className="form-input" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} /><input aria-label="To date" className="form-input" type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} /><select className="form-input" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price">Highest sale</option></select></div>
    <ResourceList url="/seller/sales-history" params={requestFilters}>{(items) => <><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Item</th><th className="p-4">Outcome</th><th className="p-4">Final bid</th><th className="p-4">Auction date</th><th className="p-4">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((a) => <tr key={a._id}><td className="p-4 font-semibold">{a.title}</td><td className="p-4"><span className={statusClass(a.status || a.outcome)}>{a.status || a.outcome}</span></td><td className="p-4">{formatPrice(a.approvedFinalPrice || a.currentPrice || a.startingPrice)}</td><td className="p-4">{dateText(a.endTime)}</td><td className="p-4"><Link className="font-semibold text-campus-700" to={`/seller/sales-history/${a._id}`}>View sale</Link></td></tr>)}</tbody></table></div><Pagination pagination={items.pagination} page={page} setPage={(p) => setParams({ page: String(p) })} />{!items.length && <div className="page-state">No sales match these filters.</div>}</>}</ResourceList>
  </div>;
}

function SalesSummary() {
  const [summary, setSummary] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get('/seller/dashboard').then(({ data }) => setSummary(data)).catch((e) => setError(e.response?.data?.message || 'Sales summary is unavailable.')); }, []);
  if (error) return <p className="text-sm text-slate-500">{error}</p>;
  if (!summary) return <div className="listing-skeleton" role="status">Loading sales summary…</div>;
  const stats = summary.stats || {};
  return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="COMPLETED SALES" value={stats.sold} /><Stat label="TOTAL REVENUE" value={formatPrice(stats.revenue || 0)} /><Stat label="PENDING DECISIONS" value={summary.pendingDecisions?.length || 0} /><Stat label="ACTIVE LISTINGS" value={stats.active} /></section>;
}

function SalesDetail({ detail, error }) {
  const [proposal, setProposal] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(error); const [handoverStatus, setHandoverStatus] = useState(detail?.handover?.status);
  const [auctionStatus, setAuctionStatus] = useState(detail?.auction?.status || detail?.item?.status || detail?.status);
  const [scheduledAt, setScheduledAt] = useState(detail?.handover?.scheduledAt || '');
  useEffect(() => { setHandoverStatus(detail?.handover?.status); setAuctionStatus(detail?.auction?.status || detail?.item?.status || detail?.status); setScheduledAt(detail?.handover?.scheduledAt || ''); }, [detail]);
  const auction = detail?.auction || detail?.item || detail;
  if (message && !detail) return <div className="page-state page-state-error">{message}</div>;
  if (!detail) return <div className="page-state" role="status">Loading sale details…</div>;
  const handover = detail.handover;
  const handoverAction = async (path, body = undefined) => {
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post(path, body);
      setHandoverStatus(data.handover?.status || handoverStatus);
      if (data.handover?.status === 'completed') setAuctionStatus('sold');
      setMessage('Handover updated successfully.');
    } catch (err) { setMessage(err.response?.data?.message || 'Could not update the handover.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6"><Link to="/seller/sales-history" className="back-link">← Back to sales history</Link><PageTitle eyebrow="SALE DETAIL" title={auction?.title || 'Sale details'} copy={`Outcome: ${auctionStatus || auction?.outcome || '—'} · Final price: ${formatPrice(auction?.approvedFinalPrice || auction?.currentPrice)}`} /><section className="detail-panel p-6"><h2 className="text-lg font-bold">Public bid history</h2>{(detail.bids || []).length ? <div className="mt-4 divide-y">{detail.bids.map((b) => <p key={b._id} className="py-3 text-sm">{b.bidder?.name || 'Student'} bid <strong>{formatPrice(b.amount)}</strong> · {dateText(b.createdAt)}</p>)}</div> : <p className="mt-3 text-slate-600">No bids were recorded.</p>}</section><section className="detail-panel p-6"><h2 className="text-lg font-bold">Handover schedule</h2>{handover ? <HandoverCard handover={{ ...handover, status: handoverStatus || handover.status, scheduledAt }} /> : <p className="mt-2 text-slate-600">A handover will appear when the winner is approved.</p>}<form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMessage(''); try { const scheduled = new Date(proposal).toISOString(); await api.patch(`/handovers/${handover?._id}/schedule`, { scheduledAt: scheduled }); setScheduledAt(scheduled); setHandoverStatus('scheduled'); setMessage('Handover time proposal sent.'); } catch (err) { setMessage(err.response?.data?.message || 'Could not propose a time.'); } finally { setBusy(false); } }}><label className="sr-only" htmlFor="handover-time">Propose handover time</label><input id="handover-time" className="form-input" type="datetime-local" value={proposal} onChange={(e) => setProposal(e.target.value)} required /><button className="primary-btn" disabled={busy || !handover}>{busy ? 'Sending…' : 'Propose handover time'}</button></form>{handover && ['pending', 'scheduled'].includes(handoverStatus || handover.status) && <div className="mt-4 flex flex-wrap gap-2"><button className="secondary-btn" disabled={busy || (handoverStatus || handover.status) !== 'scheduled'} onClick={() => handoverAction(`/handovers/${handover._id}/confirm`)}>Confirm handover</button><button className="secondary-btn text-rose-700" disabled={busy} onClick={() => { const reason = window.prompt('Briefly describe the failed pickup'); if (reason?.trim()) handoverAction(`/handovers/${handover._id}/report-failure`, { reason: reason.trim() }); }}>Report failed pickup</button></div>}{message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}</section></div>;
}

function HandoverCard({ handover, linkToDetails = false }) {
  const content = <><Clock3 size={20} className="text-campus-700" /><div className="flex-1"><strong>{handover.auction?.title || handover.title || 'Campus handover'}</strong><p className="text-sm text-slate-600">{handover.status || 'pending'} · {dateText(handover.scheduledAt)}</p></div>{handover._id && <span className={statusClass(handover.status)}>{handover.status}</span>}</>;
  const auctionId = handover.auction?._id || handover.auction;
  return linkToDetails && auctionId
    ? <Link to={`/seller/sales-history/${auctionId}`} className="listing-row mt-3">{content}<span className="sr-only">Open handover details</span></Link>
    : <article className="listing-row mt-3">{content}</article>;
}

export function WatchlistPage() {
  const [message, setMessage] = useState('');
  return <div className="space-y-6"><PageTitle eyebrow="SAVED FINDS" title="Your watchlist." copy="Keep an eye on auctions you might want to bid on." /><ResourceList url="/buyer/watchlist">{(items, reload) => { const rows = items.map((x) => x.auction || x); return rows.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rows.map((a) => <div key={a._id}><AuctionCard auction={a} /><button className="secondary-btn mt-2" onClick={async () => { setMessage(''); try { await api.delete(`/buyer/watchlist/${a._id}`); await reload(); } catch (e) { setMessage(e.response?.data?.message || 'Could not remove from watchlist.'); } }}><Trash2 size={15} className="mr-2" /> Remove</button></div>)}</div> : <div className="page-state">Your watchlist is empty. Save auctions from their detail pages.</div>; }}</ResourceList>{message && <p role="alert" className="text-rose-700">{message}</p>}</div>;
}

export function NotificationsPage() {
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  return <div className="space-y-6"><PageTitle eyebrow="UPDATES" title="Notifications." copy="Auction updates and handover reminders, straight from your account." /><ResourceList url="/notifications">{(items, reload) => <><div className="flex justify-end"><button className="secondary-btn" disabled={!items.some((n) => !n.readAt && !n.isRead)} onClick={async () => { setMessage(''); try { await api.post('/notifications/read-all'); await reload(); } catch (e) { setMessage(e.response?.data?.message || 'Could not mark notifications read.'); } }}>Mark all read</button></div>{items.length ? <div className="divide-y rounded-2xl border border-slate-200 bg-white">{items.map((n) => { const auctionId = n.auction?._id || n.auction; const href = n.type === 'handover' && user?.role === 'buyer' ? '/buyer/purchases' : n.type === 'handover' && user?.role === 'seller' && auctionId ? `/seller/sales-history/${auctionId}` : auctionId ? `/auction/${auctionId}` : null; return <article className={`flex flex-wrap items-start gap-4 p-5 ${n.readAt || n.isRead ? '' : 'bg-emerald-50/50'}`} key={n._id}><Bell size={18} className="mt-1 text-campus-700" /><div className="flex-1"><h2 className="font-semibold">{n.title || n.type || 'CampusBid update'}</h2><p className="mt-1 text-sm text-slate-600">{n.message || n.body}</p><p className="mt-2 text-xs text-slate-500">{dateText(n.createdAt)}</p>{href && <Link className="mt-2 inline-flex font-semibold text-campus-700 hover:underline" to={href}>{n.type === 'handover' ? 'Open handover' : 'View auction'} <ArrowRight size={14} className="ml-1" /></Link>}</div>{!(n.readAt || n.isRead) && <button className="secondary-btn" onClick={async () => { try { await api.patch(`/notifications/${n._id}/read`); await reload(); } catch (e) { setMessage(e.response?.data?.message || 'Could not mark as read.'); } }}>Mark read</button>}</article>; })}</div> : <div className="page-state">You’re all caught up.</div>}{message && <p role="alert" className="text-rose-700">{message}</p>}</>}</ResourceList></div>;
}

export function PurchasesPage() {
  return <div className="space-y-6"><PageTitle eyebrow="YOUR PURCHASES" title="Purchases & handovers." copy="Coordinate collection with the seller and confirm when it’s done." /><ResourceList url="/handovers">{(items, reload) => items.length ? <div className="space-y-4">{items.map((h) => <PurchaseHandover key={h._id} handover={h} reload={reload} />)}</div> : <div className="page-state">Approved purchases and handovers will appear here.</div>}</ResourceList><section className="detail-panel p-5"><h2 className="font-bold">Purchase history</h2><ResourceList url="/buyer/purchases">{(items) => items.length ? <div className="mt-3 space-y-2">{items.map((x) => <Link key={x._id} className="listing-row" to={`/auction/${x.auction?._id || x._id}`}><span className="flex-1">{x.auction?.title || x.title || 'Purchased listing'}</span><strong>{formatPrice(x.approvedFinalPrice || x.amount)}</strong></Link>)}</div> : <p className="mt-2 text-sm text-slate-600">No completed purchases yet.</p>}</ResourceList></section></div>;
}

function PurchaseHandover({ handover, reload }) {
  const [error, setError] = useState(''); const [time, setTime] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (path, method = 'post', data) => { setBusy(true); setError(''); try { await api[method](path, data); await reload(); } catch (e) { setError(e.response?.data?.message || 'Could not update this handover.'); } finally { setBusy(false); } };
  const buyerConfirmed = Boolean(handover.buyerConfirmedAt);
  const sellerConfirmed = Boolean(handover.sellerConfirmedAt);
  const canConfirm = handover.status === 'scheduled' && !buyerConfirmed;
  return <article className="detail-panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-bold">{handover.auction?.title || handover.title || 'Purchase handover'}</h2>
        <p className="mt-1 text-sm text-slate-600">Seller: {handover.seller?.name || 'Campus seller'} · {handover.status}</p>
        <p className="text-sm text-slate-500">Scheduled: {dateText(handover.scheduledAt)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {handover.auction?.status && <span className={statusClass(handover.auction.status)}>{handover.auction.status}</span>}
        <span className={statusClass(handover.status)}>{handover.status}</span>
      </div>
    </div>
    {['pending', 'scheduled'].includes(handover.status) && <div className="mt-3 space-y-1 text-sm text-slate-600" aria-live="polite">
      <p>Buyer confirmation: {buyerConfirmed ? 'Confirmed' : 'Waiting'}</p>
      <p>Seller confirmation: {sellerConfirmed ? 'Confirmed' : 'Waiting'}</p>
      {handover.status === 'pending'
        ? <p className="text-slate-700">A handover time must be scheduled before either person can confirm. Propose a time below or wait for the seller.</p>
        : buyerConfirmed
          ? <p className="text-slate-700">You confirmed the handover. The sale completes after the seller confirms too.</p>
          : sellerConfirmed
            ? <p className="text-slate-700">The seller confirmed. Confirm after the handover is complete to finish the sale.</p>
            : <p className="text-slate-700">Both people must confirm after the handover is complete for the sale to finish.</p>}
    </div>}
    {['pending', 'scheduled'].includes(handover.status) ? <>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy || !canConfirm} className="primary-btn" onClick={() => run(`/handovers/${handover._id}/confirm`)}>
          {buyerConfirmed ? 'You confirmed' : 'Confirm handover'}
        </button>
        <button disabled={busy} className="secondary-btn text-rose-700" onClick={() => { const reason = window.prompt('Briefly describe the failed pickup'); if (reason?.trim()) run(`/handovers/${handover._id}/report-failure`, 'post', { reason: reason.trim() }); }}>Report failed pickup</button>
      </div>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); run(`/handovers/${handover._id}/schedule`, 'patch', { scheduledAt: new Date(time).toISOString() }); }}>
        <label className="sr-only" htmlFor={`time-${handover._id}`}>Propose a new time</label>
        <input id={`time-${handover._id}`} className="form-input" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required />
        <button className="secondary-btn" disabled={busy}>Propose new time</button>
      </form>
    </> : handover.status === 'completed'
      ? <p className="mt-4 text-sm font-medium text-emerald-800">Handover complete. Both people have confirmed.</p>
      : handover.status === 'failed'
        ? <p className="mt-4 text-sm text-rose-700">Pickup reported as failed{handover.failureReason ? `: ${handover.failureReason}` : '.'}</p>
        : null}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
  </article>;
}

export function ProfilePage() {
  const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const { data } = await api.get('/profile'); setProfile(data.user || data.profile || data); } catch (e) { setError(e.response?.data?.message || 'Could not load your profile.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return <div className="space-y-6"><PageTitle eyebrow="ACCOUNT" title="Your profile." copy="Your account details are private to you." /><LoadPanel loading={loading} error={error} retry={load}>{profile && <section className="auth-panel max-w-2xl"><div className="flex items-center gap-4"><span className="seller-overview-icon"><UserRound /></span><div><h2 className="text-xl font-bold">{profile.name}</h2><p className="text-sm capitalize text-slate-500">{profile.role} account</p></div></div><dl className="mt-7 grid gap-5 sm:grid-cols-2"><div><dt className="form-label">Email</dt><dd className="text-slate-800">{profile.email}</dd></div><div><dt className="form-label">College / campus</dt><dd className="text-slate-800">{profile.college || '—'}</dd></div><div><dt className="form-label">Student ID</dt><dd className="text-slate-800">{profile.studentId || '—'}</dd></div><div><dt className="form-label">Member since</dt><dd className="text-slate-800">{dateText(profile.createdAt)}</dd></div></dl></section>}</LoadPanel></div>;
}
