const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  airtableUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  displayName: String,
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    select: false
  },
  tokenExpiry: {
    type: Date,
    required: true
  },
  airtableProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  accountCreated: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users'
});

userSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.lastActiveAt = new Date();
  }
  next();
});

userSchema.methods.isExpired = function() {
  return this.tokenExpiry && this.tokenExpiry < new Date();
};

module.exports = mongoose.model('User', userSchema);
