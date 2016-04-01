var express      = require('express'),
    path         = require('path'),
    favicon      = require('serve-favicon'),
    logger       = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser   = require('body-parser'),
    cors         = require('cors'),
    routes       = require('./routes/index'),
    device       = require('./routes/device'),
    simulator    = require('./routes/simulator');
    http       = require('http');
    request    = require('request');

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

//Enable reverse proxy support in Express. This causes the
//the "X-Forwarded-Proto" header field to be trusted so its
//value can be used to determine the protocol. See 
//http://expressjs.com/api#app-settings for more details.
app.enable('trust proxy');

//Add a handler to inspect the req.secure flag (see 
//http://expressjs.com/api#req.secure). This allows us 
//to know whether the request was via http or https.
app.use (function (req, res, next) {
     if (req.secure || app.get('env') === 'development') {
             // request was via https, so do no special handling
             next();
     } else {
             // request was via http, so redirect to https
             res.redirect('https://' + req.headers.host + req.url);
     }
});

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
app.use('/', simulator);

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
var cloudantCreds = services.cloudantNoSQLDB[0].credentials;

var cloudant = Cloudant(cloudantCreds.url, function(err,cloudant){
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
/* Input: query string that contains the userID 			   */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	//MCA authentication test 
    //console.log("Securty context", request.securityContext)    
    //response.send(200, "Success!");
    
	console.log('GET /users  ==> Begin');
    console.log('GET /users  ==> Incoming userID = '+ req.query.userID);

	//TODO: review this code. it works, but might not be the best way to do it.
    
    //find a user doc by using the userID index, given query string with userID
    db.find({selector:{userID:req.params.userID}}, function(er, result) 
    {
    	if (er) 
    	{
    		res.sendStatus(er.statusCode);
    		throw er;
    	}
    	
    	if (result.docs.length==0)
    	{
    		res.sendStatus(404)
    	}
    	else
    		res.sendStatus(200);
    	 
    	console.log('Found %d documents with userID', result.docs.length);
    	for (var i = 0; i < result.docs.length; i++) 
    	{
    		console.log('  Doc id: %s', result.docs[i]._id);
    	}

    });
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
   console.log("POST /users  ==> Begin");

   //TODO: change to req.user for MCA after done testing
   //TODO: review code. this works, but might not be best implementation
   var doc = {userID: req.body.userID, name:req.body.name, telephone:req.body.telephone, address:req.body.address};
   db.find({selector:{userID:req.body.userID}}, function(er, result) 
   {
	   if (er) 
	   {
		   res.sendStatus(er.statusCode);
		   throw er;
	   }
	   //if user already exists, send error code	
	   if (result.docs.length!=0)
	   {
		   res.sendStatus(409)
	   }
	   else
	   {
		   db.insert(doc, function(err, data) 
		   {
			   if(err)
			   {
				   console.log('POST /users  ==> Error:', er);
				   res.sendStatus(err.statusCode);
			   }
			   else
			   {
				   console.log("POST /users  ==> Inserting user document in Cloudant");
				   console.log('POST /users  ==> id       = ', data.id);
				   console.log('POST /users  ==> revision = ', data.rev);
				   res.sendStatus(200);
			   }
		   });
	   }
	   
   });
});


/***************************************************************/
/* Route to add 1 appliance document to registration Cloudant.(3) */
/*                                                             */
/* Input: JSON structure that contains the userID, applianceID,*/
/*             serial number, manufacturer, and model          */
/***************************************************************/
//TODO: check if we already have registered this appliance?
app.post('/appliances', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)  
{
    console.log("POST /appliances  ==> Begin");
   console.log("POST /applianecs  ==> Inserting device document in Cloudant");
   console.log(req.query.userID);
   console.log(req.query.applianceID);
   var doc = {userID: req.query.userID, applianceID: req.query.applianceID, serialNumber: req.query.serialNumber, manufacturer: req.query.manufacturer, model: req.query.model, registrationCreatedOnPlatform: false};
   
	var https = require('https');

	//API keys from IoTF
	var auth_key = "a-1jw61a-yxv230waqu";
	var auth_token = "*kr*4(mkdC3e7BQJQC";

	var options = 
	{
			host: '1jw61a.internetofthings.ibmcloud.com',
			path: '/api/v0002/device/types/washingMachine/devices/'+ req.query.applianceID,
			auth: auth_key + ':' + auth_token
	};

	https.get(options, function(platformRes)
	{
		var response = '';
		platformRes.on('data', function(data) 
		{
			response += data;
		});
		platformRes.on('end', function()
		{
			if (response == '')
			{
				console.log(req.query.applianceID + " does not exist.");
				res.sendStatus(409);
				return;
			}
			else
			{
				   db.insert(doc, function(err, data) 
				   {
					   if (err)
					   {
						   console.log('POST /appliances  ==> Error:', err);
					       res.sendStatus(err.statusCode);
					       return;
					   }
					   else
					   {
						   var output = JSON.parse(response);
						   console.log(JSON.stringify(output, null, 2));
						   console.log('POST /appliances  ==> id       = ', data.id);
					       console.log('POST /appliances  ==> revision = ', data.rev);
					       res.sendStatus(201);
					       return;
					   }
					 });

			}

		});

	});
});


app.get("/index", function(req, res)
{
	var index = {name:'userId', type:'json', index:{fields:['userID']}};

	   db.index(index, function(err, response)
	   {
	     if (err)
	     {
	       console.log('GET /index  ==> Error:', err.statusCode);
	       return;
	     }
	     console.log('Index creation result: %s', response.result);
	   });
	   
	/*//create an index to find appliance doc for given userID and applianceID
	var index = {name:'applianceByUser', type:'json', index:{fields:['userID', 'applianceID']}};
	db.index(index, function(er, response) 
	{
		if (er) 
		{
			console.log(er);
			//throw er;
		}     
		console.log('Index creation result: %s', response.result);
	})*/		
});



/***************************************************************/
/* Route to show one user using Cloudant Query                 */
/***************************************************************/
app.get("/user/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
   console.log('GET /user  ==> Begin');

   var responseDoc = {docs:[]};

   db.find({selector:{"userID":req.params.userID}}, function(err, result)

   {
     if (err)
     {
       console.log("GET /user ==> Error received from database = " + err.statusCode);
       console.log(err);
       responseDoc.code    = err.statusCode;
       responseDoc.message = "Error message from Cloudant";
       res.json(responseDoc);
       return;
     }
    
     if (result.docs.length==0)
     {
        console.log("GET /user ==> user:" + req.params.userID + " not in database");
        responseDoc.code = "404";
        responseDoc.message = "Cannot find document in Cloudant DB";
        res.json(responseDoc);
        return;
     }
     else
     {
        for (var i = 0; i < result.docs.length; i++)
        {
          if (!('applianceID'  in result.docs[i]))
          {
             responseDoc.fields.docs.push({userID:    result.docs[i].userID,
                                           name:      result.docs[i].name,
                                           telephone: result.docs[i].telephone,
                                           address:   result.docs[i].address});
          }
        }

        res.status(200).json(responseDoc);
        return;
     }
   });
});


/***************************************************************/
/* Route to list all appliance documents for given user   (4)  */
/*       													   */
/* Input: Query string with userID and optional applianceID    */
/***************************************************************/
app.get("/appliances/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res) 
{
	// create empty array responseDoc, to hold just the appliance docs (will filter out user docs) to return
	var responseDoc = {docs:[]};
	//find a device doc given query string with userID and optional applianceID
	//first query by user, then by applianceID
	
	db.find({selector:{userID:req.params.userID}}, function(err, result) 
    {
    	if (err) 
    	{
			console.log("app.get ==> Error condition");
			console.log(err);
			res.sendStatus(err.statusCode);
			return;
    	}
     if (result.docs.length==0)
     {
       console.log("app.get /appliance ==> Cannot find document");
       res.sendStatus(404);
       return;
     }	 
    	 
    	var i=0;
    while (i < result.docs.length)
    {
       if ('applianceID' in result.docs[i])
       {
         responseDoc.docs.push({userID: result.docs[i].userID,
                                       applianceID: result.docs[i].applianceID,
                                       serialNumber: result.docs[i].serialNumber,
                                       model: result.docs[i].model});
       }
       i++;
    }
	
	//we found something and didn't hit an error, send 200 and the result
    res.status(200).json(responseDoc);
});

    

});



/***************************************************************/
/* Route to list all appliance documents for given user   (4)  */
/*       													   */
/* Input: Query string with userID and optional applianceID    */
/***************************************************************/
app.get("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res) 
{
	// create empty array responseDoc, to hold just the appliance docs (will filter out user docs) to return
	var responseDoc = {docs:[]};
	//find a device doc given query string with userID and optional applianceID
	//first query by user, then by applianceID
	
	db.find({selector:{userID:req.userID, applianceID:req.params.applianceID}}, function(err, result) 
    {
    	if (err) 
    	{
			console.log("app.get ==> Error condition");
			console.log(err);
			res.sendStatus(err.statusCode);
			return;
    	}
     if (result.docs.length==0)
     {
       console.log("app.get /appliance ==> Cannot find document");
       res.sendStatus(404);
       return;
     }	 
    	 
		console.log("**********");
        responseDoc.docs.push({userID: result.docs[0].userID,
                                       applianceID: result.docs[0].applianceID,
                                       serialNumber: result.docs[0].serialNumber,
                                       model: result.docs[0].model});
									   
									   
    //we found something and didn't hit an error, send 200 and the result
    res.status(200).json(responseDoc);

    });

    
});


/***************************************************************/
/* Route to delete appliance records                           */
/***************************************************************/
app.del("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	console.log(req.params);
	//first check that userID AND applianceID were given
   if (req.params.userID == null || req.params.applianceID == null)
   {
      console.log("DEL /appliance ==> userID and/or applianceID not provided");
      res.sendStatus(400);
      return;
   }

   db.find({selector:{userID:req.params.userID, applianceID:req.params.applianceID}}, function(err, result)
   {
     if (err)
     {
       console.log("DEL /appliance ==> Error condition");
       console.log(err);
       res.status(err.statusCode);
       return;
     }

     if (result.docs.length==0)
     {
       console.log("DEL /appliance ==> Cannot find document");
       res.status(404);
       return;
     }
	 
	if (result.docs[0].registrationCreatedOnPlatform == true)
    {
       /*******************************************************************/
       /* Delete from platform and registration databases.                */
       /* For experimental this code will not get executed                */
       /* because registrationCreatedOnPlatform will always be false.     */
       /*******************************************************************/
      console.log("DEL /appliance ==> Deleting appliance from platform and registration database.");
    }
    else
    {
		//delete the record from our db only
		console.log("DEL /appliance ==> Deleting appliance from registration database only.");
		db.destroy(result.docs[0]._id,result.docs[0]._rev, function(err,data)
		{
			if(err)
			{
				console.log('DEL /appliance  ==> Error:', err.statusCode);
				console.log('DEL /appliance  ==> Error: Error deleting document');
				console.log(err);
				res.status(err.statusCode);
			}
			else
			{
				console.log("DEL /appliance ==> Deleted document for userID: " + req.params.userID + " applianceID: " + req.params.applianceID);
				res.status(204);
			}
		});
	}
  });
});

/**************************************************************************************** **/
/* Route to delete user documents.                              						   */
/* Need to delete the appliance documents as well from our db  							   */
/* If we created them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete("/user/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
   if (req.params.userID == null)
   {
      console.log("DEL /user ==> userID not provided");
      res.sendStatus(400);
      return;
   }

   db.find({selector:{userID:req.params.userID}}, function(err, result)
   {
     if (err)
     {
       console.log("DEL /user ==> Error condition");
       console.log(err);
       res.sendStatus(err.statusCode);
       return;
     }

     if (result.docs.length==0)
     {
       console.log("DEL /user ==> Cannot find document in Cloudant");
       res.sendStatus(404);
       return;
     }

     var i=0;
     while (i < result.docs.length)
     {
       if ('applianceID' in result.docs[i])
       {
          /*******************************************************************/
          /* Deleting an appliance document(s)                               */
          /*******************************************************************/
          if (result.docs[i].registrationCreatedOnPlatform == true)
          {
            /*******************************************************************/
            /* Delete from platform and registration databases                 */
            /* As of March 30, 2016, this code will not get executed           */
            /* because registrationCreatedOnPlatform will always be false.     */
            /*******************************************************************/
            console.log("DEL /appliance ==> Deleting appliance from platform and registration database.");
          }
          else
          {
            /*******************************************************************/
            /* Delete from registration database only                          */
            /*******************************************************************/
            console.log("DEL /appliance ==> Deleting appliance from registration database only.");

            db.destroy(result.docs[i]._id,result.docs[i]._rev, function(err,data)
            {
               if(err)
               {
                 console.log('DEL /appliance  ==> Error:', err.statusCode);
                 console.log('DEL /appliance  ==> Error: Error deleting document');
                 console.log(err);
                 res.sendStatus(err.statusCode);
               }
               else
               {
                 console.log("DEL /appliance ==> Deleted appliance document for userID: " + req.params.userID);
               }
            });
          }
       }
       else if (!('applianceID' in result.docs[i]))
       {
          console.log("DEL /appliance ==> Deleting userID document");
          /*******************************************************************/
          /* Delete the user document                                        */
          /*******************************************************************/
          db.destroy(result.docs[i]._id,result.docs[i]._rev, function(err,result)
          {
             if(err)
             {
               console.log('DEL /user  ==> Error:', err.statusCode);
               console.log('DEL /user  ==> Error: Error deleting document');
               console.log(err);
               res.sendStatus(err.statusCode);
             }
             else
             {
               console.log("DEL /user ==> Deleted user document for userID: " + req.params.userID);
             }
          });
       }
       i++;
     }
     res.sendStatus(204);
  });
});