const express = require('express');
const { getMyProfile, getMyAuctions, getMyBids } = require('../controllers/userController');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.get('/me', auth, getMyProfile);
router.get('/me/auctions', auth, getMyAuctions);
router.get('/me/bids', auth, getMyBids);

module.exports = router;
