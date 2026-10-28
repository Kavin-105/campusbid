const { activateScheduledAuctions, finalizeExpiredAuctions, notifyAuctionsClosing } = require('../services/auctionService');

const startAuctionScheduler = (io) => {
  const tick = async () => {
    try {
      await activateScheduledAuctions(io);
      await notifyAuctionsClosing();
      await finalizeExpiredAuctions(io);
    } catch (error) {
      console.error('Scheduler error:', error.message);
    }
  };

  tick();
  return setInterval(tick, 30000);
};

module.exports = { startAuctionScheduler };
