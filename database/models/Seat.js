const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
    seat_num: { type: Number, required: true }, // Seat numbers can repeat in different rooms
    room_num: { type: String, ref: 'Room', required: true }
});

// Ensure that each (room_num, seat_num) pair is unique
SeatSchema.index({ room_num: 1, seat_num: 1 }, { unique: true });

module.exports = mongoose.model('Seat', SeatSchema);
