import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, Tag, UserRound, Heart } from 'lucide-react';
import { formatPrice } from '../utils/format';
import { imageUrl } from '../utils/imageUrl';

const formatEndTime = (time) => {
  const end = new Date(time);
  return Number.isNaN(end.getTime()) ? 'End time to be confirmed' : `Ends ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

export default function AuctionCard({ auction, onToggleWatch, isWatching = auction.isWatching }) {
  const remaining = new Date(auction.endTime).getTime() - Date.now();
  const countdown = !Number.isFinite(remaining) ? 'End time to be confirmed' : remaining <= 0 ? 'Ended' : remaining < 86400000 ? `${Math.floor(remaining / 3600000)}h left` : `${Math.floor(remaining / 86400000)}d left`;
  return (
    <article className="auction-card">
      <div className="relative">
      <Link to={`/auction/${auction._id}`} className="auction-card-link" aria-label={`View ${auction.title}`}>
        <div className="auction-card-art">
          <span className="category-ribbon">{auction.category}</span>
          <span className={`status-pill status-${(auction.status || '').toLowerCase().replaceAll(' ', '-')}`}>{auction.status || 'active'}</span>
          {auction.images?.[0]
            ? <img src={imageUrl(auction.images[0])} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <div className="auction-card-letter">{(auction.title || 'C').slice(0, 1).toUpperCase()}</div>}
          <span className="auction-card-number">CAMPUS FIND / {String(auction._id || '').slice(-4).toUpperCase()}</span>
        </div>
        <div className="auction-card-body">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="auction-card-title">{auction.title}</h2><p className="auction-card-description">{auction.description}</p></div>
            <span className="auction-card-open" aria-hidden="true"><ArrowUpRight size={17} /></span>
          </div>
          <div className="auction-card-price"><div><span className="fact-label">CURRENT BID</span><strong>{formatPrice(auction.currentPrice || auction.startingPrice)}</strong></div><div className="text-right"><span className="fact-label">CONDITION</span><span className="font-semibold capitalize text-slate-700">{auction.condition || 'Good'}</span></div></div>
          <div className="auction-card-meta"><span><Tag size={14} /> {auction.category}</span><span><UserRound size={14} /> {auction.seller?.name || 'Campus seller'}</span></div>
          <div className="auction-card-footer"><span><Clock3 size={14} /> {countdown} · {formatEndTime(auction.endTime)}</span><strong>{auction.bidCount || 0} bids</strong></div>
        </div>
      </Link>
      {onToggleWatch && <button type="button" className="absolute right-3 top-3 z-10 rounded-full border border-white/70 bg-white/95 p-2 text-campus-800 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-campus-600" aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'} aria-pressed={Boolean(isWatching)} onClick={() => onToggleWatch(auction)}><Heart size={17} fill={isWatching ? 'currentColor' : 'none'} /></button>}
      </div>
    </article>
  );
}
