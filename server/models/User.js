const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^.+@.+\..+$/, 'Please provide a valid email address'] },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller'], default: 'buyer', required: true },
  studentId: { type: String, default: '' },
  college: { type: String, required: true, trim: true },
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  notificationPreferences: { email: { type: Boolean, default: true }, browser: { type: Boolean, default: true } }
}, { timestamps: true });

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    studentId: this.studentId,
    college: this.college,
    avatar: this.avatar,
    isActive: this.isActive,
    notificationPreferences: this.notificationPreferences,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);
