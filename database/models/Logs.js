const mongoose = require('mongoose');

const LogsSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  action: { type: String, required: true },
  user: { type: String, required: true },
  room: { type: String },
  seat: { type: Number },
  datetime: { type: String },
  details: { type: String }
});

module.exports = mongoose.model('Logs', LogsSchema);