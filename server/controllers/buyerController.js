const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const AutoBidRule = require('../models/AutoBidRule');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Watchlist = require('../models/Watchlist');
const Handover = require('../models/Handover');
const { createNotification, runAutomaticBids } = require('../services/auctionService');

const pagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
};

const validateMarketplaceQuery = (query, res) => {
  const stringKeys = ['status', 'category', 'condition', 'search', 'sort', 'activeOnly', 'upcoming', 'closingSoon', 'noBids', 'minPrice', 'maxPrice', 'page', 'limit'];
  if (stringKeys.some((key) => query[key] !== undefined && typeof query[key] !== 'string')) {
    res.status(400).json({ message: 'Marketplace filter values must be single strings.' });
    return false;
  }
  const allowedStatuses = ['all', 'scheduled', 'active', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'];
  const allowedCategories = ['all', 'bicycles', 'calculators', 'books', 'electronics', 'stationery', 'hostel essentials', 'other'];
  const allowedConditions = ['new', 'like new', 'good', 'fair', 'needs repair'];
  const allowedSorts = ['newest', 'endingSoon', 'lowestPrice', 'highestPrice'];
  if (query.status && !allowedStatuses.includes(query.status)) {
    res.status(400).json({ message: 'Invalid auction status filter.' });
    return false;
  }
  if (query.category && !allowedCategories.includes(query.category)) {
    res.status(400).json({ message: 'Invalid category filter.' });
    return false;
  }
  if (query.condition && !allowedConditions.includes(query.condition)) {
    res.status(400).json({ message: 'Invalid condition filter.' });
    return false;
  }
  if (query.sort && !allowedSorts.includes(query.sort)) {
    res.status(400).json({ message: 'Invalid sorting option.' });
    return false;
  }
  for (const key of ['activeOnly', 'upcoming', 'closingSoon', 'noBids']) {
    if (query[key] !== undefined && !['true', 'false'].includes(query[key])) {
      res.status(400).json({ message: `Invalid ${key} filter.` });
      return false;
    }
  }
  if (query.search && query.search.length > 120) {
    res.status(400).json({ message: 'Search text must be 120 characters or fewer.' });
    return false;
  }
  return true;
};

const buildAuctionFilter = (query) => {
  const filter = {};
  const now = new Date();
  const requestedStatus = query.status;
  let statuses = requestedStatus && requestedStatus !== 'all'
    ? [requestedStatus]
    : ['scheduled', 'active', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'];

  if (query.category && query.category !== 'all') filter.category = query.category;
  if (query.condition) filter.condition = query.condition;
  if (query.activeOnly === 'true') {
    statuses = statuses.filter((status) => status === 'active');
    filter.startTime = { $lte: now };
  }
  if (query.upcoming === 'true') {
    statuses = statuses.filter((status) => status === 'scheduled');
    filter.startTime = { $gt: now };
  }
  if (query.closingSoon === 'true') {
    statuses = statuses.filter((status) => status === 'active');
    filter.endTime = { $gt: now, $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
  }
  filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  if (query.noBids === 'true') filter.bidCount = 0;

  if (query.minPrice || query.maxPrice) {
    filter.currentPrice = {};
    if (query.minPrice) filter.currentPrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.currentPrice.$lte = Number(query.maxPrice);
  }
  if (query.search) {
    const maxPricePhrase = String(query.search).match(/\b(?:under|below|less than)\s*₹?\s*([\d,]+)/i);
    if (maxPricePhrase) {
      filter.currentPrice = filter.currentPrice || {};
      const phraseMaximum = Number(maxPricePhrase[1].replace(/,/g, ''));
      if (Number.isFinite(phraseMaximum)) {
        filter.currentPrice.$lte = filter.currentPrice.$lte === undefined
          ? phraseMaximum
          : Math.min(filter.currentPrice.$lte, phraseMaximum);
      }
    }
    const searchText = String(query.search).replace(/\b(?:under|below|less than)\s*₹?\s*[\d,]+/i, '').trim();
    const terms = searchText.split(/\s+/).filter(Boolean).map((term) => (
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ));
    if (terms.length) {
      filter.$and = terms.map((term) => ({
        $or: [
          { title: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } }
        ]
      }));
    }
  }
  return filter;
};

const getMarketplace = async (req, res, next) => {
  try {
    if (!validateMarketplaceQuery(req.query, res)) return;
    for (const key of ['minPrice', 'maxPrice']) {
      if (req.query[key] !== undefined && (!Number.isFinite(Number(req.query[key])) || Number(req.query[key]) < 0)) {
        return res.status(400).json({ message: `${key} must be a non-negative number.` });
      }
    }
    if (req.query.minPrice !== undefined && req.query.maxPrice !== undefined
      && Number(req.query.maxPrice) < Number(req.query.minPrice)) {
      return res.status(400).json({ message: 'Maximum price must be greater than or equal to minimum price.' });
    }
    const { page, limit, skip } = pagination(req.query);
    const filter = buildAuctionFilter(req.query);
    const sortMap = {
      endingSoon: { endTime: 1 },
      lowestPrice: { currentPrice: 1, createdAt: -1 },
      highestPrice: { currentPrice: -1, createdAt: -1 },
      newest: { createdAt: -1 }
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;
    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .populate('seller', 'name college avatar')
        .populate('currentLeader', 'name college')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Auction.countDocuments(filter)
    ]);
    const watchedIds = await Watchlist.distinct('auction', {
      user: req.user._id,
      auction: { $in: auctions.map((auction) => auction._id) }
    });
    const watched = new Set(watchedIds.map(String));
    const items = auctions.map((auction) => ({
      ...auction.toObject(),
      isWatching: watched.has(String(auction._id))
    }));

    res.json({
      items,
      auctions: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getAuctionDetails = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('seller', 'name college avatar')
      .populate('currentLeader', 'name college avatar')
      .populate('provisionalWinner', 'name college avatar');
    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    const [bids, questions, watching, handover, buyerAutoBid] = await Promise.all([
      Bid.find({ auction: auction._id }).populate('bidder', 'name college avatar').sort({ createdAt: -1 }),
      Question.find({ auction: auction._id }).populate('askedBy', 'name').sort({ createdAt: -1 }),
      Watchlist.exists({ user: req.user._id, auction: auction._id }),
      req.user.role === 'seller' && String(auction.seller._id) === String(req.user._id)
        ? Handover.findOne({ auction: auction._id }).populate('buyer', 'name college')
        : Promise.resolve(null),
      req.user.role === 'buyer'
        ? AutoBidRule.findOne({ auction: auction._id, bidder: req.user._id }).select('maximumAmount isActive')
        : Promise.resolve(null)
    ]);
    const answers = await Answer.find({ question: { $in: questions.map((item) => item._id) } })
      .populate('answeredBy', 'name')
      .sort({ createdAt: 1 });
    const answerByQuestion = new Map(answers.map((answer) => [String(answer.question), answer]));
    const questionsWithAnswers = questions.map((question) => ({
      ...question.toObject(),
      answer: answerByQuestion.get(String(question._id)) || null
    }));

    res.json({
      auction: {
        ...auction.toObject(),
        isWatching: Boolean(watching),
        handover,
        autoBidActive: Boolean(buyerAutoBid?.isActive),
        autoBidMaximumAmount: buyerAutoBid?.maximumAmount ?? null
      },
      bids,
      recentBids: bids,
      questions: questionsWithAnswers
    });
  } catch (error) {
    next(error);
  }
};

const getAuctionBids = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id).select('_id');
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    const bids = await Bid.find({ auction: auction._id })
      .populate('bidder', 'name college avatar')
      .sort({ amount: -1, createdAt: 1 });
    res.json({ bids });
  } catch (error) {
    next(error);
  }
};

const getBuyerDashboard = async (req, res, next) => {
  try {
    const buyerId = req.user._id;
    const bidAuctions = await Bid.distinct('auction', { bidder: buyerId });
    const [auctions, activeAutoBids, watchlistCount, handoverCounts, recentAuctions] = await Promise.all([
      Auction.find({ _id: { $in: bidAuctions } }).populate('seller', 'name college').sort({ endTime: 1 }),
      AutoBidRule.countDocuments({ bidder: buyerId, isActive: true }),
      Watchlist.countDocuments({ user: buyerId }),
      Handover.aggregate([
        { $match: { buyer: buyerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Auction.find({ status: { $in: ['active', 'scheduled'] } }).populate('seller', 'name college').sort({ createdAt: -1 }).limit(6)
    ]);
    const [closingSoon, allBids] = await Promise.all([
      Auction.countDocuments({ _id: { $in: bidAuctions }, status: 'active', endTime: { $gt: new Date(), $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) } }),
      Bid.countDocuments({ bidder: buyerId })
    ]);
    const handovers = Object.fromEntries(handoverCounts.map((entry) => [entry._id, entry.count]));
    const leading = auctions.filter((auction) => String(auction.currentLeader || '') === String(buyerId));
    const openBids = auctions.filter((auction) => ['active', 'scheduled', 'awaiting seller decision'].includes(auction.status));
    res.json({
      stats: {
        activeBids: openBids.length,
        leading: leading.length,
        outbid: openBids.length - leading.length,
        closingSoon,
        automaticBids: activeAutoBids,
        reserved: (handovers.pending || 0) + (handovers.scheduled || 0),
        completedPurchases: handovers.completed || 0,
        savedItems: watchlistCount,
        totalAcceptedBids: allBids
      },
      recentAuctions
    });
  } catch (error) {
    next(error);
  }
};

const getBuyerBids = async (req, res, next) => {
  try {
    const statuses = ['scheduled', 'active', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'];
    if (req.query.status !== undefined && (typeof req.query.status !== 'string' || !statuses.includes(req.query.status))) {
      return res.status(400).json({ message: 'Invalid auction status filter.' });
    }
    if (req.query.result !== undefined && (typeof req.query.result !== 'string' || !['leading', 'outbid'].includes(req.query.result))) {
      return res.status(400).json({ message: 'Invalid bid result filter.' });
    }
    const { page, limit, skip } = pagination(req.query);
    const auctionIds = await Bid.distinct('auction', { bidder: req.user._id });
    const filter = { _id: { $in: auctionIds } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.result === 'leading') filter.currentLeader = req.user._id;
    if (req.query.result === 'outbid') filter.currentLeader = { $ne: req.user._id };
    const [auctions, total] = await Promise.all([
      Auction.find(filter).populate('seller', 'name college').populate('currentLeader', 'name').sort({ endTime: 1 }).skip(skip).limit(limit),
      Auction.countDocuments(filter)
    ]);
    const rows = await Promise.all(auctions.map(async (auction) => {
      const bid = await Bid.findOne({ auction: auction._id, bidder: req.user._id }).sort({ createdAt: -1 });
      const leaderId = auction.currentLeader?._id || auction.currentLeader;
      return { auction, latestBid: bid, isLeading: String(leaderId || '') === String(req.user._id) };
    }));
    res.json({ items: rows, bids: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

const getWatchlist = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const [entries, total] = await Promise.all([
      Watchlist.find({ user: req.user._id }).populate({
        path: 'auction',
        populate: [{ path: 'seller', select: 'name college avatar' }, { path: 'currentLeader', select: 'name college' }]
      }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Watchlist.countDocuments({ user: req.user._id })
    ]);
    const items = entries.filter((entry) => entry.auction).map((entry) => ({ ...entry.auction.toObject(), watchlistId: entry._id }));
    res.json({ items, auctions: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

const addWatchlistItem = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.auctionId).select('_id');
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    await Watchlist.findOneAndUpdate(
      { user: req.user._id, auction: auction._id },
      { $setOnInsert: { user: req.user._id, auction: auction._id } },
      { upsert: true, new: true }
    );
    res.status(201).json({ message: 'Auction added to watchlist' });
  } catch (error) {
    next(error);
  }
};

const removeWatchlistItem = async (req, res, next) => {
  try {
    await Watchlist.deleteOne({ user: req.user._id, auction: req.params.auctionId });
    res.json({ message: 'Auction removed from watchlist' });
  } catch (error) {
    next(error);
  }
};

const getBuyerPurchases = async (req, res, next) => {
  try {
    const handovers = await Handover.find({ buyer: req.user._id })
      .populate('auction')
      .populate('seller', 'name college')
      .sort({ updatedAt: -1 });
    res.json({ items: handovers, purchases: handovers });
  } catch (error) {
    next(error);
  }
};

const setAutoBid = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (String(auction.seller) === String(req.user._id)) return res.status(403).json({ message: 'You cannot bid on your own listing' });
    const now = new Date();
    const isScheduled = auction.status === 'scheduled' && auction.endTime > now;
    const isActive = auction.status === 'active'
      && auction.startTime <= now
      && auction.endTime > now;
    if (!isScheduled && !isActive) {
      return res.status(409).json({ message: 'Automatic bidding is available for scheduled or active auctions.' });
    }
    const maximumAmount = Number(req.body.maximumAmount);
    const minimumAmount = auction.bidCount === 0 ? auction.startingPrice : auction.currentPrice + auction.minimumBidIncrement;
    if (!Number.isFinite(maximumAmount) || maximumAmount < minimumAmount) {
      return res.status(400).json({ message: `Maximum bid must be at least ₹${minimumAmount}.` });
    }
    const rule = await AutoBidRule.findOneAndUpdate(
      { auction: auction._id, bidder: req.user._id },
      { $set: { maximumAmount, isActive: true } },
      { new: true, upsert: true, runValidators: true }
    );
    const updatedAuction = isActive
      ? await runAutomaticBids({
        auction: await Auction.findById(auction._id),
        io: req.app.locals.io
      })
      : auction;
    res.status(201).json({
      rule: { _id: rule._id, auction: rule.auction, maximumAmount: rule.maximumAmount, isActive: rule.isActive },
      currentPrice: updatedAuction.currentPrice,
      startsAt: isScheduled ? auction.startTime : null
    });
  } catch (error) {
    next(error);
  }
};

const cancelAutoBid = async (req, res, next) => {
  try {
    const rule = await AutoBidRule.findOneAndUpdate(
      { auction: req.params.auctionId, bidder: req.user._id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    ).select('_id auction isActive');
    if (!rule) return res.status(404).json({ message: 'No active automatic bid exists for this auction.' });
    res.json({ rule });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addWatchlistItem,
  getAuctionBids,
  getAuctionDetails,
  getBuyerBids,
  getBuyerDashboard,
  getBuyerPurchases,
  getMarketplace,
  getWatchlist,
  removeWatchlistItem,
  setAutoBid,
  cancelAutoBid
};
