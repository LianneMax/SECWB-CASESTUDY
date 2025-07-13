const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true , index: true},

    last_name: { type: String, required: true },
    first_name: { type: String, required: true },
    
    password: { type: String, required: true },
    account_type: { type: String, required: true },

    description: { type: String, required: false },
    profile_picture: { type: String },
});

// Set `email` as the primary key by overriding `_id`
UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', UserSchema);
module.exports = User;