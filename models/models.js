var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var problemSchema = new Schema({
    title:{
        type: String,
        required: true
    },
    id:{
        type: Number,
        require: true
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
        type: String,
        required: true,
    },
    num_total: {
        type: Number,
        required: true,
    },
    problems_solved_yesterday: {
        type: Number
    }
});

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

var LeetcodeQuestions = mongoose.model('LeetcodeQuestions', leetcodeQuestionsSchema);
var User = mongoose.model('User', userSchema);

module.exports = {
    LeetcodeQuestions: LeetcodeQuestions,
    User: User,
};