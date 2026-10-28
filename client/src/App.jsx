import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuctionPage from './pages/AuctionPage';
import CreateAuctionPage from './pages/CreateAuctionPage';
import MarketplacePage from './pages/MarketplacePage';
import BidHistoryPage from './pages/BidHistoryPage';
import {
  BuyerDashboardPage, SellerListingsPage, SellerSalesHistoryPage, AuctionManagementPage,
  WatchlistPage, NotificationsPage, PurchasesPage, ProfilePage, SellerDashboardPage
} from './pages/WorkspacePages';

export const roleHome = (role) => role === 'seller' ? '/seller/dashboard' : '/buyer/dashboard';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-state" role="status">Loading your CampusBid account…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-state" role="status">Loading your CampusBid account…</div>;
  return user ? <Navigate to={roleHome(user.role)} replace /> : children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={roleHome(user?.role)} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/marketplace" element={<Navigate to="/buyer/marketplace" replace />} />
            <Route path="/auction/:id" element={<PrivateRoute><AuctionPage /></PrivateRoute>} />
            <Route path="/create" element={<Navigate to="/seller/create-listing" replace />} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />
            <Route path="/my-bids" element={<Navigate to="/buyer/my-bids" replace />} />
            <Route path="/buyer/dashboard" element={<PrivateRoute role="buyer"><BuyerDashboardPage /></PrivateRoute>} />
            <Route path="/buyer/marketplace" element={<PrivateRoute role="buyer"><MarketplacePage /></PrivateRoute>} />
            <Route path="/buyer/my-bids" element={<PrivateRoute role="buyer"><BidHistoryPage /></PrivateRoute>} />
            <Route path="/buyer/watchlist" element={<PrivateRoute role="buyer"><WatchlistPage /></PrivateRoute>} />
            <Route path="/buyer/notifications" element={<PrivateRoute role="buyer"><NotificationsPage /></PrivateRoute>} />
            <Route path="/buyer/purchases" element={<PrivateRoute role="buyer"><PurchasesPage /></PrivateRoute>} />
            <Route path="/buyer/profile" element={<PrivateRoute role="buyer"><ProfilePage /></PrivateRoute>} />
            <Route path="/seller/dashboard" element={<PrivateRoute role="seller"><SellerDashboardPage /></PrivateRoute>} />
            <Route path="/seller/create-listing" element={<PrivateRoute role="seller"><CreateAuctionPage /></PrivateRoute>} />
            <Route path="/seller/my-listings" element={<PrivateRoute role="seller"><SellerListingsPage /></PrivateRoute>} />
            <Route path="/seller/sales-history" element={<PrivateRoute role="seller"><SellerSalesHistoryPage /></PrivateRoute>} />
            <Route path="/seller/sales-history/:auctionId" element={<PrivateRoute role="seller"><SellerSalesHistoryPage /></PrivateRoute>} />
            <Route path="/seller/auction-management" element={<PrivateRoute role="seller"><AuctionManagementPage /></PrivateRoute>} />
            <Route path="/seller/notifications" element={<PrivateRoute role="seller"><NotificationsPage /></PrivateRoute>} />
            <Route path="/seller/profile" element={<PrivateRoute role="seller"><ProfilePage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
