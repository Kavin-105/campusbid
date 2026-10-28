const express = require('express');
const { listAuctions, getAuctionById, createAuction, updateAuction, placeBidOnAuction, addQuestion, answerQuestion, decideAuctionOutcome, getDashboard } = require('../controllers/auctionController');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
router.get('/', listAuctions);
router.get('/dashboard', auth, getDashboard);
router.get('/:id', getAuctionById);
router.post('/', auth, requireRole('seller'), createAuction);
router.put('/:id', auth, requireRole('seller'), updateAuction);
router.post('/:id/bid', auth, requireRole('buyer'), placeBidOnAuction);
router.post('/:id/questions', auth, requireRole('buyer', 'seller'), addQuestion);
router.post('/:id/questions/:questionId/answer', auth, requireRole('seller'), answerQuestion);
router.patch('/:id/decision', auth, requireRole('seller'), decideAuctionOutcome);

module.exports = router;
