const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Notification = require('../models/Notification');
const Handover = require('../models/Handover');
const { placeBid } = require('../services/auctionService');

const getRetainedImages = (value) => {
  if (value === undefined || value === null || value === '') return [];
  let images = value;
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch (error) {
      const invalid = new Error('Existing images must be provided as a list.');
      invalid.statusCode = 400;
      throw invalid;
    }
  }
  if (!Array.isArray(images) || images.length > 6 || images.some((image) => (
    typeof image !== 'string' || !/^\/uploads\/[A-Za-z0-9._-]+$/.test(image)
  ))) {
    const invalid = new Error('Only previously uploaded local images can be retained.');
    invalid.statusCode = 400;
    throw invalid;
  }
  return images;
};

const listAuctions = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } }
      ];
    }

    const auctions = await Auction.find(query)
      .populate('seller', 'name college avatar')
      .populate('currentLeader', 'name college')
      .sort({ createdAt: -1 });

    res.json({ auctions });
  } catch (error) {
    next(error);
  }
};

const getAuctionById = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('seller', 'name college avatar')
      .populate('currentLeader', 'name college avatar')
      .populate('provisionalWinner', 'name college avatar');

    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    const recentBids = await Bid.find({ auction: auction._id }).populate('bidder', 'name college avatar').sort({ createdAt: -1 });
    const questions = await Question.find({ auction: auction._id }).populate('askedBy', 'name').sort({ createdAt: -1 });
    res.json({ auction, recentBids, questions });
  } catch (error) {
    next(error);
  }
};

const createAuction = async (req, res, next) => {
  try {
    const { title, category, description, condition, startingPrice, minimumBidIncrement, startTime, endTime } = req.body;

    if (!title || !category || !description || !condition || startingPrice === undefined || !endTime) {
      return res.status(400).json({ message: 'Missing required auction details' });
    }

    const now = new Date();
    const startDate = startTime ? new Date(startTime) : now;
    const endDate = new Date(endTime);
    const startingAmount = Number(startingPrice);
    const increment = Number(minimumBidIncrement || 25);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid auction start or end time' });
    }
    if (startDate < now) return res.status(400).json({ message: 'Auction start time cannot be in the past' });
    if (endDate <= startDate) return res.status(400).json({ message: 'Auction closing time must be after its start time' });
    if (!Number.isFinite(startingAmount) || startingAmount <= 0) return res.status(400).json({ message: 'Starting price must be greater than zero' });
    if (!Number.isFinite(increment) || increment <= 0) return res.status(400).json({ message: 'Minimum bid increment must be greater than zero' });
    const images = [
      ...getRetainedImages(req.body.imageUrls || req.body.images),
      ...(req.files || []).map((file) => `/uploads/${file.filename}`)
    ];
    if (images.length > 6) return res.status(400).json({ message: 'A listing can have at most 6 photos.' });

    const auction = await Auction.create({
      seller: req.user._id,
      title,
      slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      category,
      description,
      condition,
      images,
      startingPrice: startingAmount,
      minimumBidIncrement: increment,
      currentPrice: startingAmount,
      startTime: startDate,
      endTime: endDate,
      status: startDate > new Date() ? 'scheduled' : 'active',
      originalEndTime: endDate
    });

    res.status(201).json({ auction });
  } catch (error) {
    next(error);
  }
};

const updateAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.seller.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You can only edit your own auctions' });
    if (!['scheduled', 'active'].includes(auction.status) || auction.bidCount > 0) {
      return res.status(409).json({ message: 'Listings can only be edited before bidding begins.' });
    }
    if (auction.startTime <= new Date()) return res.status(409).json({ message: 'Started auctions cannot be edited.' });

    const editableFields = ['title', 'category', 'description', 'condition', 'startingPrice', 'minimumBidIncrement', 'startTime', 'endTime'];
    for (const key of editableFields) {
      if (req.body[key] !== undefined) auction[key] = req.body[key];
    }
    if (req.body.imageUrls !== undefined || req.body.images !== undefined || req.files?.length) {
      auction.images = [
        ...getRetainedImages(req.body.imageUrls || req.body.images),
        ...(req.files || []).map((file) => `/uploads/${file.filename}`)
      ];
    }
    if (auction.images.length > 6) return res.status(400).json({ message: 'A listing can have at most 6 photos.' });
    if (auction.startTime < new Date() || auction.endTime <= auction.startTime) {
      return res.status(400).json({ message: 'Auction start must be in the future and closing time must be after start time.' });
    }
    if (auction.startingPrice <= 0 || auction.minimumBidIncrement <= 0) {
      return res.status(400).json({ message: 'Starting price and bid increment must be positive.' });
    }
    auction.currentPrice = auction.startingPrice;
    auction.status = auction.startTime > new Date() ? 'scheduled' : 'active';

    await auction.save();
    res.json({ auction });
  } catch (error) {
    next(error);
  }
};

const placeBidOnAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id).populate('seller', 'name');
    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    const bidResult = await placeBid({
      auction,
      bidder: req.user,
      amount: Number(req.body.amount),
      io: req.app.locals.io
    });

    res.status(201).json({ bid: bidResult.bid, auction: bidResult.auction });
  } catch (error) {
    next(error);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const questionText = String(req.body.question || '').trim();
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (['reserved', 'sold'].includes(auction.status)) {
      return res.status(409).json({ message: 'Chat is closed for reserved or sold listings.' });
    }
    if (!questionText) return res.status(400).json({ message: 'Question is required' });

    const questionDoc = await Question.create({ auction: auction._id, askedBy: req.user._id, question: questionText });
    await Notification.create({
      user: auction.seller,
      auction: auction._id,
      type: 'question',
      message: `A buyer asked a question about ${auction.title}.`
    });
    res.status(201).json({ question: questionDoc });
  } catch (error) {
    next(error);
  }
};

const answerQuestion = async (req, res, next) => {
  try {
    const { answer } = req.body;
    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const auction = await Auction.findById(question.auction);
    if (auction.seller.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only the seller can answer questions' });
    if (['reserved', 'sold'].includes(auction.status)) {
      return res.status(409).json({ message: 'Chat is closed for reserved or sold listings.' });
    }

    const answerText = String(answer || '').trim();
    if (!answerText) return res.status(400).json({ message: 'Answer is required' });
    const answerDoc = await Answer.create({ question: question._id, answeredBy: req.user._id, answer: answerText });
    question.status = 'answered';
    await question.save();
    await Notification.create({
      user: question.askedBy,
      auction: auction._id,
      type: 'question',
      message: `The seller answered your question about ${auction.title}.`
    });
    res.status(201).json({ answer: answerDoc });
  } catch (error) {
    next(error);
  }
};

const decideAuctionOutcome = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.seller.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only the seller can decide auction outcome' });

    const { decision } = req.body;
    if (!decision || !['sold', 'unsold'].includes(decision)) return res.status(400).json({ message: 'Decision must be sold or unsold' });
    if (auction.status !== 'awaiting seller decision') return res.status(409).json({ message: 'This auction is not awaiting a seller decision.' });

    if (decision === 'sold') {
      const highestBid = await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 });
      if (!highestBid || String(highestBid.bidder) !== String(auction.provisionalWinner)) {
        return res.status(409).json({ message: 'There is no valid provisional winner to approve.' });
      }
      auction.status = 'reserved';
      auction.approvedFinalPrice = highestBid.amount;
      auction.provisionalWinner = highestBid.bidder;
      auction.outcome = 'won';
      auction.decisionAt = new Date();
      await Handover.findOneAndUpdate(
        { auction: auction._id },
        { $setOnInsert: { auction: auction._id, seller: auction.seller, buyer: highestBid.bidder, status: 'pending' } },
        { new: true, upsert: true }
      );
      await Notification.create({
        user: highestBid.bidder,
        auction: auction._id,
        type: 'auction',
        message: `Your winning bid on ${auction.title} was approved. Arrange the campus handover.`
      });
    } else {
      auction.status = 'unsold';
      auction.outcome = 'rejected';
      auction.decisionAt = new Date();
      await Notification.create({
        user: auction.provisionalWinner,
        auction: auction._id,
        type: 'auction',
        message: `The seller declined the winning bid on ${auction.title}.`
      });
    }

    await auction.save();
    res.json({ auction });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const [selling, bids] = await Promise.all([
      Auction.find({ seller: req.user._id }).sort({ createdAt: -1 }),
      Bid.find({ bidder: req.user._id }).populate('auction').sort({ createdAt: -1 })
    ]);

    res.json({ selling, bids, stats: { sellingCount: selling.length, bidsCount: bids.length } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listAuctions, getAuctionById, createAuction, updateAuction, placeBidOnAuction, addQuestion, answerQuestion, decideAuctionOutcome, getDashboard };
