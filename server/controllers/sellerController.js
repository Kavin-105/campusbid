const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Handover = require('../models/Handover');
const { createNotification } = require('../services/auctionService');

const pageOptions = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
};

const getSellerDashboard = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const auctions = await Auction.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(8)
      .populate('currentLeader', 'name');
    const handovers = await Handover.find({ seller: sellerId, status: { $in: ['pending', 'scheduled'] } })
      .populate('auction', 'title status approvedFinalPrice')
      .populate('buyer', 'name')
      .sort({ scheduledAt: 1 })
      .limit(8);
    const [statusCounts, handoverCounts, recentSales] = await Promise.all([
      Auction.aggregate([
        { $match: { seller: sellerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Handover.aggregate([
        { $match: { seller: sellerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Auction.find({ seller: sellerId, status: 'sold' }).sort({ completedAt: -1 }).limit(5)
    ]);
    const countByStatus = Object.fromEntries(statusCounts.map((entry) => [entry._id, entry.count]));
    const handoverByStatus = Object.fromEntries(handoverCounts.map((entry) => [entry._id, entry.count]));
    const completedSales = await Auction.aggregate([
      { $match: { seller: sellerId, status: 'sold' } },
      { $lookup: { from: Handover.collection.name, localField: '_id', foreignField: 'auction', as: 'handover' } },
      { $match: { 'handover.status': 'completed' } },
      { $group: { _id: null, revenue: { $sum: '$approvedFinalPrice' }, count: { $sum: 1 } } }
    ]);
    const endingSoon = await Auction.find({
      seller: sellerId,
      status: 'active',
      endTime: { $gt: new Date(), $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    }).populate('currentLeader', 'name').sort({ endTime: 1 }).limit(8);
    const pendingDecisions = await Auction.find({ seller: sellerId, status: 'awaiting seller decision' })
      .populate('provisionalWinner', 'name')
      .sort({ endTime: 1 });
    const total = completedSales[0] || { count: 0, revenue: 0 };

    res.json({
      stats: {
        totalListed: Object.values(countByStatus).reduce((sum, count) => sum + count, 0),
        active: countByStatus.active || 0,
        upcoming: countByStatus.scheduled || 0,
        closed: (countByStatus['awaiting seller decision'] || 0) + (countByStatus.reserved || 0) + (countByStatus.sold || 0) + (countByStatus.unsold || 0) + (countByStatus.cancelled || 0) + (countByStatus['failed pickup'] || 0),
        sold: total.count,
        reserved: countByStatus.reserved || 0,
        unsold: countByStatus.unsold || 0,
        revenue: total.revenue,
        pendingHandovers: handoverByStatus.pending || 0,
        failedPickups: handoverByStatus.failed || 0
      },
      recentListings: auctions,
      recentSales,
      endingSoon,
      pendingDecisions,
      handovers
    });
  } catch (error) {
    next(error);
  }
};

const getSellerAuctions = async (req, res, next) => {
  try {
    if (req.query.status !== undefined && typeof req.query.status !== 'string') {
      return res.status(400).json({ message: 'Status must be a single value.' });
    }
    if (req.query.sort !== undefined && !['newest', 'closing', 'highestBid', 'ending', 'price'].includes(req.query.sort)) {
      return res.status(400).json({ message: 'Invalid listing sort option.' });
    }
    if (req.query.search !== undefined && (typeof req.query.search !== 'string' || req.query.search.length > 120)) {
      return res.status(400).json({ message: 'Search text must be 120 characters or fewer.' });
    }
    const { page, limit, skip } = pageOptions(req.query);
    const filter = { seller: req.user._id };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.search) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escaped, $options: 'i' };
    }
    const sortMap = {
      newest: { createdAt: -1 },
      closing: { endTime: 1 },
      ending: { endTime: 1 },
      price: { currentPrice: -1, createdAt: -1 },
      highestBid: { currentPrice: -1, createdAt: -1 }
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;
    const [items, total] = await Promise.all([
      Auction.find(filter).populate('currentLeader', 'name').sort(sort).skip(skip).limit(limit),
      Auction.countDocuments(filter)
    ]);
    res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

const buildSalesFilter = (req) => {
  const filter = { seller: req.user._id };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }
  if (req.query.outcome) {
    if (req.query.outcome === 'completed') filter.status = 'sold';
    else if (req.query.outcome === 'failed pickup') filter.status = 'failed pickup';
    else if (req.query.outcome === 'rejected') filter.outcome = 'rejected';
    else if (['unsold', 'cancelled', 'reserved', 'awaiting seller decision'].includes(req.query.outcome)) filter.status = req.query.outcome;
  }
  if (req.query.from || req.query.to) {
    filter.endTime = {};
    if (req.query.from) {
      filter.endTime.$gte = new Date(req.query.from);
      if (Number.isNaN(filter.endTime.$gte.getTime())) {
        const error = new Error('Invalid start date filter.');
        error.statusCode = 400;
        throw error;
      }
    }
    if (req.query.to) {
      filter.endTime.$lte = new Date(req.query.to);
      if (Number.isNaN(filter.endTime.$lte.getTime())) {
        const error = new Error('Invalid end date filter.');
        error.statusCode = 400;
        throw error;
      }
    }
    if (filter.endTime.$gte && filter.endTime.$lte && filter.endTime.$gte > filter.endTime.$lte) {
      const error = new Error('Start date must be before end date.');
      error.statusCode = 400;
      throw error;
    }
  }
  return filter;
};

const getSellerSalesHistory = async (req, res, next) => {
  try {
    const scalarFilters = ['category', 'search', 'outcome', 'from', 'to', 'sort', 'page', 'limit'];
    if (scalarFilters.some((key) => req.query[key] !== undefined && typeof req.query[key] !== 'string')) {
      return res.status(400).json({ message: 'Sales history filters must be single values.' });
    }
    if (req.query.sort && !['newest', 'oldest', 'price'].includes(req.query.sort)) {
      return res.status(400).json({ message: 'Invalid sales history sort option.' });
    }
    if (req.query.category && !['bicycles', 'calculators', 'books', 'electronics', 'stationery', 'hostel essentials', 'other'].includes(req.query.category)) {
      return res.status(400).json({ message: 'Invalid category filter.' });
    }
    if (req.query.outcome && !['completed', 'unsold', 'rejected', 'reserved', 'awaiting seller decision', 'cancelled', 'failed pickup'].includes(req.query.outcome)) {
      return res.status(400).json({ message: 'Invalid outcome filter.' });
    }
    if (req.query.search && req.query.search.length > 120) {
      return res.status(400).json({ message: 'Search text must be 120 characters or fewer.' });
    }
    const { page, limit, skip } = pageOptions(req.query);
    const filter = buildSalesFilter(req);
    const sortMap = {
      oldest: { endTime: 1 },
      price: { approvedFinalPrice: -1, endTime: -1 },
      newest: { endTime: -1 }
    };
    const [items, total, allAuctions, completed, revenue, unsold, cancelled, failedPickup, awaitingHandover] = await Promise.all([
      Auction.find(filter)
        .populate('provisionalWinner', 'name college avatar')
        .populate('currentLeader', 'name college avatar')
        .sort(sortMap[req.query.sort] || sortMap.newest)
        .skip(skip)
        .limit(limit),
      Auction.countDocuments(filter),
      Auction.countDocuments({ seller: req.user._id }),
      Auction.countDocuments({ seller: req.user._id, status: 'sold' }),
      Auction.aggregate([
        { $match: { seller: req.user._id, status: 'sold' } },
        { $lookup: { from: Handover.collection.name, localField: '_id', foreignField: 'auction', as: 'handover' } },
        { $match: { 'handover.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$approvedFinalPrice' } } }
      ]),
      Auction.countDocuments({ seller: req.user._id, status: 'unsold' }),
      Auction.countDocuments({ seller: req.user._id, status: 'cancelled' }),
      Auction.countDocuments({ seller: req.user._id, status: 'failed pickup' }),
      Handover.countDocuments({ seller: req.user._id, status: { $in: ['pending', 'scheduled'] } })
    ]);
    const itemsWithHandover = await Promise.all(items.map(async (auction) => {
      const handover = await Handover.findOne({ auction: auction._id }).select('scheduledAt completedAt status');
      return { ...auction.toObject(), handover };
    }));

    res.json({
      items: itemsWithHandover,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        totalAuctions: allAuctions,
        completedSales: completed,
        totalSalesValue: revenue[0]?.total || 0,
        awaitingHandover,
        unsold,
        cancelled,
        failedPickups: failedPickup
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSellerSaleDetails = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.auctionId, seller: req.user._id })
      .populate('provisionalWinner', 'name college avatar')
      .populate('currentLeader', 'name college avatar');
    if (!auction) return res.status(404).json({ message: 'Sale record not found' });
    const [bids, handover] = await Promise.all([
      Bid.find({ auction: auction._id }).populate('bidder', 'name college').sort({ createdAt: 1 }),
      Handover.findOne({ auction: auction._id }).populate('buyer', 'name college').populate('seller', 'name college')
    ]);
    res.json({ auction, bids, handover });
  } catch (error) {
    next(error);
  }
};

const cancelAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, seller: req.user._id });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!['scheduled', 'active'].includes(auction.status) || auction.bidCount > 0 || auction.endTime <= new Date()) {
      return res.status(409).json({ message: 'Only auctions without bids can be cancelled before they start or while active.' });
    }
    auction.status = 'cancelled';
    auction.outcome = 'cancelled';
    auction.cancellationReason = String(req.body.reason || '').trim().slice(0, 500);
    await auction.save();
    await createNotification(req.user._id, auction._id, 'auction', `Your listing ${auction.title} was cancelled.`);
    if (req.app.locals.io) req.app.locals.io.to(String(auction._id)).emit('auction-updated', { auctionId: auction._id, status: auction.status });
    res.json({ auction });
  } catch (error) {
    next(error);
  }
};

const approveWinner = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, seller: req.user._id });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'awaiting seller decision' || !auction.provisionalWinner) {
      return res.status(409).json({ message: 'There is no provisional winner to approve.' });
    }
    const highestBid = await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 });
    if (!highestBid || String(highestBid.bidder) !== String(auction.provisionalWinner)) {
      return res.status(409).json({ message: 'The current highest accepted bid is not available.' });
    }

    auction.status = 'reserved';
    auction.outcome = 'won';
    auction.approvedFinalPrice = highestBid.amount;
    auction.decisionAt = new Date();
    await auction.save();
    const handover = await Handover.findOneAndUpdate(
      { auction: auction._id },
      { $setOnInsert: { auction: auction._id, seller: req.user._id, buyer: highestBid.bidder, status: 'pending' } },
      { new: true, upsert: true }
    );
    await createNotification(highestBid.bidder, auction._id, 'auction', `Your winning bid on ${auction.title} was approved. Arrange the campus handover.`);
    await createNotification(req.user._id, auction._id, 'auction', `You approved the winning bid for ${auction.title}.`);
    if (req.app.locals.io) {
      req.app.locals.io.to(String(auction._id)).emit('auction-updated', {
        auctionId: auction._id,
        status: auction.status,
        approvedFinalPrice: auction.approvedFinalPrice
      });
    }
    res.json({ auction, handover });
  } catch (error) {
    next(error);
  }
};

const rejectWinner = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, seller: req.user._id });
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'awaiting seller decision' || !auction.provisionalWinner) {
      return res.status(409).json({ message: 'There is no provisional winner to reject.' });
    }
    const winner = auction.provisionalWinner;
    auction.status = 'unsold';
    auction.outcome = 'rejected';
    auction.decisionAt = new Date();
    await auction.save();
    await createNotification(winner, auction._id, 'auction', `The seller declined the winning bid on ${auction.title}.`);
    if (req.app.locals.io) {
      req.app.locals.io.to(String(auction._id)).emit('auction-updated', {
        auctionId: auction._id,
        status: auction.status,
        outcome: auction.outcome
      });
    }
    res.json({ auction });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  approveWinner,
  cancelAuction,
  getSellerDashboard,
  getSellerSaleDetails,
  getSellerSalesHistory,
  getSellerAuctions,
  rejectWinner
};
