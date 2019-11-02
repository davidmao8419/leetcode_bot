var SlackBot = require('slackbots');
var mongoose = require('mongoose');
const request = require('request');
var moment = require('moment');
var CronJob = require('cron').CronJob;
//mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true }); // only when test bot.js
var { User, WeeklyMultiPlan, LeaderBoard, DailySubmission } = require('./models/models');
var _ = require('underscore')
const envKey = process.env.NUDGE_BOT_TOKEN;
mongoose.Promise = global.Promise;

// create a bot
var bot = new SlackBot({
    token: envKey,
    name: 'nudgebot'
});

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
                            bot.postMessage(user.slackID, message, { as_user: true });
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
    bot.postMessage(user.slackID, "Your solved "+ user.problems_solved_yesterday + " problems yesterday! \n"+user.num_total+" in total.", { as_user: true });
}

bot.on('start', function () {
    console.log('bot started!!');
    //startDailyProgressCheck();
    startWeeklyPlanner();
    startDailyProgressCheckReport();
    startDailyLeaderBoardCheck();
});

bot.on('message', message => {
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
                            }
                            else {
                                bot.postMessage(message.user, helpString, { as_user: true });
                            }

                        }
                    }
                });
            }
    }
});

function queryUser(slackID, text){
    var user = text.split(' ')[1];
    console.log("query user ", slackID, text);
    DailySubmission.find({ slackID: user }).sort({date: 'desc'}).exec(function (err, dailySubmissions) {
        if (err) {
            console.log(err);
        } else {
            //console.log(user);
            if (!dailySubmissions||dailySubmissions.length==0) {
                bot.postMessage(slackID, "Sorry! Didn't find the user!", { as_user: true });
            } else {
                console.log("dailySubmissions ", dailySubmissions);
                var message = user+"\n"
                dailySubmissions = dailySubmissions.slice(0, 5);
                for(var i=0;i<dailySubmissions.length;i++)
                {
                    message+='\tsubmitted '+dailySubmissions[i].total_submitted_num+", and solved "+dailySubmissions[i].total_accepted_num+" at "+dailySubmissions[i].date.toISOString().slice(0, 10)+"\n";
                }
                bot.postMessage(slackID, message, { as_user: true });
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
    bot.postMessage(slackID, "", requestData);
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
    bot.postMessage(slackID,"",requestData);
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
                    bot.postMessage(trigger, "You don't have any plan yet.", {as_user:true});
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
              bot.postMessage(slackID, `You submitted ${total_submitted_num} problems yesterday but no accpeted ones. Keep going!!`, { as_user: true });
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
                    bot.postMessage(slackID, `You submitted ${total_submitted_num} problems yesterday and ${total_accepted_num} got accepted!! Good work and keep going!`, { as_user: true });
                    if(done) {
                        setTimeout(function(){newPlan(slackID, "Good job! Set a new goal for this week!");}, 800);
                    }
                })
                .catch((err) => {
                    console.log("weekly plan update error occurs: ", err);
                });
          } else {
              bot.postMessage(slackID, "You made no progress yesterday!! Take action now!", { as_user: true });
          }
        }
    });
}

module.exports = {
    bot: bot,
    getMonday: getMonday
}