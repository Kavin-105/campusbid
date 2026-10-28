import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CirclePlus, PackageOpen, RotateCw, Store } from 'lucide-react';
import api from '../api/client';
import { formatPrice } from '../utils/format';

const readableStatus = (status = '') => status.replaceAll('_', ' ');

export default function DashboardPage() {
  const [selling, setSelling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/auctions/dashboard');
      setSelling(response.data.selling || []);
    } catch (err) {
      setError(err.response?.data?.message || 'We couldn’t load your listings right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <div className="space-y-8">
      <header className="workspace-heading">
        <div><p className="eyebrow text-campus-700">SELLER DESK</p><h1 className="section-title mt-3">Your listings, in one place.</h1><p className="mt-3 text-slate-600">Keep an eye on your auctions and give useful things their next chapter.</p></div>
        <Link to="/create" className="primary-btn"><CirclePlus size={18} className="mr-2" /> List an item</Link>
      </header>

      <section className="seller-overview">
        <div className="seller-overview-icon"><Store size={23} /></div>
        <div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-100">YOUR CAMPUS SHELF</p><h2 className="mt-1 text-2xl font-bold text-white">{loading ? 'Updating your shelf…' : `${selling.length} ${selling.length === 1 ? 'listing' : 'listings'} posted`}</h2><p className="mt-2 text-sm text-emerald-50/80">Listings are visible to buyers across your campus.</p></div>
        <div className="seller-overview-note"><span className="seller-overview-dot" /> Keep good things moving</div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-4"><div><p className="eyebrow text-slate-500">YOUR INVENTORY</p><h2 className="mt-1 text-xl font-bold text-slate-900">Items you’re passing on</h2></div>{!loading && !error && <span className="count-badge">{selling.length} total</span>}</div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="listing-skeleton" />)}</div>
        ) : error ? (
          <div className="page-state page-state-error"><h2>Couldn’t load your listings</h2><p>{error}</p><button type="button" className="secondary-btn mt-5" onClick={loadDashboard}><RotateCw size={16} className="mr-2" /> Try again</button></div>
        ) : selling.length === 0 ? (
          <div className="seller-empty"><div className="empty-icon"><PackageOpen size={25} /></div><div><h3>Your shelf is still empty.</h3><p>Got a book, bike, or useful extra? Give it a new home on campus.</p></div><Link to="/create" className="secondary-btn">Create your first listing <ArrowRight size={16} className="ml-2" /></Link></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {selling.map((auction) => (
              <article key={auction._id} className="listing-row">
                <div className="listing-swatch"><span>{(auction.title || 'I').slice(0, 1).toUpperCase()}</span></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900">{auction.title}</h3><span className={`status-pill status-${(auction.status || '').toLowerCase().replaceAll(' ', '-')}`}>{readableStatus(auction.status)}</span></div>
                  <p className="mt-1 text-sm capitalize text-slate-500">{auction.category} <span className="mx-1">·</span> {auction.bidCount || 0} bids</p>
                  <p className="mt-3 text-sm text-slate-600">Current bid <strong className="ml-1 text-slate-900">{formatPrice(auction.currentPrice || auction.startingPrice)}</strong></p>
                </div>
                <Link to={`/auction/${auction._id}`} className="listing-open" aria-label={`Manage ${auction.title}`}><ArrowRight size={18} /></Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
