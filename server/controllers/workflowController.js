const Handover = require('../models/Handover');
const Notification = require('../models/Notification');
const { completeHandoverIfConfirmed, createNotification } = require('../services/auctionService');

const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const [items, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .populate('auction', 'title status')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);
    res.json({ items, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

const getHandovers = async (req, res, next) => {
  try {
    const filter = req.user.role === 'seller' ? { seller: req.user._id } : { buyer: req.user._id };
    const items = await Handover.find(filter)
      .populate('auction')
      .populate('seller', 'name college avatar')
      .populate('buyer', 'name college avatar')
      .sort({ updatedAt: -1 });
    res.json({ items });
  } catch (error) {
    next(error);
  }
};

const scheduleHandover = async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id).populate('auction', 'title');
    if (!handover) return res.status(404).json({ message: 'Handover not found' });
    if (![String(handover.buyer), String(handover.seller)].includes(String(req.user._id))) {
      return res.status(403).json({ message: 'You are not part of this handover.' });
    }
    if (!['pending', 'scheduled'].includes(handover.status)) {
      return res.status(409).json({ message: 'This handover can no longer be scheduled.' });
    }
    const scheduledAt = new Date(req.body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return res.status(400).json({ message: 'Choose a handover time in the future.' });
    }
    handover.scheduledAt = scheduledAt;
    handover.status = 'scheduled';
    handover.sellerConfirmedAt = null;
    handover.buyerConfirmedAt = null;
    await handover.save();
    const otherParty = String(req.user._id) === String(handover.buyer) ? handover.seller : handover.buyer;
    await createNotification(otherParty, handover.auction._id, 'handover', `A handover time was proposed for ${handover.auction.title}.`);
    res.json({ handover });
  } catch (error) {
    next(error);
  }
};

const confirmHandover = async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id);
    if (!handover) return res.status(404).json({ message: 'Handover not found' });
    if (![String(handover.buyer), String(handover.seller)].includes(String(req.user._id))) {
      return res.status(403).json({ message: 'You are not part of this handover.' });
    }
    if (handover.status !== 'scheduled' || !handover.scheduledAt) {
      return res.status(409).json({ message: 'Schedule the handover before confirming it.' });
    }
    if (String(req.user._id) === String(handover.buyer)) handover.buyerConfirmedAt = new Date();
    else handover.sellerConfirmedAt = new Date();
    await handover.save();
    await completeHandoverIfConfirmed(handover, req.app.locals.io);
    const otherParty = String(req.user._id) === String(handover.buyer) ? handover.seller : handover.buyer;
    await createNotification(otherParty, handover.auction, 'handover', 'The other participant confirmed the campus handover.');
    res.json({ handover });
  } catch (error) {
    next(error);
  }
};

const reportHandoverFailure = async (req, res, next) => {
  try {
    const handover = await Handover.findById(req.params.id).populate('auction', 'title');
    if (!handover) return res.status(404).json({ message: 'Handover not found' });
    if (![String(handover.buyer), String(handover.seller)].includes(String(req.user._id))) {
      return res.status(403).json({ message: 'You are not part of this handover.' });
    }
    if (!['pending', 'scheduled'].includes(handover.status)) {
      return res.status(409).json({ message: 'This handover cannot be reported as failed.' });
    }
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5) return res.status(400).json({ message: 'Please provide a brief reason for the failed pickup.' });
    handover.status = 'failed';
    handover.failureReason = reason.slice(0, 1000);
    await handover.save();
    await handover.auction.updateOne({ $set: { status: 'failed pickup', outcome: 'failed pickup' } });
    await createNotification(handover.buyer, handover.auction._id, 'handover', `The pickup for ${handover.auction.title} was reported as failed.`);
    await createNotification(handover.seller, handover.auction._id, 'handover', `The pickup for ${handover.auction.title} was reported as failed.`);
    res.json({ handover });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
};

module.exports = {
  confirmHandover,
  getHandovers,
  getNotifications,
  getProfile,
  markAllNotificationsRead,
  markNotificationRead,
  reportHandoverFailure,
  scheduleHandover
};
