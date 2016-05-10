VCAP_SERVICES = {};
if(process.env.VCAP_SERVICES)
	VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);

var iotf_host = VCAP_SERVICES["iotf-service"][0]["credentials"].http_host;

if(iotf_host.search('.staging.internetofthings.ibmcloud.com') > -1)
	process.env.STAGING = 1;

var express = require('express');
var cfenv = require('cfenv');
var log4js = require('log4js');

var app = express();
//set the app object to export so it can be required
module.exports = app;

var path            = require('path'),
    favicon         = require('serve-favicon'),
    logger          = require('morgan'),
    cookieParser    = require('cookie-parser'),
    bodyParser      = require('body-parser'),
    cors            = require('cors'),
    routes          = require('./routes/index'),
    device          = require('./routes/device'),
    simulator       = require('./routes/simulator'),
    http            = require('http'),
    request         = require('request'),
    _               = require("underscore"),
    appEnv          = cfenv.getAppEnv(),
    q               = require('q');

var jsonParser = bodyParser.json();
var i18n = require("i18n");

i18n.configure({
    directory: __dirname + '/locales',
    defaultLocale: 'en',
    queryParameter: 'lang',
    objectNotation: true,
    fallbacks: {
      'pt'   : 'pt_BR',
      'pt-BR': 'pt_BR',
      'zh-CN': 'zh_CN',
      'zh-TW': 'zh_TW'
    },
    prefix: 'electronics-'
});

dumpError = function(msg, err) {
	if (typeof err === 'object') {
		msg = (msg) ? msg : "";
		var message = "***********ERROR: " + msg + " *************\n";
		if (err.message) {
			message += '\nMessage: ' + err.message;
		}
		if (err.stack) {
			message += '\nStacktrace:\n';
			message += '====================\n';
			message += err.stack;
			message += '====================\n';
		}
		console.error(message);
	} else {
		console.error('dumpError :: argument is not an object');
	}
};

//The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');

//global HTTP routers
httpRouter = require('./routes/httpRouter');

//Add a handler to inspect the req.secure flag (see
//http://expressjs.com/api#req.secure). This allows us
//to know whether the request was via http or https.
app.use(function (req, res, next) {
	res.set({
		'Cache-Control': 'no-store',
		'Pragma': 'no-cache'
	});
	//force https
	if(!appEnv.isLocal && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] == 'http')
		res.redirect('https://' + req.headers.host + req.url);
	else
		next();
});

//allow cross domain calls
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(i18n.init);

app.use(function(req, res, next){
  if(req.query.mocked === 'true'){
    var locale = req.getLocale();
    req.setLocale('mocked_' + req.getLocale());
    if(req.getLocale() !== 'mocked_' + locale){
      req.setLocale(locale);
    }
    next();
  } else {
    next();
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/', httpRouter);
app.use('/', device);
app.use('/', simulator);

if(!VCAP_SERVICES || !VCAP_SERVICES["iotf-service"])
	throw "Cannot get IoT-Foundation credentials"
var iotfCredentials = VCAP_SERVICES["iotf-service"][0]["credentials"];

/***************************************************************/
//STEPHANIES'S CODE *************
/***************************************************************/
/***************************************************************/

// SETUP CLOUDANT
//Key whichispermandencellansp
//Password a8ba75e7534498a85a9f0c11adbe11e09ae03177 //
var id = 'ca15409e-9847-4b9e-9d8c-ec26c4cf01ae-bluemix';
var pword = 'f1ad812df21ef96a09dbfbaff6de261e3085b0a5da0518bede7ab69a1caff3f7';
var host  = 'ca15409e-9847-4b9e-9d8c-ec26c4cf01ae-bluemix.cloudant.com';
var CLOUDANT_URL='https://' + id + ':' + pword + '@' + host;
var dbname   = 'iot_for_electronics_registration';

var passport   = require('passport');
var MCABackendStrategy = require('bms-mca-token-validation-strategy').MCABackendStrategy;
var Cloudant   = require('cloudant');

var services = JSON.parse(process.env.VCAP_SERVICES)
var application = JSON.parse(process.env.VCAP_APPLICATION)
var currentOrgID = iotfCredentials["org"];

var cloudant = Cloudant(CLOUDANT_URL, function(err,cloudant){
	db = cloudant.db.use(dbname);
	//make sure it is created
	cloudant.db.get(dbname, function(err, body) {
		if(err){
			console.log('creating ' + dbname);
			cloudant.db.create(dbname, function(err,body) {
				if (!err)
					console.log('DB created ');
				else
					console.error('Err creating DB ' + err );
			});
		}
		else {
			console.log("connected to DB");
		}
});
});

/***************************************************************/
/* Set up express server & passport                            */
/***************************************************************/
passport.use(new MCABackendStrategy());
app.use(passport.initialize());

/***************************************************************/
/* Route to get 1 user document from Cloudant (1)              */
/*															   */
/* Input: url params that contains the userID 			       */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	res.redirect('https://iotforelectronicstile.stage1.bluemix.net/users/internal/' + req.user.id + '/' + currentOrgID + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken)
});

/***************************************************************/
/* Route to add 1 user document to Cloudant.   (2)             */
/*                                                             */
/* Input: JSON structure that contains the userID, name,       */
/*             address, and telephone			               */
/***************************************************************/
// passport.authenticate('mca-backend-strategy', {session: false }),
app.post("/users", passport.authenticate('mca-backend-strategy', {session: false }),  function (req, res)
{
	var formData = req.body;
	formData.userID = req.user.id;
	formData.orgID = currentOrgID;

	request.post({url: 'https://iotforelectronicstile.stage1.bluemix.net/users/internal/' + currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken, formData: formData}, 
		      function optionalCallback(err, httpResponse, body) {
			if (err) {
    				return console.error('upload failed:', err);
			}
	});
});


/***************************************************************/
/* Route to add 1 appliance document to registration Cloudant.(3) */
/*                                                             */
/* Input: JSON structure that contains the userID, applianceID,*/
/*             serial number, manufacturer, and model          */
/***************************************************************/
app.post('/appliances', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
   var bodyIn = req.body;
   bodyIn.userID = req.user.id;
   bodyIn.orgID = currentOrgID;
   
   var httpHost = iotfCredentials["http_host"]

   request.post({url: 'https://iotforelectronicstile.stage1.bluemix.net/appliances/internal/' + currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + httpHost + '/' + iotEAuthToken,
                 body: JSON.stringify(bodyIn),
                 headers: { "content-type": "application/json"}
                 },
                 function optionalCallback(err, httpResponse, body) {

		if (!err && httpResponse.statusCode == 201) {
			res.sendStatus(httpResponse.statusCode);
              		console.log("SUCCESS: " + bodyIn);
		} else {
				console.log("Error in POST /appliances" + httpResponse.statusCode);
				res.sendStatus(httpResponse.statusCode);
			}
   });
});


/***************************************************************/
/* Route to show one user doc using Cloudant Query             */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get('/user/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	res.redirect('https://iotforelectronicstile.stage1.bluemix.net/user/internal/' + req.user.id + '/' +  currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken, function (reqest, response){
		if (response.statusCode == 201) {
							res.sendStatus(httpResponse.statusCode);
							console.log("SUCCESS: " + bodyIn);
				} else {
					console.log("Error in POST /appliances" + response.statusCode);
					res.sendStatus(httpResponse.statusCode);
				}
	});

});



/***************************************************************/
/* Route to list all appliance documents for given user   (4)  */
/*       													   */
/* Input: Query string with userID and optional applianceID    */
/***************************************************************/
app.get('/appliances/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	res.redirect('https://iotforelectronicstile.stage1.bluemix.net/appliances/internal/' + req.user.id + '/' + currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken);
});


/****************************************************************************/
/* Route to list 1 appliance document for given userID and applianceID (4)  */
/*       													   				*/
/* Input: Query string with userID and optional applianceID    				*/
/****************************************************************************/
app.get("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	res.redirect('https://iotforelectronicstile.stage1.bluemix.net/appliances/internal2/' + req.user.id + '/' + req.params.applianceID +'/' + currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken);
});


/***************************************************************/
/* Route to delete appliance records                           */
/*    Internal API											   */
/***************************************************************/
app.del("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	res.redirect('https://iotforelectronicstile.stage1.bluemix.net/appliances/internal/' + req.user.id + '/' + req.params.applianceID +'/' + currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken);
});



/**************************************************************************************** **/
/* Route to delete user documents.                              						   */
/* Need to delete the appliance documents as well from our db  							   */
/* If we created them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete("/user/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	res.redirect('https://iotforelectronicstile.stage1.bluemix.net/user/internal/' + req.user.id +'/' + currentOrgID + '/' + iotETenant + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken);
});

//get IoT-Foundation credentials

/********************************************************************** **/
/*End of Registration Integrator Code                                               */
/********************************************************************** **/

/*
 * CONRAD'S CODE
 */

//Using hardcoded user repository
var userRepository = {
    "conrad":      { password: "12345" , displayName:"Conrad Kao"      , dob:"October 9, 1940"},
    "john.lennon":      { password: "12345" , displayName:"John Lennon"      , dob:"October 9, 1940"},
    "paul.mccartney":   { password: "67890" , displayName:"Paul McCartney"   , dob:"June 18, 1942"},
    "ringo.starr":      { password: "abcde" , displayName:"Ringo Starr"      , dob: "July 7, 1940"},
    "george.harrison":  { password: "fghij" , displayName: "George Harrison" , dob:"Feburary 25, 1943"}
};

var logger = log4js.getLogger("CustomIdentityProviderApp");
logger.info("Starting up");

app.post('/apps/:tenantId/:realmName/startAuthorization', jsonParser, function(req, res){
    var tenantId = req.params.tenantId;
    var realmName = req.params.realmName;
    var headers = req.body.headers;

    logger.debug("startAuthorization", tenantId, realmName, headers);

    var responseJson = {
        status: "challenge",
        challenge: {
            text: "Enter username and password"
        }
    };

    res.status(200).json(responseJson);
});

app.post('/apps/:tenantId/:realmName/handleChallengeAnswer', jsonParser, function(req, res){
    var tenantId = req.params.tenantId;
    var realmName = req.params.realmName;
    var challengeAnswer = req.body.challengeAnswer;

    logger.debug("handleChallengeAnswer", tenantId, realmName, challengeAnswer);

    var username = req.body.challengeAnswer["username"];
    var password = req.body.challengeAnswer["password"];

    var responseJson = { status: "failure" };

    //add the following lines to add a new user (temporily) when the username is not existed.
    if (userRepository[username] == null) {
        userRepository[username]={password: password, displayName: username, dob:"December 31, 2016"};
    }

    var userObject = userRepository[username];

    if (userObject && userObject.password == password ){
        logger.debug("Login success for userId ::", username);
        responseJson.status = "success";
        responseJson.userIdentity = {
            userName: username,
            displayName: userObject.displayName,
            attributes: {
                dob: userObject.dob
            }
        };
    } else {
        logger.debug("Login failure for userId ::", username);
    }

    res.status(200).json(responseJson);
});


/********************************************************************** **/
/*Solution Integrator Code                                               */
/********************************************************************** **/
  //Get RTI credentials
  //if(!VCAP_SERVICES || !VCAP_SERVICES["IoT Real-Time Insight"])
  //	throw "Cannot get RTI credentials"
  //var rtiCredentials = VCAP_SERVICES["IoT Real-Time Insight"][0]["credentials"];

//Get IoT for Electronics credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["ibmiotforelectronics"])
	throw "Cannot get IoT4E credentials"
var iotECredentials = VCAP_SERVICES["ibmiotforelectronics"][0]["credentials"];


 //IoT Platform Credentials
  var name = iotfCredentials["org"];
  var orgId = iotfCredentials["org"];
  var apiKey = iotfCredentials["apiKey"];
  var authToken = iotfCredentials["apiToken"];
  var baseURI = iotfCredentials["base_uri"];
  var apiURI = 'https://' + iotfCredentials["http_host"] + ':443/api/v0002';

//RTI Credentials
//  var rtiApiKey = rtiCredentials["apiKey"];
//  var rtiAuthToken = rtiCredentials["authToken"];
//  var rtiBaseUrl = rtiCredentials["baseUrl"];
//  var disabled = false;

//IoT for Electronics Credentials
  var iotETenant = iotECredentials["tenantID"];
  var iotEAuthToken = iotECredentials["authToken"];
  var iotEApiKey = iotECredentials["apiKey"];

console.log('About to store IoTP Credentials');
var url = ['https://iotforelectronicstile.stage1.bluemix.net/credentials', orgId, apiKey, authToken, iotEAuthToken,iotEApiKey].join('/');
console.log('Credentials API URL:', url);
request
  .get(url, {timeout: 3000})
  .on('response', function(response){
    console.log('Response received.');
  })
  .on('error', function(error){
    if(error.code === 'ETIMEDOUT')
      console.log('Request timed out.');
    else
      console.log(error);
  }); 
console.log('called api to Store IOTP Credentials on : ' + 'https://iotforelectronicstile.stage1.bluemix.net/credentials/' + orgId + '/' + apiKey + '/' + authToken + '/' + iotEAuthToken);

// //var iotePass = ioteCredentials["password"];

// //IoT Platform Device Types
// //var	iotpDevId = "washingMachine";
// //var	iotpDescription = "IoT4E Washing Machine";
// //var	iotpClassId = "Device"

// //RTI Message Schema Info
// //var	rtiSchemaName = "Electronics";

// //IoT Platform Config Creation Method.
  var iotpPost = function iotpPost (path, json) {
  console.log('calling api to POST: ' + baseURI);
  console.log('IoTP API URI: ' + apiURI);
  console.log('calling api on json: ' + JSON.stringify(json));

    var url = apiURI + path;
    var defer = q.defer();
    var body = '';

    request
     .post({
        url: url,
        json: true,
        body: json
      }).auth(apiKey, authToken, true)
      .on('data', function(data) {
        body += data;
      })
      .on('end', function() {
        var json = JSON.parse(body);
        defer.resolve(json);
     })
     .on('response', function(response) {
        console.log('IoTP status: ' + response.statusCode);
    });
     return defer.promise;
  };

 // //RTI Config Creation Method.
  var rtiPost = function rtiPost (path, json) {
    console.log('calling api to baseURL: ' + rtiBaseUrl);
    console.log('calling api to Path ' + path);
    console.log('Rti Api: ' + rtiApiKey);
    console.log('Rti Token: ' + rtiAuthToken);
    console.log('calling api on json: ' + JSON.stringify(json));

    var url = rtiBaseUrl + path;
    var defer = q.defer();
    var body = '';

    request
     .post({
        url: url,
        json: true,
        body: json
      }).auth(rtiApiKey, rtiAuthToken, true)
     .on('data', function(data) {
        body += data;
      })
      .on('end', function() {
        var json = JSON.parse(body);
        defer.resolve(json);
     })
     .on('response', function(response) {
        console.log('`RTI status: ' + response.statusCode); // 200
    });
     return defer.promise;
   };

//IoT Platform device type creation call
//  var iotpDeviceType = iotpPost('/device/types',{
//  	"id": "washingMachine",
//  	"description": "IoT4E Washing Machine",
//  	"classId": "Device"
// });

// //IoT Platform device creation call
// //var iotpDeviceType = iotpPost('/device/types/washingMachine/devices',{
// //  //"id": "d:abc123:myType:myDevice",
// //  "typeId": "washingMachine",
// //  "deviceId": "washingMachineElec"
// //});

//RTI data source creation call
//var rtiSource = rtiPost('/message/source',{
//	"name": name,
//	"orgId": orgId,
//	"apiKey": apiKey,
//	"authToken": authToken,
//	"disabled": disabled})
//		.then(function(json) {
//			console.log('RTI Source Return: ' + JSON.stringify(json));
//		});

// //RTI schema creation call
//  var rtiSchema = rtiPost('/message/schema',{
//  	"name": "Electronics",
//  	"format": "JSON",
//  	"items": []});

//RTI route creation call
//  var rtiRoute = rtiPost('/message/route',{
//  	"sourceId": name,
//  	"deviceType": "washingMachine",
//  	"eventType": "+",
//  	"schemaId": "Electronics"});

console.log('IoT4E Credentials: ' + iotETenant);  
/********************************************************************** **/
/*End of Solution Integrator Code                                        */
/********************************************************************** **/


//global IoT-Foundation connectors
washingMachineIoTFClient = require('./mqtt/washingMachineIoTFClient');
washingMachineIoTFClient.connectToBroker(iotfCredentials);

//var app = express();

//Enable reverse proxy support in Express. This causes the
//the "X-Forwarded-Proto" header field to be trusted so its
//value can be used to determine the protocol. See
//http://expressjs.com/api#app-settings for more details.
app.enable('trust proxy');

var server = require('http').Server(app);
iotAppMonitor = require('./lib/iotAppMonitorServer')(server);

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

//catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

//error handlers

//development error handler
//will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

//production error handler
//no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

var port = normalizePort(appEnv.port || '3000');
app.set('port', port);

//require user extensions
try {
		require("./_app.js");
	} catch (e) {
		console.log("Failed to load extention file _app.js: " + e.message);
	};

//Start server
server.listen(app.get('port'), function() {
	console.log('Server listening on port ' + server.address().port);
});
server.on('error', onError);

//set the server in the app object
app.server = server;

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
				: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
	case 'EACCES':
		console.error(bind + ' requires elevated privileges');
		process.exit(1);
		break;
	case 'EADDRINUSE':
		console.error(bind + ' is already in use');
		process.exit(1);
		break;
	default:
		throw error;
	}
}

// app.use(function(req, res, next){
//     res.status(404).send("This is not the URL you're looking for");
// });
