import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, BadgeCheck, BookOpen, CircleDollarSign, Handshake, ShieldCheck, Sparkles, Store, Tag, TimerReset } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const roleLink = user?.role === 'seller' ? '/seller/dashboard' : '/buyer/marketplace';
  const roleLabel = user?.role === 'seller' ? 'Open my seller desk' : 'Explore the marketplace';

  return (
    <div className="space-y-20 pb-10">
      <section className="hero-panel relative overflow-hidden">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="eyebrow text-emerald-100"><Sparkles size={14} /> GOOD FINDS, CLOSER TO HOME</p>
            <h1 className="hero-title mt-6">The best campus finds are <span>already here.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-50/90">Give your student essentials a second life—or find the one thing missing from yours. Buy and sell with people who share your campus.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {!loading && user ? (
                <Link to={roleLink} className="hero-cta"> {roleLabel} <ArrowRight size={18} /></Link>
              ) : (
                <>
                  <Link to="/register" className="hero-cta">Get started <ArrowRight size={18} /></Link>
                  <Link to="/login" className="hero-secondary">I already have an account</Link>
                </>
              )}
            </div>
            <div className="mt-12 flex items-center gap-4 border-t border-white/15 pt-5 text-sm text-emerald-50/80">
              <span className="flex items-center gap-2"><ShieldCheck size={17} /> Campus-only community</span>
              <span className="text-white/35">•</span>
              <span className="flex items-center gap-2"><Handshake size={17} /> Meet up, pass it on</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="A campus-inspired illustration of useful student essentials">
            <div className="visual-topline"><span>THE CAMPUS CYCLE</span><span>NO. 01 — REUSE</span></div>
            <div className="visual-circle">
              <div className="visual-sticker sticker-book"><BookOpen size={24} /><span>Read<br />again</span></div>
              <div className="visual-sun" />
              <div className="visual-plant plant-left"><i /><i /><i /></div>
              <div className="visual-plant plant-right"><i /><i /><i /></div>
              <div className="visual-crate"><span className="crate-stamp">GOOD<br />STUFF</span><div className="crate-lines" /></div>
              <div className="visual-item item-book"><span /><span /><span /></div>
              <div className="visual-item item-lamp"><i /><b /></div>
              <div className="visual-item item-pencil"><i /></div>
              <div className="visual-sticker sticker-price"><Tag size={15} /> STILL USEFUL</div>
            </div>
            <div className="visual-caption"><span>A SMALLER FOOTPRINT.</span><span>A BETTER DEAL.</span><ArrowDownRight size={17} /></div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="eyebrow text-campus-700">A BETTER WAY TO PASS IT ON</p>
          <h2 className="section-title mt-4">One campus.<br />A thousand second chances.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="step-card"><span className="step-number">01</span><h3>Find your next thing</h3><p>Browse useful finds from people just down the hall.</p></article>
          <article className="step-card"><span className="step-number">02</span><h3>Make it yours</h3><p>Ask a question, place a bid, and agree on a handoff.</p></article>
          <article className="step-card"><span className="step-number">03</span><h3>Keep it in motion</h3><p>When you’re done, pass it on to another student.</p></article>
        </div>
      </section>

      <section className="role-section">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div><p className="eyebrow text-campus-700">PICK YOUR SIDE</p><h2 className="section-title mt-3">What brings you by?</h2></div>
          <p className="max-w-md text-slate-600">One community, two simple ways to make campus life a little better.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="role-card buyer-card">
            <div className="role-icon"><CircleDollarSign size={23} /></div>
            <p className="role-kicker">FOR THE FINDERS</p>
            <h3>Something good<br />is up for grabs.</h3>
            <p className="role-copy">Explore student listings, get the details, and bid on the things you’ll actually use.</p>
            <Link to={user?.role === 'buyer' ? '/buyer/marketplace' : '/register?role=buyer'} className="role-link">{user?.role === 'buyer' ? 'Browse the marketplace' : 'Join as a buyer'} <ArrowRight size={17} /></Link>
            <div className="role-decoration buyer-decoration"><span>01</span><span>FIND A GEM</span></div>
          </article>
          <article className="role-card seller-card">
            <div className="role-icon"><Store size={23} /></div>
            <p className="role-kicker">FOR THE PASS-IT-ON-ERS</p>
            <h3>Clear some space.<br />Make someone’s day.</h3>
            <p className="role-copy">List what you no longer need and let fellow students give it a new chapter.</p>
            <Link to={user?.role === 'seller' ? '/seller/dashboard' : '/register?role=seller'} className="role-link">{user?.role === 'seller' ? 'Open my seller desk' : 'Join as a seller'} <ArrowRight size={17} /></Link>
            <div className="role-decoration seller-decoration"><span>02</span><span>PASS IT ON</span></div>
          </article>
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-copy"><BadgeCheck size={23} /><div><h2>Closer deals. More trust.</h2><p>Every exchange starts with a shared campus community.</p></div></div>
        <div className="trust-point"><TimerReset size={19} /><span>Real-time auctions</span></div>
        <div className="trust-point"><Handshake size={19} /><span>Campus meetups</span></div>
        {!loading && !user && <Link to="/register" className="trust-join">Join your campus <ArrowRight size={16} /></Link>}
      </section>
    </div>
  );
}
