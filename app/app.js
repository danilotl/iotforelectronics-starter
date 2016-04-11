VCAP_SERVICES = {};
if(process.env.VCAP_SERVICES)
	VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);

var iotf_host = VCAP_SERVICES["iotf-service"][0]["credentials"].http_host;

if(iotf_host.search('.staging.internetofthings.ibmcloud.com') > -1)
	process.env.STAGING = 1;

var express         = require('express');
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
    debug           = require('debug')('virtualDevices:server'),
    WebSocketServer = require('ws').Server,
    q               = require('q'),
    apiRouter       = require('./routes/api');

var jsonParser = bodyParser.json();

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
app.use('/api', apiRouter);

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
//var cloudantCreds = services.cloudantNoSQLDB[0].credentials;

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
/*   Internal API       									   */
/* Input: url params that contains the userID 			       */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/internal/:userID', function(req, res)
{
	console.log('GET /users  ==> Begin');
    console.log('GET /users  ==> Incoming userID = '+ req.params.userID);
    
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
/* Route to get 1 user document from Cloudant (1)              */
/*															   */
/* Input: url params that contains the userID 			       */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	res.redirect('/users/internal/' + req.user.id);
});

/***************************************************************/
/* Route to add 1 user document to Cloudant.   (2)             */
/*           Internal API                                      */
/* Input: JSON structure that contains the userID, name,       */
/*             address, and telephone                          */
/***************************************************************/
app.post("/users/internal", function (req, res)
{
	console.log("POST /users  ==> Begin");

   var doc = {userID: req.body.userID, name:req.body.name, telephone:req.body.telephone, address:req.body.address};
   db.find({selector:{userID:req.body.userID}}, function(er, result) 
   {
	   if (er) 
	   {
		   res.sendStatus(er.statusCode);
		   return;
	   }
	   //if user already exists, send error code	
	   if (result.docs.length!=0)
	   {
			console.log("User already exists.");
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
				   res.sendStatus(201);
			   }
		   });
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
	var formData = req.body;
	formData.userID = req.user.id;
	
	request.post({url: 'https://' + application.application_uris[0] + '/users/internal', formData: formData}, function optionalCallback(err, httpResponse, body) {
	if (err) {
    return console.error('upload failed:', err);
	}
	});
});


/******************************************************************/
/* Route to add 1 appliance document to registration Cloudant.(3) */
/*                 												  */
/*  Internal API                                                  */
/* Input: JSON structure that contains the userID, applianceID,   */
/*             serial number, manufacturer, and model             */
/******************************************************************/
app.post('/appliances/internal', function (req, res)
{
    console.log("POST /appliances  ==> Begin");
   console.log("POST /applianecs  ==> Inserting device document in Cloudant");
   console.log(req.body.userID);
   console.log(req.body.applianceID);
   var doc = {userID: req.body.userID, applianceID: req.body.applianceID, serialNumber: req.body.serialNumber, manufacturer: req.body.manufacturer, name: req.body.name, dateOfPurchase: req.body.dateOfPurchase, model: req.body.model, registrationCreatedOnPlatform: false};
   
	var https = require('https');

	// //API keys from IoTF
	// var auth_key = "a-1jw61a-yxv230waqu";
	// var auth_token = "*kr*4(mkdC3e7BQJQC";

	// var options = 
	// {
	// 		host: '1jw61a.internetofthings.ibmcloud.com',
	// 		path: '/api/v0002/device/types/washingMachine/devices/'+ req.body.applianceID,
	// 		auth: auth_key + ':' + auth_token
	// };

    //API keys from IoTF
    var auth_key = services.iotf-service.apiKey;
    var auth_token = servicse.iotf-service.apiToken;

    var options =
    {
            host: services.iotf-service.base_uri,
            path: '/device/types/washingMachine/devices/'+ req.body.applianceID,
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
				console.log(req.body.applianceID + " does not exist.");
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


/***************************************************************/
/* Route to add 1 appliance document to registration Cloudant.(3) */
/*                                                             */
/* Input: JSON structure that contains the userID, applianceID,*/
/*             serial number, manufacturer, and model          */
/***************************************************************/
//TODO: check if we already have registered this appliance?
// app.post('/appliances', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)  
// {
// 	console.log('JSON log: ', req.body);
// 	var formData = req.body;
// 	formData.userID = req.user.id;
	
// 	request.post({url: 'https://' + application.application_uris[0] + '/appliances/internal', formData: formData}, function optionalCallback(err, httpResponse, body) {
// 	if (err) {
//     return console.error('upload failed:', err);
// 	}
// 	});
// });
app.post('/appliances', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)  
{
   var bodyIn = req.body;
   bodyIn.userID = req.user.id;
   
   request.post({url: 'https://' + application.application_uris[0] + '/appliances/internal', 
                 body: JSON.stringify(bodyIn), 
                 headers: { "content-type": "application/json"}
                 },
                 function optionalCallback(err, httpResponse, body) {

		if (!error && response.statusCode == 200) {
              console.log(bodyIn)
        }
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
/* Route to show one user doc using Cloudant Query             */
/*   Internal API											   */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get("/user/internal/:userID", function(req, res)
{
   console.log('GET /user  ==> Begin');
    console.log('GET /users  ==> Incoming userID = '+ req.params.userID);
	
   var responseDoc = {docs:[]};

   db.find({selector:{userID:req.params.userID}}, function(err, result)
   {
     if (err)
     {
       console.log("GET /user ==> Error received from database = " + err.statusCode);
       console.log(err);
       return;
     }
    
     if (result.docs.length==0)
     {
        console.log("GET /user ==> user:" + req.params.userID + " not in database");
		res.sendStatus(404);
        return;
     }
     else
     {
	 console.log(result);
        for (var i = 0; i < result.docs.length; i++)
        {
          if (!('applianceID'  in result.docs[i]))
          {
             responseDoc.docs.push({userID:    result.docs[i].userID,
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
/* Route to show one user doc using Cloudant Query             */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get('/user/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	res.redirect('user/internal/' + req.user.id);
});


/***************************************************************/
/* Route to list all appliance documents for given user   (4)  */
/*   Internal API            								   */
/* Input: Query string with userID and optional applianceID    */
/***************************************************************/
app.get('appliances/internal/:userID', function (req, res)
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
									   manufacturer: result.docs[i].manufacturer,
									   name: result.docs[i].name,
									   dateOfPurchase: result.docs[i].dateOfPurchase,
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
app.get("/appliances/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res) 
{
	res.redirect('/appliances/internal/' + req.user.id);
});



/****************************************************************************/
/* Route to list 1 appliance document for given userID and applianceID (4)  */
/*       Internal API										   				*/
/* Input: Query string with userID and optional applianceID    				*/
/****************************************************************************/
app.get('/appliances/internal2/:userID/:applianceID', function (req, res)
{
	// create empty array responseDoc, to hold just the appliance docs (will filter out user docs) to return
	var responseDoc = {docs:[]};
	//find a device doc given query string with userID and optional applianceID
	//first query by user, then by applianceID
	
	db.find({selector:{userID:req.params.userID, applianceID:req.params.applianceID}}, function(err, result) 
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
    	 
         responseDoc.docs.push({userID: result.docs[0].userID,
                                       applianceID: result.docs[0].applianceID,
                                       serialNumber: result.docs[0].serialNumber,
									   manufacturer: result.docs[0].manufacturer,
									   name: result.docs[0].name,
									   dateOfPurchase: result.docs[0].dateOfPurchase,
                                       model: result.docs[0].model});
									   
									   
    //we found something and didn't hit an error, send 200 and the result
    res.status(200).json(responseDoc);

    });


});

/****************************************************************************/
/* Route to list 1 appliance document for given userID and applianceID (4)  */
/*       													   				*/
/* Input: Query string with userID and optional applianceID    				*/
/****************************************************************************/
app.get("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res) 
{
	res.redirect('/appliances/internal2/' + req.user.id + '/' + req.params.applianceID);
});



/***************************************************************/
/* Route to delete appliance records                           */
/***************************************************************/
app.del('/appliances/internal/:userID/:applianceID', function(req, res) 
{
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

/***************************************************************/
/* Route to delete appliance records                           */
/*    Internal API											   */
/***************************************************************/
app.del("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	res.redirect('/appliances/internal/' + req.user.id + '/' + req.params.applianceID);
});


/**************************************************************************************** **/
/* Route to delete user documents.                              						   */
/* Need to delete the appliance documents as well from our db  							   */
/* If we created them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete('/user/internal/:userID', function (req, res)
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

/**************************************************************************************** **/
/* Route to delete user documents.                              						   */
/* Need to delete the appliance documents as well from our db  							   */
/* If we created them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete("/user/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	res.redirect('/user/internal/' + req.user.id);
});

//get IoT-Foundation credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["iotf-service"])
	throw "Cannot get IoT-Foundation credentials"
var iotfCredentials = VCAP_SERVICES["iotf-service"][0]["credentials"];
/********************************************************************** **/
/*End of Registration Integrator Code                                               */
/********************************************************************** **/

/********************************************************************** **/
/*Solution Integrator Code                                               */
/********************************************************************** **/
  //Get RTI credentials
  if(!VCAP_SERVICES || !VCAP_SERVICES["IoT Real-Time Insight"])
  	throw "Cannot get RTI credentials"
  var rtiCredentials = VCAP_SERVICES["IoT Real-Time Insight"][0]["credentials"];

// //Get IoT for Electronics credentials
// //if(!VCAP_SERVICES || !VCAP_SERVICES["ibmiotforelectronics"])
// //	throw "Cannot get IoT4E credentials"
// //var ioteCredentials = VCAP_SERVICES["ibmiotforelectronics"][0]["credentials"];


 //IoT Platform Credentials
  var name = iotfCredentials["org"];
  var orgId = iotfCredentials["org"];
  var apiKey = iotfCredentials["apiKey"];
  var authToken = iotfCredentials["apiToken"];
  var baseURI = iotfCredentials["base_uri"];
  var apiURI = 'https://' + iotfCredentials["http_host"] + ':443/api/v0002';

 // //RTI Credentials
  var rtiApiKey = rtiCredentials["apiKey"];
  var rtiAuthToken = rtiCredentials["authToken"];
  var rtiBaseUrl = rtiCredentials["baseUrl"];
  var disabled = false;

// //IoT for Electronics Credentials
// //var ioteUser = ioteCredentials["userid"];
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
  var iotpDeviceType = iotpPost('/device/types',{
  	"id": "washingMachine",
  	"description": "IoT4E Washing Machine",
  	"classId": "Device"
 });

// //IoT Platform device creation call
// //var iotpDeviceType = iotpPost('/device/types/washingMachine/devices',{
// //  //"id": "d:abc123:myType:myDevice",
// //  "typeId": "washingMachine",
// //  "deviceId": "washingMachineElec"
// //});

  //RTI data source creation call
  var rtiSource = rtiPost('/message/source',{
  	"name": name,
  	"orgId": orgId,
  	"apiKey": apiKey,
  	"authToken": authToken,
  	"disabled": disabled});

 // //RTI schema creation call
  var rtiSchema = rtiPost('/message/schema',{
  	"name": "Electronics",
  	"format": "JSON",
  	"items": []});
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
server.on('listening', onListening);

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

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
				: 'port ' + addr.port;
	debug('Listening on ' + bind);
	
	var devicesManager = require("./devicesManager");
//	web socket for index page
	var wss = new WebSocketServer({ server: app.server, path :  '/serverStatus'});
	wss.on('connection', function(ws) {
		var id = setInterval(function() {
			var stats = devicesManager.getStats();
			_.extend(stats, process.memoryUsage());			
			ws.send(JSON.stringify(stats), function() { /* ignore errors */ });
		}, 5000);
		console.log('started server status client interval');
		ws.on('close', function() {
			console.log('stopping server status client interval');
			clearInterval(id);
		});
	});
//	var devicesManager = require("./devicesManager").createFromModelFiles();
}

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

// app.use(function(req, res, next){
//     res.status(404).send("This is not the URL you're looking for");
// });