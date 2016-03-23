var express      = require('express'),
    path         = require('path'),
    favicon      = require('serve-favicon'),
    logger       = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser   = require('body-parser'),
    cors         = require('cors'),
    routes       = require('./routes/index'),
    device       = require('./routes/device');

var iot4electronicsDebug = null;
//require user extentions  
try {
	iot4electronicsDebug = require("./iot4electronicsDebug.js");	
} catch (e) {
	try {
		iot4electronicsDebug = require("./_debug.js");			
	} catch (e) {
		console.log("For Debug add _debug.js or iot4electronicsDebug.js");
	};	
}

//There are many useful environment variables available in process.env.
//VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
//TODO: Get application information and use it in your app.

//VCAP_SERVICES contains all the credentials of services bound to
//this application. For details of its content, please refer to
//the document or sample of each service.
VCAP_SERVICES = {};
if(process.env.VCAP_SERVICES)
	VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
//try and get vcap from debug  
else if (iot4electronicsDebug && iot4electronicsDebug.VCAP_SERVICES)
	VCAP_SERVICES = iot4electronicsDebug.VCAP_SERVICES;



//The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');

//global connectedDevicesCache
connectedDevicesCache = require('./lib/connectedDevicesCache');



//global HTTP routers
httpRouter = require('./routes/httpRouter');

//get IoT-Foundation credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["iotf-service"])
	throw "Cannot get IoT-Foundation credentials"
var iotfCredentials = VCAP_SERVICES["iotf-service"][0]["credentials"];

//global IoT-Foundation connectors 
washingMachineIoTFClient = require('./mqtt/washingMachineIoTFClient'); 
washingMachineIoTFClient.connectToBroker(iotfCredentials);
	
var app = express();
//set the app object to export so it can be required 
module.exports = app;
var server = require('http').Server(app);
iotAppMonitor = require('./lib/iotAppMonitorServer')(server);

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//allow cross domain calls
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/', httpRouter);
app.use('/', device);


//iot-workbench additional requires   
try {
	require("./_requires.js");	
} catch (e) {	
		//no iot-workbench additional _requires;		
}


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

app.set('port', process.env.VCAP_APP_PORT || 3000);

//require user extensions  
try {
	require("./iot4electronics.js");	
} catch (e) {
	try {
		require("./_app.js");			
	} catch (e) {
		console.log("Failed to load extention files _app.js or iot4electronics.js: " + e.message);
	};	
}

//Start server
server.listen(app.get('port'), function() {
	console.log('Server listening on port ' + server.address().port);
});


