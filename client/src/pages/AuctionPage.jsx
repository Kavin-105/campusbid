import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Clock3, Heart, MessageCircle, RotateCw, UserRound } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { formatPrice } from '../utils/format';
import { imageUrl } from '../utils/imageUrl';

const dateText = (date) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Date to be confirmed' : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};
const remainingText = (date) => {
  const remaining = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(remaining)) return 'Time unavailable';
  if (remaining <= 0) return 'Auction ended';
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor(remaining % 86400000 / 3600000);
  const minutes = Math.floor(remaining % 3600000 / 60000);
  return days ? `${days}d ${hours}h remaining` : `${hours}h ${minutes}m remaining`;
};
const sellerIdFor = (auction) => String(auction?.seller?._id || auction?.seller?.id || auction?.seller || '');

export default function AuctionPage() {
  const { id } = useParams(); const { user } = useAuth();
  const [auction, setAuction] = useState(null); const [bids, setBids] = useState([]); const [questions, setQuestions] = useState([]);
  const [bidsError, setBidsError] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false); const [bidAmount, setBidAmount] = useState(''); const [autoMax, setAutoMax] = useState('');
  const [autoBidBusy, setAutoBidBusy] = useState(false);
  const [questionText, setQuestionText] = useState(''); const [answerDrafts, setAnswerDrafts] = useState({});
  const [imageIndex, setImageIndex] = useState(0);
  const auctionRef = useRef(auction);
  useEffect(() => { auctionRef.current = auction; }, [auction]);

  const loadAuction = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/auctions/${id}`);
      const next = data.auction || data;
      setAuction(next);
      setBids(data.bids || data.recentBids || []);
      setQuestions(data.questions || []);
      const minimum = Number(next.bidCount || 0) === 0
        ? Number(next.startingPrice || 0)
        : Number(next.currentPrice || 0) + Number(next.minimumBidIncrement || 1);
      setBidAmount((current) => String(Math.max(Number(current) || 0, minimum)));
    } catch (e) { setError(e.response?.data?.message || 'This auction could not be loaded.'); }
    finally { if (showSpinner) setLoading(false); }
  }, [id]);

  const loadBids = useCallback(async () => {
    setBidsError('');
    try { const { data } = await api.get(`/auctions/${id}/bids`); setBids(data.items || data.bids || []); }
    catch (e) { setBidsError(e.response?.data?.message || 'Live bid history is temporarily unavailable.'); }
  }, [id]);
  useEffect(() => { loadAuction(); }, [loadAuction]);
  useEffect(() => {
    const configuredApiUrl = import.meta.env.VITE_API_URL || '';
    const socketOrigin = /^https?:\/\//i.test(configuredApiUrl)
      ? new URL(configuredApiUrl).origin
      : window.location.origin;
    const socket = io(socketOrigin);
    const handleAuctionUpdate = (update) => {
      if (String(update.auctionId) !== String(id)) return;
      setAuction((current) => {
        if (!current) return current;
        const next = {
          ...current,
          ...['currentPrice', 'currentLeader', 'bidCount', 'startTime', 'endTime', 'status']
            .reduce((changes, key) => update[key] !== undefined ? { ...changes, [key]: update[key] } : changes, {})
        };
        auctionRef.current = next;
        return next;
      });
      if (update.currentPrice !== undefined) {
        const bidCount = update.bidCount ?? auctionRef.current?.bidCount ?? 0;
        const minimum = bidCount === 0
          ? Number(auctionRef.current?.startingPrice || update.currentPrice)
          : Number(update.currentPrice) + Number(auctionRef.current?.minimumBidIncrement || 1);
        setBidAmount((current) => String(Math.max(Number(current) || 0, minimum)));
      }
    };
    const handleNewBid = (update) => {
      if (String(update.auctionId) === String(id)) loadBids();
    };
    const handleConnect = () => socket.emit('join-auction', id);
    socket.on('connect', handleConnect);
    socket.on('auction-updated', handleAuctionUpdate);
    socket.on('new-bid', handleNewBid);
    return () => {
      socket.emit('leave-auction', id);
      socket.off('connect', handleConnect);
      socket.off('auction-updated', handleAuctionUpdate);
      socket.off('new-bid', handleNewBid);
      socket.disconnect();
    };
  }, [id, loadBids]);
  useEffect(() => {
    const timer = window.setInterval(() => { loadAuction(false); loadBids(); }, 15000);
    return () => window.clearInterval(timer);
  }, [loadAuction, loadBids]);

  const ownAuction = useMemo(() => Boolean(user && sellerIdFor(auction) && sellerIdFor(auction) === String(user._id || user.id || '')), [auction, user]);
  const isBuyer = user?.role === 'buyer';
  const isSeller = user?.role === 'seller';
  const isLeading = isBuyer
    && Boolean(auction?.currentLeader)
    && String(auction.currentLeader._id || auction.currentLeader) === String(user._id || user.id || '');
  const images = auction?.images || [];
  const nextBid = Number(auction?.bidCount || 0) === 0
    ? Number(auction?.startingPrice || 0)
    : Number(auction?.currentPrice || 0) + Number(auction?.minimumBidIncrement || 1);
  const mayBid = isBuyer && auction?.status === 'active' && !ownAuction;
  const mayManageAutoBid = isBuyer
    && ['scheduled', 'active'].includes(auction?.status)
    && !ownAuction
    && new Date(auction.endTime) > new Date();
  const chatClosed = ['reserved', 'sold'].includes(auction?.status);

  const act = async (operation, successText) => {
    setWorking(true); setError(''); setMessage('');
    try { await operation(); setMessage(successText); await loadAuction(false); await loadBids(); }
    catch (e) { setError(e.response?.data?.message || 'That action could not be completed. Please try again.'); }
    finally { setWorking(false); }
  };
  const placeBid = (event) => {
    event.preventDefault();
    if (isLeading) {
      setError('You are currently leading this auction. Wait until another buyer places a bid before bidding again.');
      return;
    }
    if (Number(bidAmount) < nextBid) { setError(`The next valid bid is at least ${formatPrice(nextBid)}.`); return; }
    act(() => api.post(`/auctions/${id}/bids`, { amount: Number(bidAmount) }), 'Your bid is in. Good luck!');
  };
  const toggleWatch = () => act(() => auction.isWatching ? api.delete(`/buyer/watchlist/${id}`) : api.post(`/buyer/watchlist/${id}`), auction.isWatching ? 'Removed from your watchlist.' : 'Added to your watchlist.');
  const submitAutoBid = (event) => {
    event.preventDefault();
    if (Number(autoMax) < nextBid) {
      setError(`The maximum bid must be at least ${formatPrice(nextBid)}.`);
      return;
    }
    setAutoBidBusy(true); setError(''); setMessage('');
    api.post(`/auctions/${id}/autobids`, { maximumAmount: Number(autoMax) })
      .then(async () => {
        setAutoMax('');
        setMessage(auction.status === 'scheduled'
          ? 'Your automatic bid limit is saved and will start when the auction opens. Your maximum stays private.'
          : 'Automatic bidding is active. Your maximum stays private.');
        await loadAuction(false);
        await loadBids();
      })
      .catch((e) => setError(e.response?.data?.message || 'Could not save automatic bidding.'))
      .finally(() => setAutoBidBusy(false));
  };
  const cancelAutoBid = () => {
    setAutoBidBusy(true); setError(''); setMessage('');
    api.delete(`/buyer/autobids/${id}`)
      .then(async () => { setMessage('Automatic bidding was stopped.'); await loadAuction(false); })
      .catch((e) => setError(e.response?.data?.message || 'Could not stop automatic bidding.'))
      .finally(() => setAutoBidBusy(false));
  };
  const askQuestion = (event) => {
    event.preventDefault(); const text = questionText.trim(); if (!text) return;
    act(async () => { await api.post(`/auctions/${id}/questions`, { question: text }); setQuestionText(''); }, 'Your question was sent to the seller.');
  };
  const answerQuestion = (event, questionId) => {
    event.preventDefault(); const answer = (answerDrafts[questionId] || '').trim(); if (!answer) return;
    act(async () => { await api.post(`/auctions/${id}/questions/${questionId}/answer`, { answer }); setAnswerDrafts((v) => ({ ...v, [questionId]: '' })); }, 'Your answer was shared.');
  };
  const decide = (approved) => {
    const label = approved ? 'approve the winner' : 'reject the winner';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    act(() => api.post(`/auctions/${id}/${approved ? 'approve-winner' : 'reject-winner'}`), approved ? 'Winner approved.' : 'Winner rejected.');
  };

  if (loading) return <div className="page-state" role="status">Loading auction details…</div>;
  if (error && !auction) return <div className="page-state page-state-error"><h1>We can’t find that listing.</h1><p>{error}</p><button className="secondary-btn mt-5" onClick={() => loadAuction()}><RotateCw size={16} className="mr-2" /> Try again</button></div>;
  if (!auction) return null;
  const backTo = user?.role === 'seller' ? '/seller/my-listings' : user?.role === 'buyer' ? '/buyer/marketplace' : '/';

  return <div className="space-y-6">
    <Link to={backTo} className="back-link"><ArrowLeft size={16} /> Back to {user?.role === 'seller' ? 'my listings' : user?.role === 'buyer' ? 'marketplace' : 'overview'}</Link>
    {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{error}</p>}
    {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{message}</p>}
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-6">
        <article className="detail-panel overflow-hidden">
          <div className="detail-art relative">
            {images.length > 0 ? <img src={imageUrl(images[imageIndex])} alt={`${auction.title} photo ${imageIndex + 1}`} className="absolute inset-0 h-full w-full object-contain" /> : <div className="detail-art-mark">{(auction.title || 'C').slice(0, 1).toUpperCase()}</div>}
            <span className="category-ribbon relative z-10">{auction.category}</span><span className={`status-pill relative z-10 status-${(auction.status || '').toLowerCase().replaceAll(' ', '-')}`}>{auction.status}</span>
            <div className="detail-art-label relative z-10"><span>GOOD THINGS, AGAIN</span><span>{remainingText(auction.endTime)}</span></div>
          </div>
          {images.length > 1 && <div className="flex gap-2 overflow-x-auto p-3">{images.map((image, index) => <button key={`${index}-${image.slice(-12)}`} onClick={() => setImageIndex(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === imageIndex ? 'border-emerald-700' : 'border-transparent'}`} aria-label={`View photo ${index + 1}`}><img className="h-full w-full object-cover" src={imageUrl(image)} alt="" /></button>)}</div>}
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow text-campus-700">CAMPUS LISTING</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{auction.title}</h1></div><div className="seller-byline"><UserRound size={16} /><span><strong>{auction.seller?.name || 'Campus seller'}</strong><small>{auction.seller?.college || 'Student community'}</small></span></div></div>
            <p className="mt-5 max-w-3xl whitespace-pre-line leading-7 text-slate-600">{auction.description}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="detail-fact"><span>CURRENT BID</span><strong>{formatPrice(auction.currentPrice || auction.startingPrice)}</strong></div><div className="detail-fact"><span>CONDITION</span><strong className="capitalize">{auction.condition || 'Not specified'}</strong></div><div className="detail-fact"><span>STARTS / ENDS</span><strong>{dateText(auction.startTime)} – {dateText(auction.endTime)}</strong></div></div>
            {isBuyer && <button type="button" className="secondary-btn mt-5" disabled={working} onClick={toggleWatch}><Heart size={16} className="mr-2" fill={auction.isWatching ? 'currentColor' : 'none'} />{auction.isWatching ? 'Remove from watchlist' : 'Add to watchlist'}</button>}
            {ownAuction && auction.status === 'awaiting seller decision' && <div className="decision-panel mt-6"><div><h2 className="font-bold">Winner decision required</h2><p className="mt-1 text-sm text-slate-600">Confirm the winner to start the handover, or reject the outcome.</p></div><div className="flex flex-wrap gap-2"><button className="primary-btn" disabled={working} onClick={() => decide(true)}>Approve winner</button><button className="secondary-btn" disabled={working} onClick={() => decide(false)}>Reject winner</button></div></div>}
          </div>
        </article>
        <section className="detail-panel p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-campus-700">PUBLIC ACTIVITY</p><h2 className="mt-2 text-xl font-bold">Bid history</h2></div><Clock3 size={21} className="text-campus-700" /></div>{bidsError && <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{bidsError}</p>}{bids.length ? <div className="mt-5 divide-y divide-slate-100">{bids.map((bid) => <article className="flex flex-wrap items-center justify-between gap-2 py-4 first:pt-0" key={bid._id}><div><strong>{bid.bidder?.name || 'Campus buyer'}</strong><p className="text-xs text-slate-500">{dateText(bid.createdAt)} · {bid.bidType || 'manual'} bid</p></div><strong className="text-campus-800">{formatPrice(bid.amount)}</strong></article>)}</div> : !bidsError && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No bids yet. The first bid will appear here.</p>}</section>
        <section className="detail-panel p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-campus-700">ASK THE SELLER</p><h2 className="mt-2 text-xl font-bold">Questions & answers</h2></div><MessageCircle size={21} className="text-campus-700" /></div>
          {chatClosed
            ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600" role="status">Chat is closed for {auction.status} listings.</p>
            : user
              ? <form onSubmit={askQuestion} className="mt-5 flex flex-col gap-3 sm:flex-row"><label htmlFor="auction-question" className="sr-only">Your question</label><input id="auction-question" className="form-input flex-1" maxLength={500} required value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Ask about condition, pickup, or anything else…" /><button className="primary-btn" disabled={working || !questionText.trim()}>Ask a question <ArrowRight size={16} className="ml-2" /></button></form>
              : <p className="mt-5 text-sm text-slate-600"><Link to="/login" className="font-semibold text-campus-700">Sign in</Link> to ask the seller.</p>}
          <div className="mt-6 divide-y divide-slate-100">{questions.length ? questions.map((item) => <article key={item._id} className="py-5 first:pt-0 last:pb-0"><p className="text-sm font-semibold">{item.askedBy?.name || 'Student'} <span className="font-normal text-slate-500">asked</span></p><p className="mt-2 leading-6 text-slate-700">{item.question}</p>{(item.answer?.answer || item.answerText || item.localAnswer) && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Seller reply:</strong> {item.answer?.answer || item.answerText || item.localAnswer}</p>}{item.status === 'answered' && !(item.answer?.answer || item.answerText || item.localAnswer) && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700"><BadgeCheck size={14} className="mr-1 inline" /> Answered by seller</p>}{ownAuction && !chatClosed && item.status !== 'answered' && <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => answerQuestion(e, item._id)}><label className="sr-only" htmlFor={`answer-${item._id}`}>Reply to question</label><input id={`answer-${item._id}`} className="form-input flex-1" value={answerDrafts[item._id] || ''} onChange={(e) => setAnswerDrafts({ ...answerDrafts, [item._id]: e.target.value })} placeholder="Write a helpful reply…" required /><button className="secondary-btn" disabled={working}>Reply</button></form>}</article>) : <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">No questions yet. Ask the first one if you’d like to know more.</p>}</div>
        </section>
      </div>
      <aside className="space-y-5">
        {mayBid && <section className="bid-panel"><p className="eyebrow text-emerald-100">READY WHEN YOU ARE</p><h2 className="mt-2 text-2xl font-bold text-white">Make it yours.</h2><p className="mt-2 text-sm text-emerald-50/85">Next valid bid: {formatPrice(nextBid)} · {remainingText(auction.endTime)}</p>{isLeading && <p className="mt-4 rounded-lg bg-white/10 p-3 text-sm text-white" role="status">You’re currently leading. You can bid again after another buyer places a bid.</p>}<form onSubmit={placeBid} className="mt-6 space-y-3"><label className="form-label text-emerald-50" htmlFor="bid-amount">Your bid (INR)</label><input id="bid-amount" type="number" min={nextBid} step="1" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className="form-input border-white/20 bg-white text-slate-900" required disabled={isLeading} /><button className="hero-cta w-full" disabled={working || !bidAmount || isLeading}>{working ? 'Sending bid…' : 'Place my bid'} {!working && <ArrowRight size={17} />}</button></form></section>}
        {mayManageAutoBid && <section className="detail-panel p-5"><h2 className="font-bold text-slate-900">Automatic bidding</h2><p className="mt-1 text-sm text-slate-600">Let CampusBid place incremental bids up to the maximum you choose. This amount stays private.</p>{auction.status === 'scheduled' && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Save your limit now. Automatic bidding will begin when the auction opens at {dateText(auction.startTime)}.</p>}{auction.autoBidActive && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">{auction.status === 'scheduled' ? 'Your automatic bid limit is saved and will start when the auction opens.' : 'Automatic bidding is active for this auction.'}</p>}<form className="mt-4 space-y-3" onSubmit={submitAutoBid}><label className="form-label" htmlFor="auto-max">Your maximum (INR)</label><input id="auto-max" className="form-input" type="number" min={nextBid} step="1" value={autoMax} onChange={(e) => setAutoMax(e.target.value)} required /><button className="secondary-btn w-full" disabled={autoBidBusy}>{autoBidBusy ? 'Saving…' : auction.autoBidActive ? 'Update automatic bid' : 'Start automatic bid'}</button></form>{auction.autoBidActive && <button className="mt-3 w-full rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" disabled={autoBidBusy} onClick={cancelAutoBid}>Stop automatic bidding</button>}</section>}
        {!mayBid && !mayManageAutoBid && (isSeller ? <section className="role-notice"><UserRound size={21} className="text-campus-700" /><div><h2 className="font-bold">{ownAuction ? 'Your listing' : 'Seller view'}</h2><p className="mt-1 text-sm text-slate-600">{ownAuction ? 'You can manage this auction from your seller desk.' : 'Seller accounts can ask questions but cannot place bids.'}</p></div></section> : <section className="role-notice"><p className="text-sm text-slate-600"><Link to="/login" className="font-semibold text-campus-700">Sign in</Link> to bid and save this listing.</p></section>)}
        <section className="detail-panel p-5"><p className="eyebrow text-campus-700">AUCTION TIMELINE</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Starts</dt><dd className="text-right font-medium">{dateText(auction.startTime)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Ends</dt><dd className="text-right font-medium">{dateText(auction.endTime)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Starting price</dt><dd className="font-medium">{formatPrice(auction.startingPrice)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Minimum increment</dt><dd className="font-medium">{formatPrice(auction.minimumBidIncrement)}</dd></div></dl></section>
      </aside>
    </div>
  </div>;
}
