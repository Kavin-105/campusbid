const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbid';
  await mongoose.connect(mongoUri);
  await User.collection.createIndex({ email: 1, role: 1 }, { unique: true });
  const indexes = await User.collection.indexes();
  for (const index of indexes) {
    const isLegacyEmailUniqueIndex = index.unique
      && index.key.email === 1
      && index.key.role === undefined;
    if (isLegacyEmailUniqueIndex) await User.collection.dropIndex(index.name);
  }
  console.log('MongoDB connected');
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
