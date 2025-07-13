const mongoose = require('mongoose');

const SecurityQuestionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    security_question: {
        type: String,
        required: true
    },
    security_answer: {
        type: String,
        required: true
    }
});

const SecurityQuestion = mongoose.model('SecurityQuestion', SecurityQuestionSchema);
module.exports = SecurityQuestion;