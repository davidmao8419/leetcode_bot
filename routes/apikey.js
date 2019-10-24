var express = require('express');
var router = express.Router();
//mongoose.connect(process.env.MONGODB_URI,{ useNewUrlParser: true }); 
var { startDialog, getSolvedProblemsForUser } = require('./common');
var {User, WeeklyMultiPlan} = require('../models/models');
var {bot, getMonday} = require('../bot');

router.post('/', function (req, res) {
    var data = JSON.parse(req.body.payload);
    var slackID = data.user.id;
    console.log("post apikey:", data);
    if (data.type == "dialog_submission") {
        if (data.callback_id == "leetcode_connection_callback") {
            getSolvedProblemsForUser(slackID, data.submission.cookie, res, updateUserProfile);
        } else if(data.callback_id=="newplan_callback"){
            var submission = data.submission;
            if(isNaN(submission["problems_goal"]) || isNaN(parseFloat(submission["problems_goal"]))) {
                console.log("!!!! input hours not numeric: ", submission);
                res.type('application/json');
                var errorMsg = {
                    "errors": [
                        {"name": "problems_goal", "error": "This should only be numeric"}
                    ]
                }
                res.status(200).send(errorMsg);
            } else {
            submission["problems_solved"] = 0; //record how many problems already solved for the week
            //console.log("submission: ", submission);
            var week = getMonday(new Date()).toDateString();
            var newWeeklyMultiPlan = new WeeklyMultiPlan({
                slackID: slackID,
                week: week,
                plans: submission,
                done: false
            });
            newWeeklyMultiPlan.save()
                .then(() => {
                    bot.postMessage(slackID, `Great! You've set a goal to solve ${submission.problems_goal} leetcode problems. I will keep you on track :smile:`, {as_user:true});
                })
                .catch((err) => {
                    bot.postMessage(slackID, "Ooops!!! Error occurs! Please try again saying weeklyplan", {as_user:true});
                })
            res.send();
            }
        }
    } else if (data.type == "dialog_cancellation") {
        console.log("!!!!! user has cancel the dialog!!");
        console.log(data);
    } else if (data.actions[0].name == "leetcode_connection_button") {
        var requestData = {
            "trigger_id": data.trigger_id,
            "dialog": {
                "callback_id": "leetcode_connection_callback",
                "title": "Upload a config file",
                "submit_label": "Request",
                "notify_on_cancel": true,
                "state": "Limo",
                "elements": [
                    {
                        "label": "Please input your cookie for Leetcode website",
                        "name": "cookie",
                        "type": "textarea",
                        "placeholder": "Cookie for Leetcode website"
                    },
                ],
            },
        };
        startDialog(requestData);
    } else if (data.actions[0].name == "new_plan_button") {
        var week = getMonday(new Date()).toDateString();
        // TODO: change weekly plans options
        WeeklyMultiPlan.findOne({slackID: slackID, week: week, done:false}).exec(function(err, user){
            if(err){
                console.log(err);
            } else {
                if(user) {
                    bot.postMessage(slackID, "you haven't finished your goal yet! Can't set new!", {as_user: true});
                    res.send();
                } else {
                    //var hourOptions = [];
                    var focuses = [
                        {"label": "Software Development", "value": "Software Development"},
                        {"label": "Writing more", "value": "Writing more"},
                        {"label": "Learning new things", "value": "Learning new things"}];
                    //for (var i = 30; i >= 0; i-=2) {
                    //    hourOptions.push({"label":i.toString(), "value":i.toString()});
                    //}
                    
                    var requestData = {
                        "trigger_id": data.trigger_id,
                        "notify_on_cancel": true,
                        "dialog": {
                            "callback_id": "newplan_callback",
                            "title": "New Goal for this week!",
                            "submit_label": "Request",
                            "notify_on_cancel": true,
                            "state": "Limo",
                            "elements": [
                                {
                                    "label": "How many problems do you want to solve",
                                    "name": "problems_goal",
                                    "type": "text",
                                    "subtype": "number",
                                    "placeholder": "Numbers only"
                                  }
                            ],
                        },
                    };
                    startDialog(requestData);
                }
            }
        });
    }
})

function updateUserProfile(slackID, cookie, res, error, num_total){
    if(error){
        console.log(error);
        res.status(200).json({"errors":[{"name": "cookie", "error": "Cookie Error:  "+error}]});
    }else{
        User.findOne({slackID: slackID}).exec(function(err, user){
            if(err){
                console.log(err);
            } else {
                console.log(user);
                if(user){
                    console.log("User slackID"+ slackID+" exist");
                    var newUser = user;
                    newUser.cookie = cookie;
                    newUser.problems_solved_yesterday += Math.max(0, num_total - newUser.num_total);
                    newUser.num_total = num_total;
                }else{
                    var newUser = new User({
                        slackID: slackID,
                        cookie: cookie,
                        num_total: num_total,
                        problems_solved_yesterday: 0
                    });
                }
                newUser.save()
                .then( () => {
                    bot.postMessage(slackID, "Congratulations! You successfully connect with Leetcode ", {as_user:true});
                    })
                .catch((err) => {
                    console.log('error in new User api');
                    console.log(err);
                    console.log(err.errmsg);
                    bot.postMessage(slackID, "Ooops!!! Error occurs! Please try again by saying connect", {as_user:true});
                });
                res.send();
            }
        });
    }
}

module.exports = router;
