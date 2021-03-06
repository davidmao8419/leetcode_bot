//var SlackBot = require('slackbots');
var mongoose = require('mongoose');
const request = require('request');
var moment = require('moment');
var CronJob = require('cron').CronJob;
var { startDialog, getSolvedProblemsForUser } = require('./routes/common');
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true }); // only when test bot.js
var { User, WeeklyMultiPlan, LeaderBoard, DailySubmission } = require('./models/models');
var _ = require('underscore')
const envKey = process.env.NUDGE_BOT_TOKEN;
const { App } = require('@slack/bolt');
mongoose.Promise = global.Promise;

const slackApp = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: envKey,
});

// create a bot
// var bot = new SlackBot({
//     token: envKey,
//     name: 'nudgebot'
// });

// const startDailyProgressCheck = function () {
//     console.log('startDailyProgressCheck');
//     var job = new CronJob({
//         cronTime: '00 00 00 * * *',
//         onTick: function () {
//             console.log('startDailyProgressCheck tick!');
//             dailyProgressCheck(dailyProgressCheck_users);
//         }
//     });
//     job.start();
// }

const startWeeklyPlanner = function(){
    var job = new CronJob({
        cronTime: '00 00 07 * * 1',
        onTick: function() {
            console.log('startWeeklyPlanner tick!');
            weeklyPlanner();
        }
    });
    job.start();
}

const startDailyLeaderBoardCheck = function () {
    console.log('startDailyProgressCheck');
    var job = new CronJob({
        cronTime: '00 00 07 * * 0,2-6',
        onTick: function () {
            console.log('startDailyLeaderBoardCheck tick!');
            dailyLeaderBoardCheck();
        }
    });
    job.start();
}

const startDailyProgressCheckReport = function(){
    console.log('startDailyProgressCheckReport');
    var job = new CronJob({
        cronTime: '00 00 00 * * *',
        onTick: function() {
            console.log('startDailyProgressCheckReport tick!');
            //dailyProgressCheck(dailyProgressCheckReport_users);
            daily_reminder();
        }
    });
    job.start();
}

function dailyProgressCheck(callback, trigger = null) {
    console.log('dailyProgressCheck trigger ', trigger);
    User.find({}, function (err, users) {
        if (err) {
            console.log(err);
        } else {
            users.map(user=>{
                if (!trigger || trigger == user.slackID) {
                    callback(user);
                }
            });
        }
    });
}

function dailyLeaderBoardCheck(trigger = null) {
    console.log('dailyLeaderBoardCheck trigger ', trigger);
    var date = moment().format().split('T')[0];
    LeaderBoard.find({date: date}, function (err, leaderBoards) {
        if (err) {
            console.log(err);
        } else {
            leaderBoards = leaderBoards.sort((a, b) => b.number - a.number);
            var topLeaders = leaderBoards.map(leaderBoard=> leaderBoard.slackID+"\t"+leaderBoard.number);
            var message = "Top 5:\n"+topLeaders.slice(0, 5).join("\n");
            User.find({}, function(err, users) {
                if(err){
                    console.log(err);
                }else{
                    users.forEach(function(user) {
                        if(!trigger || trigger==user.slackID){
                            //bot.postMessage(user.slackID, message, { as_user: true });
                            slackApp.client.chat.postMessage({token: envKey, channel:user.slackID, text:message, as_user: true });
                        }
                    });
                }
            });
        }
    });
}

function dailyProgressCheck_users(user){
    var url = 'https://leetcode.com/api/problems/algorithms/';
    var requestJson = {
        url: url,
        method: 'GET',
        headers: {
            cookie: user.cookie,
            'Cache-Control': 'no-cache'
        },
    }

    request(requestJson, function (error, response, body) {
        if(error) {
            console.log("dailyProgressCheck_users error");
        } else {
            var data = JSON.parse(body);
            var num_total = data['num_total'];
            var problems_solved_yesterday = num_total - user.num_total;
            user.num_total = num_total;
            user.problems_solved_yesterday = problems_solved_yesterday;
            user.save()
                .then( () => {
                    Console.log('dailyProgressCheck_users successful for ', user.slackID);
                    })
                .catch((err) => {
                    console.log('error in dailyProgressCheck_users');
                    console.log(err.errmsg);
                });
        }
    });
}

function dailyProgressCheckReport_users(user) {
    console.log('dailyProgressCheckReport_users');
    console.log(user);
    //bot.postMessage(user.slackID, "Your solved "+ user.problems_solved_yesterday + " problems yesterday! \n"+user.num_total+" in total.", { as_user: true });
    slackApp.client.chat.postMessage({token: envKey, channel:user.slackID, text:"Your solved "+ user.problems_solved_yesterday + " problems yesterday! \n"+user.num_total+" in total.", as_user: true });
}

// bot.on('start', function () {
//     console.log('bot started!!');
//     //startDailyProgressCheck();
//     startWeeklyPlanner();
//     startDailyProgressCheckReport();
//     startDailyLeaderBoardCheck();
// });

slackApp.message(({ message, say }) => {
    var slackID = message.user;
    if (message.type != 'error') {
        console.log('-----------------');
        console.log(message);
        console.log("Timenow: " + (new Date()).toISOString());
        console.log("Timenow: " + (new Date()));
        console.log('-----------------');
    }
    const helpString = "Hi! I am Leetcode Bot! I will keep you updated about your progress in Leetcode!"
    switch (message.type) {
        case "message":
            if (message.channel[0] === "D" && message.bot_id === undefined) {
                User.findOne({ slackID: slackID }).exec(function (err, user) {
                    if (err) {
                        console.log(err);
                    } else {
                        //console.log(user);
                        if (!user) {
                            authenticate(slackID);
                        } else {
                            if (message.text.includes("dailyProgressReport")) {
                                dailyProgressCheck(dailyProgressCheckReport_users, slackID);
                            } else if (message.text.includes("dailyProgress")) {
                                dailyProgressCheck(dailyProgressCheck_users, slackID);
                            } else if (message.text.includes("newplan")) {
                                newPlan(slackID);
                            } else if (message.text.includes("weeklyPlanner")) {
                                weeklyPlanner(slackID);
                            }else if (message.text.includes("dailyreminder_all")) {
                                daily_reminder();
                            } else if (message.text.includes("dailyreminder")) {
                                daily_reminder(slackID);
                            }else if(message.text.includes("dailyLeaderBoard_all")){
                                dailyLeaderBoardCheck();
                            }else if(message.text.includes("dailyLeaderBoard")){
                                dailyLeaderBoardCheck(slackID);
                            }else if(message.text.includes("query ")){
                                queryUser(slackID, message.text);
                            }else if(message.text.includes("compareLastWeek")) {
                                compare_last_week(slackID);
                            }
                            else {
                                slackApp.client.chat.postMessage({token: envKey, channel:message.user, text:helpString, as_user: true });
                                //bot.postMessage(message.user, helpString, { as_user: true });
                            }

                        }
                    }
                });
            }
    }
  });

// bot.on('message', message => {
//     var slackID = message.user;
//     if (message.type != 'error') {
//         console.log('-----------------');
//         console.log(message);
//         console.log("Timenow: " + (new Date()).toISOString());
//         console.log("Timenow: " + (new Date()));
//         console.log('-----------------');
//     }
//     const helpString = "Hi! I am Leetcode Bot! I will keep you updated about your progress in Leetcode!"
//     switch (message.type) {
//         case "message":
//             if (message.channel[0] === "D" && message.bot_id === undefined) {
//                 User.findOne({ slackID: slackID }).exec(function (err, user) {
//                     if (err) {
//                         console.log(err);
//                     } else {
//                         //console.log(user);
//                         if (!user) {
//                             authenticate(slackID);
//                         } else {
//                             if (message.text.includes("dailyProgressReport")) {
//                                 dailyProgressCheck(dailyProgressCheckReport_users, slackID);
//                             } else if (message.text.includes("dailyProgress")) {
//                                 dailyProgressCheck(dailyProgressCheck_users, slackID);
//                             } else if (message.text.includes("newplan")) {
//                                 newPlan(slackID);
//                             } else if (message.text.includes("weeklyPlanner")) {
//                                 weeklyPlanner(slackID);
//                             }else if (message.text.includes("dailyreminder_all")) {
//                                 daily_reminder();
//                             } else if (message.text.includes("dailyreminder")) {
//                                 daily_reminder(slackID);
//                             }else if(message.text.includes("dailyLeaderBoard_all")){
//                                 dailyLeaderBoardCheck();
//                             }else if(message.text.includes("dailyLeaderBoard")){
//                                 dailyLeaderBoardCheck(slackID);
//                             }else if(message.text.includes("query ")){
//                                 queryUser(slackID, message.text);
//                             }else if(message.text.includes("compareLastWeek")) {
//                                 compare_last_week(slackID);
//                             }
//                             else {
//                                 bot.postMessage(message.user, helpString, { as_user: true });
//                             }

//                         }
//                     }
//                 });
//             }
//     }
// });

function queryUser(slackID, text){
    var user = text.split(' ')[1];
    console.log("query user ", slackID, text);
    DailySubmission.find({ slackID: user }).sort({date: 'desc'}).exec(function (err, dailySubmissions) {
        if (err) {
            console.log(err);
        } else {
            //console.log(user);
            if (!dailySubmissions||dailySubmissions.length==0) {
                //bot.postMessage(slackID, "Sorry! Didn't find the user!", { as_user: true });
                slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:"Sorry! Didn't find the user!", as_user: true });
            } else {
                console.log("dailySubmissions ", dailySubmissions);
                var message = user+"\n"
                dailySubmissions = dailySubmissions.slice(0, 5);
                for(var i=0;i<dailySubmissions.length;i++)
                {
                    message+='\tsubmitted '+dailySubmissions[i].total_submitted_num+", and solved "+dailySubmissions[i].total_accepted_num+" at "+dailySubmissions[i].date.toISOString().slice(0, 10)+"\n";
                }
                //bot.postMessage(slackID, message, { as_user: true });
                slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:message, as_user: true });
            }
        }
    });
}

function authenticate(slackID) {
    var requestData = {
        as_user: true,
        "text": 'Click here to connect to your Leetcode account!!!',
        "attachments": [
            {
                "text": "",
                "fallback": "You are unable to connect with your Leetcode account",
                "callback_id": "leetcodeConnection",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "leetcode_connection_button",
                        "text": "Connect",
                        "type": "button",
                        "value": "leetcode_connection"
                    },
                ]
            }
        ],
    };
    //bot.postMessage(slackID, "", requestData);
    slackApp.client.chat.postMessage({...{token: envKey, channel:slackID, text:""}, ...requestData});
}

function getMonday(d) {
    d = new Date(d);
    //d.setHours(0,0,0,0);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function newPlan(slackID, message){
    if(message == undefined) {
        message = "Click here to make a plan for this week!!!"
    }
    var requestData = {
        as_user: true,
        "text": `${message}`,
        "attachments": [
            {
                "text": "",
                "fallback": "You are unable to propose new plan",
                "callback_id": "newplan",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "new_plan_button",
                        "text": "Plan",
                        "type": "button",
                        "value": "yes_plan"
                    },
                ]
            }
        ],
    };
    //bot.postMessage(slackID,"",requestData);
    
    slackApp.client.chat.postMessage({...{token: envKey, channel:slackID, text:""}, ...requestData});
}

function weeklyPlanner(trigger=null){
    console.log("enter weeklyPlanner");
    User.find({}, function(err, users) {
        if(err){
            console.log(err);
        }else{
            users.forEach(function(user) {
                if(!trigger || trigger==user.slackID){
                    console.log("weekly plan for ", user);
                    //weeklyReport(user.slackID, user.rescuetime_key);
                    compare_last_week(user.slackID);
                    setTimeout(function(){newPlan(user.slackID);}, 800);
                }
            });
        }
    });
}

function daily_reminder(trigger=null) {
    var week = getMonday(new Date()).toDateString();
    WeeklyMultiPlan.find({week:week, done:false}).exec(function(err, plans){
        if(err){
            console.log(err);
        }else{
            //console.log("$$$$$get users: ", users); 
            if(plans && plans.length > 0){
                plans.forEach(function(plan) {
                    if(!trigger || trigger==plan.slackID){
                        User.findOne({slackID:plan.slackID}, function(err, user) {
                            if(!err) {
                                daily_submissions_check(user.slackID, user.cookie, plan);
                            } 
                        });
                    }
                });
            } else {
                console.log("########## no plan this week");
                if(trigger) {
                    slackApp.client.chat.postMessage({token: envKey, channel:trigger, text:"You don't have any plan yet.", as_user: true });
                    //bot.postMessage(trigger, "You don't have any plan yet.", {as_user:true});
                    newPlan(trigger);
                }
            }
        }
    });
}

function daily_submissions_check(slackID, cookie, plan_db) {
    var url = 'https://leetcode.com/api/submissions/';
    var leader_board_date = moment().format().split('T')[0];
    //var url = 'https://leetcode.com/api/progress/';
    //var url = 'https://leetcode.com/api/recent/';
    var requestJson = {
        url: url,
        method: 'GET',
        headers: {
            cookie: cookie,
            'Cache-Control': 'no-cache'
        },
        //qs:{offset: '0', limit:'30'}
    }

    request(requestJson, function (error, response, body) {
        if(error) {
            console.log("get code submission error");
        } else {
            console.log(body);
          var bodyJson = JSON.parse(body);
          
          var submissions = bodyJson.submissions_dump;
          //console.log(submissions);
          var yesterday = new Date(new Date().setDate(new Date().getDate()-1));
          var total_submitted_num = 0;
          var total_accepted_num = 0;
          for(var i=0; i<submissions.length; i++) {
            submission = submissions[i];  
            var date = new Date(submission.timestamp*1000);
            if(date >= yesterday) {
                total_submitted_num++;
                if(submission.status_display=='Accepted') {
                    total_accepted_num++;
                }
            }
          }
          leaderBoard = new LeaderBoard({
            slackID: slackID,
            date: leader_board_date,
            number: total_accepted_num
          });
          leaderBoard.save()
          .then( () => {
              console.log('leaderBoard save successfull for ', slackID, leader_board_date);
            })
          .catch((err) => {
              console.log('error in new LeaderBoard for', slackID, leader_board_date);
              console.log(err);
              console.log(err.errmsg);
          });
          dailySubmission = new DailySubmission({
            slackID: slackID,
            date: yesterday,
            total_submitted_num: total_submitted_num,
            total_accepted_num: total_accepted_num
          });
          dailySubmission.save()
          .then( () => {
              console.log('dailySubmission save successfull for ', slackID, leader_board_date);
            })
          .catch((err) => {
              console.log('error in new dailySubmission for', slackID, leader_board_date);
              console.log(err);
              console.log(err.errmsg);
          });
          if(total_submitted_num > 0 && total_accepted_num==0) {
              slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:`You submitted ${total_submitted_num} problems yesterday but no accpeted ones. Keep going!!`, as_user: true });
              //bot.postMessage(slackID, `You submitted ${total_submitted_num} problems yesterday but no accpeted ones. Keep going!!`, { as_user: true });
          } else if(total_submitted_num > 0 && total_accepted_num > 0) {
            plan = plan_db.plans;
            solved_num = parseInt(plan.get('problems_solved')) + total_accepted_num;
            done = false;
            if(solved_num >= parseInt(plan.get('problems_goal'))) {
                plan_db.done = true;
                done = true;
            }
            
            plan.set('problems_solved', solved_num);
            plan_db.plans = plan;
            plan_db.save()
                .then(() => {
                    slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:`You submitted ${total_submitted_num} problems yesterday but no accpeted ones. Keep going!!`, as_user: true });
                    //bot.postMessage(slackID, `You submitted ${total_submitted_num} problems yesterday and ${total_accepted_num} got accepted!! Good work and keep going!`, { as_user: true });
                    if(done) {
                        setTimeout(function(){newPlan(slackID, "Good job! Set a new goal for this week!");}, 800);
                    }
                })
                .catch((err) => {
                    console.log("weekly plan update error occurs: ", err);
                });
          } else {
              slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:"You made no progress yesterday!! Take action now!", as_user: true });
              //bot.postMessage(slackID, "You made no progress yesterday!! Take action now!", { as_user: true });
          }
        }
    });
}

function compare_last_week(slackID) {
    monday = getMonday(new Date());

    var dateOffset = (24*60*60*1000) * 7; //7 days
    var date = new Date(monday);
    date.setTime(date.getTime() - dateOffset);
    var last_monday = date.toDateString()

    WeeklyMultiPlan.find({week:last_monday, slackID:slackID}).exec(function(err, plans){
        if(err){
            console.log(err);
        }else{
            done_plan_number = 0;
            not_done_plan_number = 0;
            solved_num = 0;
            unsolved_num = 0;
            
            if(plans && plans.length > 0){
                for(var i=0; i<plans.length; i++) {
                    plan = plans[i];
                    solved_num = solved_num + parseInt(plan.plans.get('problems_solved'));
                    if(plan.done) {
                        done_plan_number++;
                    } else {
                        not_done_plan_number++;
                        unsolved_num = unsolved_num + parseInt(plan.plans.get('problems_goal')) - parseInt(plan.plans.get('problems_solved'))
                    }
                }
                if(done_plan_number > 0 && not_done_plan_number==0) {
                    slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:`Wow great job you finished all your plans last week. You solved ${solved_num} problems! Plan to solve more problems this week?`, as_user: true });
                    //bot.postMessage(slackID, `Wow great job you finished all your plans last week. You solved ${solved_num} problems! Plan to solve more problems this week?`, {as_user:true});
                } else if(done_plan_number > 0 && not_done_plan_number > 0) {
                    slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:`You solved ${solved_num} problems! But you didn't finish ${unsolved_num} problems. Make plans to continue to finish ${unsolved_num} problems this week?`, as_user: true });
                    //bot.postMessage(slackID, `You solved ${solved_num} problems! But you didn't finish ${unsolved_num} problems. Make plans to continue to finish ${unsolved_num} problems this week?`, {as_user:true});
                } else {
                    slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:`You didn't solve any problems last week! Make plans to solve some problems this week?`, as_user: true });
                    //bot.postMessage(slackID, `You didn't solve any problems last week! Make plans to solve some problems this week?`, {as_user:true});
                }
            } else {
                console.log("########## no plans made last week");
                slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:"You didn't make any plans last week. Make some this week?", as_user: true });
                //bot.postMessage(slackID, "You didn't make any plans last week. Make some this week?", {as_user:true});
            }
        }
    });
}

slackApp.action({"callback_id":"newplan"}, ({ body, ack, say }) => {
    console.log('here');
    console.log(body);
    var slackID = body.user.id;
    var week = getMonday(new Date()).toDateString();
    // TODO: change weekly plans options
    WeeklyMultiPlan.findOne({ slackID: slackID, week: week, done: false }).exec(function (err, user) {
        if (err) {
            console.log(err);
        } else {
            if (user) {
                ack();
                slackApp.client.chat.postMessage({ token: envKey, channel: slackID, text: "you haven't finished your goal yet! Can't set new!", as_user: true });
                //bot.postMessage(slackID, "you haven't finished your goal yet! Can't set new!", {as_user: true});
            } else {
                //var hourOptions = [];
                var focuses = [
                    { "label": "Software Development", "value": "Software Development" },
                    { "label": "Writing more", "value": "Writing more" },
                    { "label": "Learning new things", "value": "Learning new things" }];
                //for (var i = 30; i >= 0; i-=2) {
                //    hourOptions.push({"label":i.toString(), "value":i.toString()});
                //}

                var requestData = {
                    "trigger_id": body.trigger_id,
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
  });

  slackApp.action({"callback_id":"leetcodeConnection"}, ({ body, ack, say }) => {
    console.log('here');
    console.log(body);
    var requestData = {
        "trigger_id": body.trigger_id,
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
  });

slackApp.action({ "callback_id": "newplan_callback" }, ({ body, ack, say }) => {
    console.log('here');
    console.log(body);
    var slackID = body.user.id;
    var submission = body.submission;
    if (isNaN(submission["problems_goal"]) || isNaN(parseFloat(submission["problems_goal"]))) {
        console.log("!!!! input hours not numeric: ", submission);
        res.type('application/json');
        var errorMsg = {
            "errors": [
                { "name": "problems_goal", "error": "This should only be numeric" }
            ]
        }
        ack(errorMsg);
        //res.status(200).send(errorMsg);
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
                slackApp.client.chat.postMessage({ token: envKey, channel: slackID, text: `Great! You've set a goal to solve ${submission.problems_goal} leetcode problems. I will keep you on track :smile:`, as_user: true });
                //bot.postMessage(slackID, `Great! You've set a goal to solve ${submission.problems_goal} leetcode problems. I will keep you on track :smile:`, {as_user:true});
            })
            .catch((err) => {
                slackApp.client.chat.postMessage({ token: envKey, channel: slackID, text: "Ooops!!! Error occurs! Please try again saying weeklyplan", as_user: true });
                //bot.postMessage(slackID, "Ooops!!! Error occurs! Please try again saying weeklyplan", {as_user:true});
            })
        //res.send();
        ack();
    }
});

slackApp.action({ "callback_id": "leetcode_connection_callback" }, ({ body, ack, say }) => {
    console.log('here');
    console.log(body);
    var slackID = body.user.id;
    getSolvedProblemsForUser(slackID, body.submission.cookie, ack, updateUserProfile);
});

function updateUserProfile(slackID, cookie, ack, error, num_total){
    if(error){
        console.log(error);
        ack({"errors":[{"name": "cookie", "error": "Cookie Error:  "+error}]});
    }else{
        User.findOne({slackID: slackID}).exec(function(err, user){
            if(err){
                console.log(err);
                ack({"errors":[{"name": "cookie", "error": "DB Error:  "+error}]});
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
                    slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:"Congratulations! You successfully connect with Leetcode ", as_user: true });
                    //bot.postMessage(slackID, "Congratulations! You successfully connect with Leetcode ", {as_user:true});
                    })
                .catch((err) => {
                    console.log('error in new User api');
                    console.log(err);
                    console.log(err.errmsg);
                    slackApp.client.chat.postMessage({token: envKey, channel:slackID, text:"Ooops!!! Error occurs! Please try again by saying connect", as_user: true });
                    //bot.postMessage(slackID, "Ooops!!! Error occurs! Please try again by saying connect", {as_user:true});
                });
                ack();
            }
        });
    }
}

(async () => {
    // Start the app
    await slackApp.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    slackApp.client.chat.postMessage({token: envKey, channel:"UJAJABTFZ", text:"Alive", as_user: true });
    startWeeklyPlanner();
    startDailyProgressCheckReport();
    startDailyLeaderBoardCheck();
  })();

module.exports = {
    slackApp: slackApp,
    getMonday: getMonday
}