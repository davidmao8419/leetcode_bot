var SlackBot = require('slackbots');
var mongoose = require('mongoose');
var CronJob = require('cron').CronJob;
//mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true }); // only when test bot.js
var { User } = require('./models/models');
var _ = require('underscore')
const envKey = process.env.NUDGE_BOT_TOKEN;
mongoose.Promise = global.Promise;

// create a bot
var bot = new SlackBot({
    token: envKey,
    name: 'nudgebot'
});

const startDailyProgressCheck = function () {
    console.log('startDailyProgressCheck');
    var job = new CronJob({
        cronTime: '00 00 00 * * *',
        onTick: function () {
            console.log('startDailyProgressCheck tick!');
            dailyProgressCheck(dailyProgressCheck_users);
        }
    });
    job.start();
}

const startDailyProgressCheckReport = function(){
    console.log('startDailyProgressCheckReport');
    var job = new CronJob({
        cronTime: '00 00 07 * * *',
        onTick: function() {
            console.log('startDailyProgressCheckReport tick!');
            dailyProgressCheck(dailyProgressCheckReport_users);
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
    startDailyProgressCheck();
    startDailyProgressCheckReport();
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

module.exports = {
    bot: bot,
    getMonday: getMonday
}