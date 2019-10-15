var SlackBot = require('slackbots');
const request = require('request');
const axios = require('axios');
const cheerio = require('cheerio');
var mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI,{ useNewUrlParser: true });
mongoose.Promise = global.Promise;

var {LeetcodeQuestions, User} = require('./models/models');

// create a bot
var bot = new SlackBot({
    token: process.env.NUDGE_BOT_TOKEN,
    name: 'leetcode_bot'
});

bot.on('start', function() {
    console.log('bot started!!');
});


bot.on('message', message => {
    var slackID = message.user;
    switch (message.type) {
        case "message":
                if (message.channel[0] === "D" && message.bot_id === undefined) {
                    if(message.text == "update") {
                        console.log("updating all the leetcode problems !!!!");
                        bot.postMessage(slackID, "updating leetcode problems", {as_user:true});
                        update_all_leetcode_problems(slackID);
                    }
                    else if(message.text == 'submission') {
                        // get personal submission here
                        get_user_latest_submissions(slackID, 'davidmao8419');
                    }
                    else if(message.text == 'test') {
                        test_with_cookie('basic-calculator-ii', slackID);
                    }
                }
    }
});

function test_with_cookie(probSlog, slackID) {
    var url = 'https://leetcode.com/api/submissions/'+probSlog+'/';
    var cookie = process.env.COOKIE;
    var requestJson = {
        url: url,
        method: 'GET',
        headers: {
            cookie: cookie,
            'Cache-Control': 'no-cache'
        },
        qs:{offset: '0', limit:'1'} // get only one data
    }

    console.log("in testing to get user data with cookie");

    request(requestJson, function (error, response, body) {
        if(error) {
            console.log("get code submission error");
        } else {
          var bodyJson = JSON.parse(body);
          console.log("!!!! get body success !!!!");
          //console.log(bodyJson);
          var submission = bodyJson.submissions_dump[0];
          console.log(submission.code);
          bot.postMessage(slackID, submission.code, {as_user:true});
        }
        /*
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        */
    });
}

function get_user_latest_submissions(slackID, username) {
    const url = 'https://leetcode.com/'+username;
    axios.get(url).then(function(response){
        var body = response.data;
        const $ = cheerio.load(body);
        const recentSubmission = $('ul.list-group > a');
        solved_problems = [];
        
        recentSubmission.toArray().forEach(problem => {
            const status = $(problem).find('span').first().text().trim();
            const probName = $(problem).find('b').text().trim();
            const probUrl = $(problem).attr('href').trim();
            //console.log("====== Latest Submission ======");
            //console.log("problem name: "+probName);
            //console.log("status: "+status);
            //console.log("probUrl: "+probUrl);
            
            exist_in_list = User.find({ slackID:slackID, solvedProblems: { $in : [probName]} });
            console.log(probName+" count: "+exist_in_list);
            
            //exist_in_list = User.find({ slackID:slackID, $in:[probName, solvedProblems] }).count();

            //exist_in_list = User.find( {$and:[ {slackID:slackID}, {solvedProblems: { $in : [probName]}} ] });
            
            if(status=="Accepted" && !exist_in_list) {
                console.log("!!!!!! ADDing accepted: "+probName);
                var update = {
                    $push: {
                      "solvedProblems": probName
                    }
                };
                User.updateOne({slackID: slackID}, update)
                .then(function(res){
                    console.log("!!!!! update success");
                })
                .catch(function(err){
                    console.log("!!!! an update error occured");
                })   
            } else if(status=="Accepted" && exist_in_list) {
                console.log("!!!! "+probName+" already exists !!!!!");
            }
            
        });

    })
    .catch(function(error){
        console.log("there are errors while getting latest submission for user: ");
        console.log(error);
    })
}

function update_all_leetcode_problems(slackID) {
    var url = 'https://leetcode.com/api/problems/algorithms/';
    console.log("in the function !!!!");
    axios.get(url).then(function(response){
        var data = response.data;
        var num_total = data['num_total'];
        var all_problems = data['stat_status_pairs'];
        var url = "https://leetcode.com/problems/"+all_problems[0]['stat']['question__title_slug'];
        // https://leetcode.com/problems/fizz-buzz-multithreaded/
        // all_problems[0]['stat']['question__title']
        bot.postMessage(slackID, url, {as_user:true});
        all_problems.forEach(problem => {
            var stat = problem['stat'];
            LeetcodeQuestions.findOne({question_id: stat['question_id']}).exec(function(err, question){
                if(err) {
                    console.log(err);
                } else {
                    if(!question) {
                        var newQuestion = new LeetcodeQuestions({
                            question_id: stat['question_id'],
                            question_title: stat['question__title'],
                            question_title_slug: stat['question__title_slug'],
                            difficulty: problem['difficulty']['level']
                        });
                        newQuestion.save()
                        .then( () => {
                            console.log("Saved success for "+stat['question__title']);
                        })
                        .catch((err) => {
                            console.log("!!! Saved failed for "+stat['question__title']);
                            console.log(err)
                        });
                    } else {
                        console.log("question already exist in the database!! "+stat['question__title']);
                        //console.log(question);   
                    }
                }
            });
        });
    })
    .catch(function(error){
        console.log("there are errors while getting all leetcode problems");
    })
}

// get all the leetcode problems information
// TODO: update all the information to the database at a scheduled time
/*
request('https://leetcode.com/api/problems/algorithms/', function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // get all the leetcode problems information
});
*/