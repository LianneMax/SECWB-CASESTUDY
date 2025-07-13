const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    room_num: { type: String, required: true, maxlength: 45, unique: true }, // Acts as Primary Key
    building_id: { type: Number, ref: 'Building', required: true },
    floor_num: { type: Number, required: true }
});

module.exports = mongoose.model('Room', RoomSchema);