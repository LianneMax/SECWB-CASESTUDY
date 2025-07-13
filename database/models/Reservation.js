const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    email: { type: String, ref: 'User', required: true }, // Foreign key to User._id

    request_date: { type: Date, required: true },
    reserved_date: { type: Date, required: true },

    building_id: { type: Number, ref: 'Building', required: true },
    room_num: { type: String, ref: 'Room', required: true },
    seat_num: { type: Number, required: true },
    
    anonymous: { type: String, enum: ['Y', 'N'], required: true },

    reserved_for_email: { type: String, ref: 'User' } // Foreign key to another user
});

module.exports = mongoose.model('Reservation', ReservationSchema);