import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, LogOut, Menu, Store, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const closeMenu = () => setMenuOpen(false);
  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };
  const navClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;
  const profilePath = user?.role === 'seller' ? '/seller/profile' : '/buyer/profile';

  return (
    <div className="min-h-screen bg-[#f7f8f2] text-slate-900">
      <header className="site-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" onClick={closeMenu} className="brand-mark" aria-label="CampusBid home">
            <span className="brand-icon"><Store size={19} strokeWidth={2.5} /></span>
            <span>campus<span className="text-campus-700">bid</span><small>STUDENT MARKETPLACE</small></span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            <NavLink to="/" className={navClass}>Overview</NavLink>
            {user?.role === 'buyer' && <><NavLink to="/buyer/dashboard" className={navClass}>Dashboard</NavLink><NavLink to="/buyer/marketplace" className={navClass}>Marketplace</NavLink><NavLink to="/buyer/my-bids" className={navClass}>My bids</NavLink><NavLink to="/buyer/watchlist" className={navClass}>Watchlist</NavLink><NavLink to="/buyer/purchases" className={navClass}>Purchases</NavLink><NavLink to="/buyer/notifications" className={navClass}>Alerts</NavLink></>}
            {user?.role === 'seller' && (
              <>
                <NavLink to="/seller/dashboard" className={navClass}>Dashboard</NavLink>
                <NavLink to="/seller/my-listings" className={navClass}>My listings</NavLink>
                <NavLink to="/seller/auction-management" className={navClass}>Auctions</NavLink>
                <NavLink to="/seller/sales-history" className={navClass}>Sales</NavLink>
                <NavLink to="/seller/create-listing" className={navClass}>List an item</NavLink>
                <NavLink to="/seller/notifications" className={navClass}>Alerts</NavLink>
              </>
            )}
          </nav>
          <div className="hidden items-center gap-3 xl:flex">
            {user ? (
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-campus-600">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-campus-800"><UserRound size={18} /></span>
                  <span className="text-right"><span className="block text-sm font-semibold text-slate-800">{user.name}</span><span className="block text-xs capitalize text-slate-500">{user.role} account</span></span>
                  <ChevronDown size={16} className="text-slate-500" />
                </summary>
                <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <Link to={profilePath} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); }}>
                    <UserRound size={16} /> Profile
                  </Link>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50" onClick={handleLogout}>
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              </details>
            ) : (
              !loading && <><Link to="/login" className="secondary-btn">Log in</Link><Link to="/register" className="primary-btn">Join CampusBid <ArrowRight size={16} className="ml-2" /></Link></>
            )}
          </div>
          <button type="button" className="mobile-menu-button xl:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {menuOpen && <nav className="mobile-menu xl:hidden" aria-label="Mobile navigation">
          <NavLink to="/" onClick={closeMenu} className={navClass}>Overview</NavLink>
          {user?.role === 'buyer' && <><NavLink to="/buyer/dashboard" onClick={closeMenu} className={navClass}>Dashboard</NavLink><NavLink to="/buyer/marketplace" onClick={closeMenu} className={navClass}>Marketplace</NavLink><NavLink to="/buyer/my-bids" onClick={closeMenu} className={navClass}>My bids</NavLink><NavLink to="/buyer/watchlist" onClick={closeMenu} className={navClass}>Watchlist</NavLink><NavLink to="/buyer/purchases" onClick={closeMenu} className={navClass}>Purchases</NavLink><NavLink to="/buyer/notifications" onClick={closeMenu} className={navClass}>Alerts</NavLink></>}
          {user?.role === 'seller' && <><NavLink to="/seller/dashboard" onClick={closeMenu} className={navClass}>Dashboard</NavLink><NavLink to="/seller/my-listings" onClick={closeMenu} className={navClass}>My listings</NavLink><NavLink to="/seller/auction-management" onClick={closeMenu} className={navClass}>Auctions</NavLink><NavLink to="/seller/sales-history" onClick={closeMenu} className={navClass}>Sales</NavLink><NavLink to="/seller/create-listing" onClick={closeMenu} className={navClass}>List an item</NavLink><NavLink to="/seller/notifications" onClick={closeMenu} className={navClass}>Alerts</NavLink></>}
          {user ? <details className="mt-2 border-t border-slate-200 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-campus-600">
              <span><span className="block text-sm font-semibold text-slate-800">{user.name}</span><span className="block text-xs capitalize text-slate-500">{user.role} account</span></span>
              <ChevronDown size={16} className="text-slate-500" />
            </summary>
            <div className="mt-1 grid gap-1 pl-3">
              <Link to={profilePath} onClick={closeMenu} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50"><UserRound size={16} /> Profile</Link>
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50" onClick={handleLogout}><LogOut size={16} /> Log out</button>
            </div>
          </details> : <div className="grid grid-cols-2 gap-3"><Link to="/login" onClick={closeMenu} className="secondary-btn">Log in</Link><Link to="/register" onClick={closeMenu} className="primary-btn">Join us</Link></div>}
        </nav>}
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>Made for campus life. <span className="font-semibold text-slate-700">Built for the next student.</span></p>
          <p>© {new Date().getFullYear()} CampusBid <span className="mx-2 text-slate-300">/</span> Buy well. Pass it on.</p>
        </div>
      </footer>
    </div>
  );
}
