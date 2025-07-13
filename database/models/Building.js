const mongoose = require('mongoose');

const BuildingSchema = new mongoose.Schema({
    building_id: { type: Number, required: true, unique: true }, // Primary key
    building_name: { type: String, required: true, maxlength: 100 }
});

module.exports = mongoose.model('Building', BuildingSchema);