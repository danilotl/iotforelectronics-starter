var express = require('express');
var router = express.Router();
var appEnv = require("cfenv").getAppEnv();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', {
	  title: 'Single Device Simulator'
  });
});

/* GET home page. */
router.get('/simulationClient', function(req, res) {
	var protocol = (appEnv.isLocal) ? 'ws://' : 'wss://';
	var address = (appEnv.isLocal) ? appEnv.bind +  ':' + appEnv.port : appEnv.url.split("://")[1]; 
	var wsurl =  protocol + address + '/serverStatus';
	res.render('simulationClient', { wsurl: wsurl });
});

module.exports = router;