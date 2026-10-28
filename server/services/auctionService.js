const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const AutoBidRule = require('../models/AutoBidRule');
const Handover = require('../models/Handover');
const Notification = require('../models/Notification');
const Watchlist = require('../models/Watchlist');

const createNotification = (user, auction, type, message) => {
  if (!user) return Promise.resolve(null);
  return Notification.create({ user, auction, type, message });
};

const broadcastAuction = (io, auction) => {
  if (!io) return;
  io.to(String(auction._id)).emit('auction-updated', {
    auctionId: auction._id,
    currentPrice: auction.currentPrice,
    currentLeader: auction.currentLeader,
    bidCount: auction.bidCount,
    startTime: auction.startTime,
    endTime: auction.endTime,
    status: auction.status
  });
};

const acceptBid = async ({ auction, bidder, amount, bidType = 'manual', autoBidRule = null, io }) => {
  const now = new Date();
  const minimumAmount = auction.bidCount === 0
    ? auction.startingPrice
    : auction.currentPrice + auction.minimumBidIncrement;

  if (!Number.isFinite(amount) || amount < minimumAmount) {
    const error = new Error(`Bid must be at least ₹${minimumAmount}`);
    error.statusCode = 400;
    throw error;
  }

  const bid = await Bid.create({
    auction: auction._id,
    bidder: bidder._id,
    amount,
    bidType,
    autoBidRule
  });
  const extendAuction = auction.endTime.getTime() - now.getTime() <= 2 * 60 * 1000;
  const nextEndTime = extendAuction
    ? new Date(auction.endTime.getTime() + 2 * 60 * 1000)
    : auction.endTime;

  let updated;
  try {
    updated = await Auction.findOneAndUpdate(
      {
        _id: auction._id,
        status: 'active',
        startTime: { $lte: now },
        endTime: { $gt: now },
        currentPrice: auction.currentPrice,
        bidCount: auction.bidCount
      },
      {
        $set: { currentPrice: amount, currentLeader: bidder._id, endTime: nextEndTime },
        $inc: { bidCount: 1 }
      },
      { new: true }
    );
  } catch (error) {
    await Bid.deleteOne({ _id: bid._id });
    throw error;
  }

  if (!updated) {
    await Bid.deleteOne({ _id: bid._id });
    const error = new Error('The auction changed while your bid was being submitted. Refresh and try again.');
    error.statusCode = 409;
    throw error;
  }

  const previousLeader = auction.currentLeader && String(auction.currentLeader) !== String(bidder._id)
    ? auction.currentLeader
    : null;

  if (previousLeader) {
    await createNotification(previousLeader, auction._id, 'outbid', `You were outbid on ${auction.title}.`);
  }
  await createNotification(auction.seller, auction._id, 'bid', `${bidder.name} placed a bid on ${auction.title}.`);
  if (extendAuction) {
    const [bidders, watchers] = await Promise.all([
      Bid.distinct('bidder', { auction: auction._id }),
      Watchlist.distinct('user', { auction: auction._id })
    ]);
    const recipients = new Set([...bidders, ...watchers].map(String));
    for (const recipient of recipients) {
      await createNotification(recipient, auction._id, 'auction', `A late bid extended ${auction.title} by 2 minutes.`);
    }
    await createNotification(auction.seller, auction._id, 'auction', `A late bid extended ${auction.title} by 2 minutes.`);
  }

  if (io) {
    io.to(String(auction._id)).emit('new-bid', {
      auctionId: auction._id,
      amount,
      bidder: bidder.name,
      currentLeader: bidder._id,
      bidCount: updated.bidCount
    });
    broadcastAuction(io, updated);
  }

  return { bid, auction: updated };
};

const runAutomaticBids = async ({ auction, io }) => {
  let current = auction;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const minimumAmount = current.bidCount === 0
      ? current.startingPrice
      : current.currentPrice + current.minimumBidIncrement;
    const rules = await AutoBidRule.find({
      auction: current._id,
      isActive: true,
      bidder: { $ne: current.currentLeader },
      maximumAmount: { $gte: minimumAmount }
    }).populate('bidder', 'name').sort({ maximumAmount: -1, createdAt: 1 }).limit(1);

    const rule = rules[0];
    if (!rule || !rule.bidder) break;

    const nextAmount = Math.min(rule.maximumAmount, minimumAmount);
    try {
      const result = await acceptBid({
        auction: current,
        bidder: rule.bidder,
        amount: nextAmount,
        bidType: 'automatic',
        autoBidRule: rule._id,
        io
      });
      current = result.auction;
    } catch (error) {
      if (error.statusCode === 409) {
        current = await Auction.findById(current._id);
        if (!current) break;
        continue;
      }
      throw error;
    }

    if (nextAmount >= rule.maximumAmount) {
      rule.isActive = false;
      await rule.save();
    }
  }
  return current;
};

const placeBid = async ({ auction, bidder, amount, io }) => {
  if (!auction || !bidder) {
    const error = new Error('Auction or bidder missing');
    error.statusCode = 400;
    throw error;
  }
  if (String(auction.seller._id || auction.seller) === String(bidder._id)) {
    const error = new Error('You cannot bid on your own auction');
    error.statusCode = 403;
    throw error;
  }
  if (
    auction.status !== 'active'
    || new Date(auction.startTime) > new Date()
    || new Date(auction.endTime) <= new Date()
  ) {
    const error = new Error('This auction is not open for bidding');
    error.statusCode = 400;
    throw error;
  }

  await acceptBid({ auction, bidder, amount, io });
  const updatedAuction = await Auction.findById(auction._id);
  const finalAuction = await runAutomaticBids({ auction: updatedAuction, io });
  return Bid.findOne({ auction: auction._id, bidder: bidder._id, amount, bidType: 'manual' }).sort({ createdAt: -1 })
    .then((bid) => ({ bid, auction: finalAuction }));
};

const activateScheduledAuctions = async (io) => {
  const now = new Date();
  const scheduled = await Auction.find({
    status: 'scheduled',
    startTime: { $lte: now },
    endTime: { $gt: now }
  });
  let activated = 0;
  for (const auction of scheduled) {
    const updated = await Auction.findOneAndUpdate(
      { _id: auction._id, status: 'scheduled', startTime: { $lte: now }, endTime: { $gt: now } },
      { $set: { status: 'active' } },
      { new: true }
    );
    if (updated) {
      activated += 1;
      const auctionWithAutomaticBids = await runAutomaticBids({ auction: updated, io });
      broadcastAuction(io, auctionWithAutomaticBids);
    }
  }
  return activated;
};

const notifyAuctionsClosing = async () => {
  const now = new Date();
  const closing = await Auction.find({
    status: 'active',
    endTime: { $gt: now, $lte: new Date(now.getTime() + 5 * 60 * 1000) }
  }).select('_id seller title');
  for (const auction of closing) {
    const alreadySent = await Notification.exists({
      user: auction.seller,
      auction: auction._id,
      type: 'auction',
      message: `Auction for ${auction.title} closes in 5 minutes.`
    });
    if (!alreadySent) {
      await createNotification(auction.seller, auction._id, 'auction', `Auction for ${auction.title} closes in 5 minutes.`);
    }
  }
};

const finalizeExpiredAuctions = async (io) => {
  const now = new Date();
  const expiredAuctions = await Auction.find({
    status: { $in: ['active', 'scheduled'] },
    endTime: { $lte: now }
  });

  for (const auction of expiredAuctions) {
    const winningBid = await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 });
    const status = winningBid ? 'awaiting seller decision' : 'unsold';
    const changed = await Auction.findOneAndUpdate(
      { _id: auction._id, status: { $in: ['active', 'scheduled'] }, endTime: { $lte: now } },
      {
        $set: {
          status,
          provisionalWinner: winningBid?.bidder || null,
          originalEndTime: auction.originalEndTime || auction.endTime,
          outcome: winningBid ? 'pending' : 'unsold'
        }
      },
      { new: true }
    );

    if (!changed) continue;
    await AutoBidRule.updateMany({ auction: auction._id }, { $set: { isActive: false } });
    await createNotification(
      auction.seller,
      auction._id,
      'auction',
      winningBid ? `${auction.title} has ended and is awaiting your decision.` : `${auction.title} ended without bids and is unsold.`
    );
    if (winningBid) {
      await createNotification(winningBid.bidder, auction._id, 'auction', `You are the provisional winner for ${auction.title}.`);
    }
    const [bidders, watchers] = await Promise.all([
      Bid.distinct('bidder', { auction: auction._id }),
      Watchlist.distinct('user', { auction: auction._id })
    ]);
    const recipients = new Set([...bidders, ...watchers].map(String));
    for (const recipient of recipients) {
      if (winningBid && String(winningBid.bidder) === recipient) continue;
      await createNotification(recipient, auction._id, 'auction', `The auction for ${auction.title} has closed.`);
    }
    broadcastAuction(io, changed);
  }
  return expiredAuctions.length;
};

const completeHandoverIfConfirmed = async (handover, io) => {
  if (handover.buyerConfirmedAt && handover.sellerConfirmedAt && handover.status !== 'completed') {
    handover.status = 'completed';
    handover.completedAt = new Date();
    await handover.save();
    const auction = await Auction.findByIdAndUpdate(
      handover.auction,
      { $set: { status: 'sold', outcome: 'won', completedAt: handover.completedAt } },
      { new: true }
    );
    if (auction) broadcastAuction(io, auction);
    await createNotification(handover.buyer, handover.auction, 'handover', `Your purchase of ${auction.title} is complete.`);
    await createNotification(handover.seller, handover.auction, 'handover', `The sale of ${auction.title} is complete.`);
  }
  return handover;
};

module.exports = {
  activateScheduledAuctions,
  broadcastAuction,
  completeHandoverIfConfirmed,
  createNotification,
  finalizeExpiredAuctions,
  notifyAuctionsClosing,
  placeBid,
  runAutomaticBids
};
