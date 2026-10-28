const express = require('express');
const authRoutes = require('./authRoutes');
const {
  answerQuestion,
  addQuestion,
  createAuction,
  placeBidOnAuction,
  updateAuction
} = require('../controllers/auctionController');
const {
  addWatchlistItem,
  cancelAutoBid,
  getAuctionBids,
  getAuctionDetails,
  getBuyerBids,
  getBuyerDashboard,
  getBuyerPurchases,
  getMarketplace,
  getSavedSearches,
  getWatchlist,
  removeWatchlistItem,
  createSavedSearch,
  deleteSavedSearch,
  setAutoBid
} = require('../controllers/buyerController');
const {
  approveWinner,
  cancelAuction,
  getSellerAuctions,
  getSellerDashboard,
  getSellerSaleDetails,
  getSellerSalesHistory,
  rejectWinner
} = require('../controllers/sellerController');
const {
  confirmHandover,
  getHandovers,
  getNotifications,
  getProfile,
  markAllNotificationsRead,
  markNotificationRead,
  reportHandoverFailure,
  scheduleHandover
} = require('../controllers/workflowController');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { imageUpload } = require('../middleware/upload');

const router = express.Router();
const buyer = [auth, requireRole('buyer')];
const seller = [auth, requireRole('seller')];
const campusUser = [auth, requireRole('buyer', 'seller')];

router.use('/auth', authRoutes);
router.get('/profile', auth, getProfile);

router.get('/auctions', ...buyer, getMarketplace);
router.get('/auctions/:id', ...campusUser, getAuctionDetails);
router.get('/auctions/:id/bids', ...campusUser, getAuctionBids);
router.post('/auctions', ...seller, imageUpload, createAuction);
router.patch('/auctions/:id', ...seller, imageUpload, updateAuction);
router.post('/auctions/:id/cancel', ...seller, cancelAuction);
router.post('/auctions/:id/approve-winner', ...seller, approveWinner);
router.post('/auctions/:id/reject-winner', ...seller, rejectWinner);
router.post('/auctions/:id/bids', ...buyer, placeBidOnAuction);
router.post('/auctions/:id/autobids', ...buyer, setAutoBid);
router.delete('/buyer/autobids/:auctionId', ...buyer, cancelAutoBid);
router.post('/auctions/:id/questions', ...campusUser, addQuestion);
router.post('/auctions/:id/questions/:questionId/answer', ...seller, answerQuestion);

router.get('/seller/dashboard', ...seller, getSellerDashboard);
router.get('/seller/auctions', ...seller, getSellerAuctions);
router.get('/seller/sales-history', ...seller, getSellerSalesHistory);
router.get('/seller/sales-history/:auctionId', ...seller, getSellerSaleDetails);

router.get('/buyer/dashboard', ...buyer, getBuyerDashboard);
router.get('/buyer/bids', ...buyer, getBuyerBids);
router.get('/buyer/watchlist', ...buyer, getWatchlist);
router.post('/buyer/watchlist/:auctionId', ...buyer, addWatchlistItem);
router.delete('/buyer/watchlist/:auctionId', ...buyer, removeWatchlistItem);
router.get('/buyer/purchases', ...buyer, getBuyerPurchases);
router.get('/buyer/saved-searches', ...buyer, getSavedSearches);
router.post('/buyer/saved-searches', ...buyer, createSavedSearch);
router.delete('/buyer/saved-searches/:id', ...buyer, deleteSavedSearch);

router.get('/notifications', ...campusUser, getNotifications);
router.patch('/notifications/:id/read', ...campusUser, markNotificationRead);
router.post('/notifications/read-all', ...campusUser, markAllNotificationsRead);
router.get('/handovers', ...campusUser, getHandovers);
router.patch('/handovers/:id/schedule', ...campusUser, scheduleHandover);
router.post('/handovers/:id/confirm', ...campusUser, confirmHandover);
router.post('/handovers/:id/report-failure', ...campusUser, reportHandoverFailure);

module.exports = router;
