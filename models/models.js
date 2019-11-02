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

var leaderBoardSchema = new Schema({
    slackID: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: String,
        required: true,
        index: true
    },
    number: {
        type: Number,
        required: true
    }
});

leaderBoardSchema.index({ slackID: 1, date: 1 }, { unique: true });

var dailySubmissionSchema = new Schema({
    slackID: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    total_submitted_num: {
        type: Number,
        required: true
    },
    total_accepted_num: {
        type: Number,
        required: true
    }
});

dailySubmissionSchema.index({ slackID: 1, date: 1 }, { unique: true });

var weeklyMultiPlanSchema = new Schema({
    slackID: {
        type: String,
        required: true,
        index: true
    },
    week: {
        type: String,
        required: true,
        index: true
    },
    plans: {
        type: Map,
        of: String
    },
    done: {
        type: Boolean,
        required: true
    },
    reaction: {
        type: String
    }
});

var LeetcodeQuestions = mongoose.model('LeetcodeQuestions', leetcodeQuestionsSchema);
var WeeklyMultiPlan = mongoose.model('WeeklyMultiPlan', weeklyMultiPlanSchema);
var LeaderBoard = mongoose.model('LeaderBoard', leaderBoardSchema);
var DailySubmission = mongoose.model('DailySubmission', dailySubmissionSchema);
var User = mongoose.model('User', userSchema);

module.exports = {
    LeetcodeQuestions: LeetcodeQuestions,
    User: User,
    WeeklyMultiPlan: WeeklyMultiPlan,
    LeaderBoard: LeaderBoard,
    DailySubmission: DailySubmission
};