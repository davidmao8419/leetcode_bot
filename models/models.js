var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var leetcodeQuestionsSchema = new Schema({
    question_id: {
        type: Number,
        required: true,
        index: true,
        unique: true
    },
    question_title: {
        type: String
    },
    question_title_slug: {
        type: String  
    },
    difficulty: {
        type: Number
    }
});

var userSchema = new Schema({
    slackID: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    cookie: {
        type: String
    },
    username: {
        type: String
    },
    solvedProblems: {
        type: [String]
    }
});

var LeetcodeQuestions = mongoose.model('LeetcodeQuestions', leetcodeQuestionsSchema);
var User = mongoose.model('User', userSchema);
module.exports = {
    LeetcodeQuestions: LeetcodeQuestions,
    User: User
};