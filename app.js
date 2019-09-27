var SlackBot = require('slackbots')
const request = require('request');

// create a bot

var bot = new SlackBot({
    token: 'xoxb-540387332166-775336892677-C6WkG8JL31G55sPBTYCuOVBi',
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
                    }
                }
    }
});


// get all the leetcode problems information
// TODO: update all the information to the database at a scheduled time
/*
request('https://leetcode.com/api/problems/algorithms/', function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // get all the leetcode problems information
});
*/