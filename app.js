var mongoose = require('mongoose');
var logger = require('morgan');
var _ = require('underscore');
var {bot} = require('./bot');
var apikey = require('./routes/apikey');

mongoose.connect(process.env.MONGODB_URI,{ useNewUrlParser: true });
mongoose.Promise = global.Promise;

var https = require("https");
setInterval(function() {
    https.get(process.env.DOMAIN);
    console.log("keepwake");
}, 300000); // every 5 minutes (300000)
//This is for the wake process, mongthly quoto limited

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Nudgebot is working! Path Hit: ' + req.url);
});
app.use('/apikey', apikey);

app.listen(process.env.PORT || 3000);
