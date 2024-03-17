const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  email: { type: String }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
