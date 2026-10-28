const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

const getMyProfile = async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
};

const getMyAuctions = async (req, res, next) => {
  try {
    const auctions = await Auction.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ auctions });
  } catch (error) {
    next(error);
  }
};

const getMyBids = async (req, res, next) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id }).populate('auction').sort({ createdAt: -1 });
    res.json({ bids });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyProfile, getMyAuctions, getMyBids };
