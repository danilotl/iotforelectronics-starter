var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
	
	var iot4electronicsDebug = null;
	//require user extentions  
	try {
		iot4electronicsDebug = require("../_debug.js");			
	} catch (e) {
		console.log("For Debug add _debug.js or iot4electronicsDebug.js");
	};
	
	// setup links
	var VCAP_SERVICES = {};
	if(process.env.VCAP_SERVICES)
		VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
	else if (iot4electronicsDebug && iot4electronicsDebug.VCAP_SERVICES)
		VCAP_SERVICES = iot4electronicsDebug.VCAP_SERVICES;
	
	var patformDashboard = 'https://' + VCAP_SERVICES['iotf-service'][0]['credentials'].http_host + '/dashboard';
	
	console.log(patformDashboard);
	
  res.render('index', {
	  title: 'Single Device Simulator',
	  platformDashboard: patformDashboard
  });
});

module.exports = router;