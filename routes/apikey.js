var express = require('express');
var router = express.Router();
//mongoose.connect(process.env.MONGODB_URI,{ useNewUrlParser: true }); 
var { startDialog, getSolvedProblemsForUser } = require('./common');
var {User} = require('../models/models');
var {bot} = require('../bot');

router.post('/', function (req, res) {
    var data = JSON.parse(req.body.payload);
    var slackID = data.user.id;
    console.log("post apikey:", data);
    if (data.type == "dialog_submission") {
        if (data.callback_id == "leetcode_connection_callback") {
            getSolvedProblemsForUser(slackID, data.submission.cookie, res, updateUserProfile);
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
