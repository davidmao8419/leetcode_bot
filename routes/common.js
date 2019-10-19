var request = require('request');

function startDialog(requestData){
    var requestJson = {
        url: "https://api.slack.com/api/dialog.open",
        method: "POST",
        json: true,
        headers: {
            "content-type": "application/json",
            "Authorization": "Bearer "+process.env.NUDGE_BOT_TOKEN,
        },
        body: requestData,
    };
    console.log("requestJson", requestJson);
    request(requestJson, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    });
}

function getSolvedProblemsForUser(slackID, cookie, res, callback) {
    var url = 'https://leetcode.com/api/problems/algorithms/';
    var requestJson = {
        url: url,
        method: 'GET',
        headers: {
            cookie: cookie,
            'Cache-Control': 'no-cache'
        },
    }

    request(requestJson, function (error, response, body) {
        if(error) {
            console.log("updateUserProfile error");
            callback(slackID, cookie, res, error, null);
        } else {
            var data = JSON.parse(body);
            var num_total = data['num_solved'];
            console.log('+++++++++');
            console.log(num_total);
            console.log(data);
            if(data['user_name']==''){
                callback(slackID, cookie, res, 'Cookie useless', null);
            }else{
                callback(slackID, cookie, res, error, num_total);
            }
        }
    });
}

module.exports = {
    startDialog: startDialog,
    getSolvedProblemsForUser: getSolvedProblemsForUser,
}