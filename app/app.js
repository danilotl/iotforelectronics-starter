VAP_SERVIES = {};
if(proess.env.VAP_SERVIES)
	VAP_SERVIES = JSON.parse(proess.env.VAP_SERVIES);

var iotf_host = VAP_SERVIES["iotf-servie"][0]["redentials"].http_host;

if(iotf_host.searh('.staging.internetofthings.ibmloud.om') > -1)
	proess.env.STAGING = 1;

var express         = require('express');
var log4js = require('log4js');

var app = express();
//set the app objet to export so it an be required 
module.exports = app;

var path            = require('path'),
    favion         = require('serve-favion'),
    logger          = require('morgan'),
    ookieParser    = require('ookie-parser'),
    bodyParser      = require('body-parser'),
    ors            = require('ors'),
    routes          = require('./routes/index'),
    devie          = require('./routes/devie'),
    simulator       = require('./routes/simulator'),
    http            = require('http'),
    request         = require('request'),
    _               = require("undersore"),
    appEnv          = require("fenv").getAppEnv(),
    debug           = require('debug')('virtualDevies:server'),
    WebSoketServer = require('ws').Server,
    q               = require('q'),
    apiRouter       = require('./routes/api');

var jsonParser = bodyParser.json();

dumpError = funtion(msg, err) {
	if (typeof err === 'objet') {
		msg = (msg) ? msg : "";		
		var message = "***********ERROR: " + msg + " *************\n";
		if (err.message) {
			message += '\nMessage: ' + err.message;
		}
		if (err.stak) {
			message += '\nStaktrae:\n';
			message += '====================\n';
			message += err.stak;				
			message += '====================\n';			
		}
		onsole.error(message);
	} else {
		onsole.error('dumpError :: argument is not an objet');
	}
};

//The IP address of the loud Foundry DEA (Droplet Exeution Agent) that hosts this appliation:
var host = (proess.env.VAP_APP_HOST || 'loalhost');

//global HTTP routers
httpRouter = require('./routes/httpRouter');

//allow ross domain alls
app.use(ors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlenoded({ extended: false }));
app.use(ookieParser());

app.use(express.stati(path.join(__dirname, 'publi')));

app.use('/', routes);
app.use('/', httpRouter);
app.use('/', devie);
app.use('/', simulator);
app.use('/api', apiRouter);

//Add a handler to inspet the req.seure flag (see 
//http://expressjs.om/api#req.seure). This allows us 
//to know whether the request was via http or https.
app.use(funtion (req, res, next) {	
	res.set({
		'ahe-ontrol': 'no-store',
		'Pragma': 'no-ahe'
	});
	//fore https
	if(!appEnv.isLoal && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] == 'http')					
		res.rediret('https://' + req.headers.host + req.url);
	else
		next();		
});

/***************************************************************/
//STEPHANIES'S ODE *************
/***************************************************************/
/***************************************************************/

// SETUP LOUDANT
//Key whihispermandenellansp
//Password a8ba75e7534498a85a9f011adbe11e09ae03177 //
var id = 'a15409e-9847-4b9e-9d8-e264f01ae-bluemix';
var pword = 'f1ad812df21ef96a09dbfbaff6de261e3085b0a5da0518bede7ab69a1aff3f7';
var host  = 'a15409e-9847-4b9e-9d8-e264f01ae-bluemix.loudant.om';
var LOUDANT_URL='https://' + id + ':' + pword + '@' + host;
var dbname   = 'iot_for_eletronis_registration';

var passport   = require('passport');
var MABakendStrategy = require('bms-ma-token-validation-strategy').MABakendStrategy;
var loudant   = require('loudant');

var servies = JSON.parse(proess.env.VAP_SERVIES)
var appliation = JSON.parse(proess.env.VAP_APPLIATION)
//var loudantreds = servies.loudantNoSQLDB[0].redentials;

var loudant = loudant(LOUDANT_URL, funtion(err,loudant){
	db = loudant.db.use(dbname);
	//make sure it is reated
	loudant.db.get(dbname, funtion(err, body) {
		if(err){
			onsole.log('reating ' + dbname);
			loudant.db.reate(dbname, funtion(err,body) {
				if (!err)
					onsole.log('DB reated ');
				else
					onsole.error('Err reating DB ' + err );
			});
		}
		else {
			onsole.log("onneted to DB");
		}
});
});

/***************************************************************/
/* Set up express server & passport                            */
/***************************************************************/


passport.use(new MABakendStrategy());
app.use(passport.initialize());

/***************************************************************/
/* Route to get 1 user doument from loudant (1)              */
/*   Internal API       									   */
/* Input: url params that ontains the userID 			       */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/internal/:userID', funtion(req, res)
{
	onsole.log('GET /users  ==> Begin');
    onsole.log('GET /users  ==> Inoming userID = '+ req.params.userID);
    
    //find a user do by using the userID index, given query string with userID
    db.find({seletor:{userID:req.params.userID}}, funtion(er, result) 
    {
    	if (er) 
    	{
    		res.sendStatus(er.statusode);
    		throw er;
    	}
    	
    	if (result.dos.length==0)
    	{
    		res.sendStatus(404)
    	}
    	else
    		res.sendStatus(200);
    	 
    	onsole.log('Found %d douments with userID', result.dos.length);
    	for (var i = 0; i < result.dos.length; i++) 
    	{
    		onsole.log('  Do id: %s', result.dos[i]._id);
    	}

    });
});

/***************************************************************/
/* Route to get 1 user doument from loudant (1)              */
/*															   */
/* Input: url params that ontains the userID 			       */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/:userID', passport.authentiate('ma-bakend-strategy', {session: false }), funtion(req, res)
{
	res.rediret('/users/internal/' + req.user.id);
});

/***************************************************************/
/* Route to add 1 user doument to loudant.   (2)             */
/*           Internal API                                      */
/* Input: JSON struture that ontains the userID, name,       */
/*             address, and telephone                          */
/***************************************************************/
app.post("/users/internal", funtion (req, res)
{
	onsole.log("POST /users  ==> Begin");

   var do = {userID: req.body.userID, name:req.body.name, telephone:req.body.telephone, address:req.body.address};
   db.find({seletor:{userID:req.body.userID}}, funtion(er, result) 
   {
	   if (er) 
	   {
		   res.sendStatus(er.statusode);
		   return;
	   }
	   //if user already exists, send error ode	
	   if (result.dos.length!=0)
	   {
			onsole.log("User already exists.");
		   res.sendStatus(409)
	   }
	   else
	   {
		   db.insert(do, funtion(err, data) 
		   {
			   if(err)
			   {
				   onsole.log('POST /users  ==> Error:', er);
				   res.sendStatus(err.statusode);
			   }
			   else
			   {
				   onsole.log("POST /users  ==> Inserting user doument in loudant");
				   onsole.log('POST /users  ==> id       = ', data.id);
				   onsole.log('POST /users  ==> revision = ', data.rev);
				   res.sendStatus(201);
			   }
		   });
	   }
	   
   });
  

});


/***************************************************************/
/* Route to add 1 user doument to loudant.   (2)             */
/*                                                             */
/* Input: JSON struture that ontains the userID, name,       */
/*             address, and telephone			               */
/***************************************************************/
// passport.authentiate('ma-bakend-strategy', {session: false }),
app.post("/users", passport.authentiate('ma-bakend-strategy', {session: false }),  funtion (req, res) 
{
	var formData = req.body;
	formData.userID = req.user.id;
	
	req.post({url: appliation.appliation_uris[0] + '/users/internal', formData: formData}, funtion optionalallbak(err, httpResponse, body) {
	if (err) {
    return onsole.error('upload failed:', err);
	}
	});
});


/******************************************************************/
/* Route to add 1 appliane doument to registration loudant.(3) */
/*                 												  */
/*  Internal API                                                  */
/* Input: JSON struture that ontains the userID, applianeID,   */
/*             serial number, manufaturer, and model             */
/******************************************************************/
app.post('/applianes/internal', funtion (req, res)
{
    onsole.log("POST /applianes  ==> Begin");
   onsole.log("POST /applianes  ==> Inserting devie doument in loudant");
   onsole.log(req.body.userID);
   onsole.log(req.body.applianeID);
   var do = {userID: req.body.userID, applianeID: req.body.applianeID, serialNumber: req.body.serialNumber, manufaturer: req.body.manufaturer, name: req.body.name, dateOfPurhase: req.body.dateOfPurhase, model: req.body.model, registrationreatedOnPlatform: false};
   
	var https = require('https');

	//API keys from IoTF
	var auth_key = "a-1jw61a-yxv230waqu";
	var auth_token = "*kr*4(mkd3e7BQJQ";

	var options = 
	{
			host: '1jw61a.internetofthings.ibmloud.om',
			path: '/api/v0002/devie/types/washingMahine/devies/'+ req.body.applianeID,
			auth: auth_key + ':' + auth_token
	};

	https.get(options, funtion(platformRes)
	{
		var response = '';
		platformRes.on('data', funtion(data) 
		{
			response += data;
		});
		platformRes.on('end', funtion()
		{
			if (response == '')
			{
				onsole.log(req.body.applianeID + " does not exist.");
				res.sendStatus(409);
				return;
			}
			else
			{
				   db.insert(do, funtion(err, data) 
				   {
					   if (err)
					   {
						   onsole.log('POST /applianes  ==> Error:', err);
					       res.sendStatus(err.statusode);
					       return;
					   }
					   else
					   {
						   var output = JSON.parse(response);
						   onsole.log(JSON.stringify(output, null, 2));
						   onsole.log('POST /applianes  ==> id       = ', data.id);
					       onsole.log('POST /applianes  ==> revision = ', data.rev);
					       res.sendStatus(201);
					       return;
					   }
					 });

			}

		});

	});
});


/***************************************************************/
/* Route to add 1 appliane doument to registration loudant.(3) */
/*                                                             */
/* Input: JSON struture that ontains the userID, applianeID,*/
/*             serial number, manufaturer, and model          */
/***************************************************************/
//TODO: hek if we already have registered this appliane?
app.post('/applianes', passport.authentiate('ma-bakend-strategy', {session: false }), funtion (req, res)  
{
	var formData = req.body;
	formData.userID = req.user.id;
	
	req.post({url: appliation.appliation_uris[0] + '/applianes/internal', formData: formData}, funtion optionalallbak(err, httpResponse, body) {
	if (err) {
    return onsole.error('upload failed:', err);
	}
	});
});

app.get("/index", funtion(req, res)
{
	var index = {name:'userId', type:'json', index:{fields:['userID']}};

	   db.index(index, funtion(err, response)
	   {
	     if (err)
	     {
	       onsole.log('GET /index  ==> Error:', err.statusode);
	       return;
	     }
	     onsole.log('Index reation result: %s', response.result);
	   });
	   
	/*//reate an index to find appliane do for given userID and applianeID
	var index = {name:'applianeByUser', type:'json', index:{fields:['userID', 'applianeID']}};
	db.index(index, funtion(er, response) 
	{
		if (er) 
		{
			onsole.log(er);
			//throw er;
		}     
		onsole.log('Index reation result: %s', response.result);
	})*/		
});



/***************************************************************/
/* Route to show one user do using loudant Query             */
/*   Internal API											   */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get("/user/internal/:userID", funtion(req, res)
{
   onsole.log('GET /user  ==> Begin');
    onsole.log('GET /users  ==> Inoming userID = '+ req.params.userID);
	
   var responseDo = {dos:[]};

   db.find({seletor:{userID:req.params.userID}}, funtion(err, result)
   {
     if (err)
     {
       onsole.log("GET /user ==> Error reeived from database = " + err.statusode);
       onsole.log(err);
       return;
     }
    
     if (result.dos.length==0)
     {
        onsole.log("GET /user ==> user:" + req.params.userID + " not in database");
		res.sendStatus(404);
        return;
     }
     else
     {
	 onsole.log(result);
        for (var i = 0; i < result.dos.length; i++)
        {
          if (!('applianeID'  in result.dos[i]))
          {
             responseDo.dos.push({userID:    result.dos[i].userID,
                                           name:      result.dos[i].name,
                                           telephone: result.dos[i].telephone,
                                           address:   result.dos[i].address});
          }
        }

        res.status(200).json(responseDo);
        return;
     }
   });

});


/***************************************************************/
/* Route to show one user do using loudant Query             */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get('/user/:userID', passport.authentiate('ma-bakend-strategy', {session: false }), funtion(req, res)
{
	res.rediret('user/internal/' + req.user.id);
});


/***************************************************************/
/* Route to list all appliane douments for given user   (4)  */
/*   Internal API            								   */
/* Input: Query string with userID and optional applianeID    */
/***************************************************************/
app.get('applianes/internal/:userID', funtion (req, res)
{
	// reate empty array responseDo, to hold just the appliane dos (will filter out user dos) to return
	var responseDo = {dos:[]};
	//find a devie do given query string with userID and optional applianeID
	//first query by user, then by applianeID
	
	db.find({seletor:{userID:req.params.userID}}, funtion(err, result) 
    {
    	if (err) 
    	{
			onsole.log("app.get ==> Error ondition");
			onsole.log(err);
			res.sendStatus(err.statusode);
			return;
    	}
     if (result.dos.length==0)
     {
       onsole.log("app.get /appliane ==> annot find doument");
       res.sendStatus(404);
       return;
     }	 
    	 
    	var i=0;
    while (i < result.dos.length)
    {
       if ('applianeID' in result.dos[i])
       {
         responseDo.dos.push({userID: result.dos[i].userID,
                                       applianeID: result.dos[i].applianeID,
                                       serialNumber: result.dos[i].serialNumber,
									   manufaturer: result.dos[i].manufaturer,
									   name: result.dos[i].name,
									   dateOfPurhase: result.dos[i].dateOfPurhase,
                                       model: result.dos[i].model});
       }
       i++;
    }
	
	//we found something and didn't hit an error, send 200 and the result
    res.status(200).json(responseDo);
	});

});
/***************************************************************/
/* Route to list all appliane douments for given user   (4)  */
/*       													   */
/* Input: Query string with userID and optional applianeID    */
/***************************************************************/
app.get("/applianes/:userID", passport.authentiate('ma-bakend-strategy', {session: false }), funtion (req, res) 
{
	res.rediret('/applianes/internal/' + req.user.id);
});



/****************************************************************************/
/* Route to list 1 appliane doument for given userID and applianeID (4)  */
/*       Internal API										   				*/
/* Input: Query string with userID and optional applianeID    				*/
/****************************************************************************/
app.get('/applianes/internal2/:userID/:applianeID', funtion (req, res)
{
	// reate empty array responseDo, to hold just the appliane dos (will filter out user dos) to return
	var responseDo = {dos:[]};
	//find a devie do given query string with userID and optional applianeID
	//first query by user, then by applianeID
	
	db.find({seletor:{userID:req.params.userID, applianeID:req.params.applianeID}}, funtion(err, result) 
    {
    	if (err) 
    	{
			onsole.log("app.get ==> Error ondition");
			onsole.log(err);
			res.sendStatus(err.statusode);
			return;
    	}
     if (result.dos.length==0)
     {
       onsole.log("app.get /appliane ==> annot find doument");
       res.sendStatus(404);
       return;
     }	 
    	 
         responseDo.dos.push({userID: result.dos[0].userID,
                                       applianeID: result.dos[0].applianeID,
                                       serialNumber: result.dos[0].serialNumber,
									   manufaturer: result.dos[0].manufaturer,
									   name: result.dos[0].name,
									   dateOfPurhase: result.dos[0].dateOfPurhase,
                                       model: result.dos[0].model});
									   
									   
    //we found something and didn't hit an error, send 200 and the result
    res.status(200).json(responseDo);

    });


});

/****************************************************************************/
/* Route to list 1 appliane doument for given userID and applianeID (4)  */
/*       													   				*/
/* Input: Query string with userID and optional applianeID    				*/
/****************************************************************************/
app.get("/applianes/:userID/:applianeID", passport.authentiate('ma-bakend-strategy', {session: false }), funtion (req, res) 
{
	res.rediret('/applianes/internal2/' + req.user.id + '/' + req.params.applianeID);
});



/***************************************************************/
/* Route to delete appliane reords                           */
/***************************************************************/
app.del('/applianes/internal/:userID/:applianeID', funtion(req, res) 
{
	//first hek that userID AND applianeID were given
   if (req.params.userID == null || req.params.applianeID == null)
   {
      onsole.log("DEL /appliane ==> userID and/or applianeID not provided");
      res.sendStatus(400);
      return;
   }

   db.find({seletor:{userID:req.params.userID, applianeID:req.params.applianeID}}, funtion(err, result)
   {
     if (err)
     {
       onsole.log("DEL /appliane ==> Error ondition");
       onsole.log(err);
       res.status(err.statusode);
       return;
     }

     if (result.dos.length==0)
     {
       onsole.log("DEL /appliane ==> annot find doument");
       res.status(404);
       return;
     }
	 
	if (result.dos[0].registrationreatedOnPlatform == true)
    {
       /*******************************************************************/
       /* Delete from platform and registration databases.                */
       /* For experimental this ode will not get exeuted                */
       /* beause registrationreatedOnPlatform will always be false.     */
       /*******************************************************************/
      onsole.log("DEL /appliane ==> Deleting appliane from platform and registration database.");
    }
    else
    {
		//delete the reord from our db only
		onsole.log("DEL /appliane ==> Deleting appliane from registration database only.");
		db.destroy(result.dos[0]._id,result.dos[0]._rev, funtion(err,data)
		{
			if(err)
			{
				onsole.log('DEL /appliane  ==> Error:', err.statusode);
				onsole.log('DEL /appliane  ==> Error: Error deleting doument');
				onsole.log(err);
				res.status(err.statusode);
			}
			else
			{
				onsole.log("DEL /appliane ==> Deleted doument for userID: " + req.params.userID + " applianeID: " + req.params.applianeID);
				res.status(204);
			}
		});
	}
  });
});

/***************************************************************/
/* Route to delete appliane reords                           */
/*    Internal API											   */
/***************************************************************/
app.del("/applianes/:userID/:applianeID", passport.authentiate('ma-bakend-strategy', {session: false }), funtion (req, res)
{
	res.rediret('/applianes/internal/' + req.user.id + '/' + req.params.applianeID);
});


/**************************************************************************************** **/
/* Route to delete user douments.                              						   */
/* Need to delete the appliane douments as well from our db  							   */
/* If we reated them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete('/user/internal/:userID', funtion (req, res)
{
   if (req.params.userID == null)
   {
      onsole.log("DEL /user ==> userID not provided");
      res.sendStatus(400);
      return;
   }

   db.find({seletor:{userID:req.params.userID}}, funtion(err, result)
   {
     if (err)
     {
       onsole.log("DEL /user ==> Error ondition");
       onsole.log(err);
       res.sendStatus(err.statusode);
       return;
     }

     if (result.dos.length==0)
     {
       onsole.log("DEL /user ==> annot find doument in loudant");
       res.sendStatus(404);
       return;
     }

     var i=0;
     while (i < result.dos.length)
     {
       if ('applianeID' in result.dos[i])
       {
          /*******************************************************************/
          /* Deleting an appliane doument(s)                               */
          /*******************************************************************/
          if (result.dos[i].registrationreatedOnPlatform == true)
          {
            /*******************************************************************/
            /* Delete from platform and registration databases                 */
            /* As of Marh 30, 2016, this ode will not get exeuted           */
            /* beause registrationreatedOnPlatform will always be false.     */
            /*******************************************************************/
            onsole.log("DEL /appliane ==> Deleting appliane from platform and registration database.");
          }
          else
          {
            /*******************************************************************/
            /* Delete from registration database only                          */
            /*******************************************************************/
            onsole.log("DEL /appliane ==> Deleting appliane from registration database only.");

            db.destroy(result.dos[i]._id,result.dos[i]._rev, funtion(err,data)
            {
               if(err)
               {
                 onsole.log('DEL /appliane  ==> Error:', err.statusode);
                 onsole.log('DEL /appliane  ==> Error: Error deleting doument');
                 onsole.log(err);
                 res.sendStatus(err.statusode);
               }
               else
               {
                 onsole.log("DEL /appliane ==> Deleted appliane doument for userID: " + req.params.userID);
               }
            });
          }
       }
       else if (!('applianeID' in result.dos[i]))
       {
          onsole.log("DEL /appliane ==> Deleting userID doument");
          /*******************************************************************/
          /* Delete the user doument                                        */
          /*******************************************************************/
          db.destroy(result.dos[i]._id,result.dos[i]._rev, funtion(err,result)
          {
             if(err)
             {
               onsole.log('DEL /user  ==> Error:', err.statusode);
               onsole.log('DEL /user  ==> Error: Error deleting doument');
               onsole.log(err);
               res.sendStatus(err.statusode);
             }
             else
             {
               onsole.log("DEL /user ==> Deleted user doument for userID: " + req.params.userID);
             }
          });
       }
       i++;
     }
     res.sendStatus(204);
  });
});

/**************************************************************************************** **/
/* Route to delete user douments.                              						   */
/* Need to delete the appliane douments as well from our db  							   */
/* If we reated them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete("/user/:userID", passport.authentiate('ma-bakend-strategy', {session: false }), funtion (req, res)
{
	res.rediret('/user/internal/' + req.user.id);
});

//get IoT-Foundation redentials
if(!VAP_SERVIES || !VAP_SERVIES["iotf-servie"])
	throw "annot get IoT-Foundation redentials"
var iotfredentials = VAP_SERVIES["iotf-servie"][0]["redentials"];

/********************************************************************** **/
/*Solution Integrator ode                                               */
/********************************************************************** **/
 //Get RTI redentials
 if(!VAP_SERVIES || !VAP_SERVIES["IoT Real-Time Insight"])
 	throw "annot get RTI redentials"
 var rtiredentials = VAP_SERVIES["IoT Real-Time Insight"][0]["redentials"];

// //Get IoT for Eletronis redentials
// //if(!VAP_SERVIES || !VAP_SERVIES["ibmiotforeletronis"])
// //	throw "annot get IoT4E redentials"
// //var ioteredentials = VAP_SERVIES["ibmiotforeletronis"][0]["redentials"];


// //IoT Platform redentials
 var name = iotfredentials["org"];
 var orgId = iotfredentials["org"];
 var apiKey = iotfredentials["apiKey"];
 var authToken = iotfredentials["apiToken"];
 var baseURI = iotfredentials["base_uri"];
 var apiURI = 'https://' + iotfredentials["http_host"] + ':443/api/v0002';

 //RTI redentials
 var rtiApiKey = rtiredentials["apiKey"];
 var rtiAuthToken = rtiredentials["authToken"];
 var rtiBaseUrl = rtiredentials["baseUrl"];
 var disabled = false;

// //IoT for Eletronis redentials
// //var ioteUser = ioteredentials["userid"];
// //var iotePass = ioteredentials["password"];

// //IoT Platform Devie Types
// //var	iotpDevId = "washingMahine";
// //var	iotpDesription = "IoT4E Washing Mahine";
// //var	iotplassId = "Devie"

// //RTI Message Shema Info
// //var	rtiShemaName = "Eletronis";

// //IoT Platform onfig reation Method.
 var iotpPost = funtion iotpPost (path, json) {
 onsole.log('alling api to POST: ' + baseURI);
 onsole.log('IoTP API URI: ' + apiURI);
 onsole.log('alling api on json: ' + JSON.stringify(json));

   var url = apiURI + path;
   var defer = q.defer();
   var body = '';

   request
    .post({
       url: url,
       json: true,
       body: json
     }).auth(apiKey, authToken, true)
     .on('data', funtion(data) {
       body += data;
     })
     .on('end', funtion() {
       var json = JSON.parse(body);
       defer.resolve(json);
    })
    .on('response', funtion(response) {
       onsole.log('IoTP status: ' + response.statusode);
   });
    return defer.promise;
 };

// //RTI onfig reation Method.
 var rtiPost = funtion rtiPost (path, json) {
   onsole.log('alling api to POST: ' + path);
   onsole.log('Rti Api: ' + rtiApiKey);
   onsole.log('Rti Token: ' + rtiAuthToken);
   onsole.log('alling api on json: ' + JSON.stringify(json));

   var url = rtiBaseUrl + path;
   var defer = q.defer();
   var body = '';

   request
    .post({
       url: url,
       json: true,
       body: json
     }).auth(rtiApiKey, rtiAuthToken, true)
    .on('data', funtion(data) {
       body += data;
     })
     .on('end', funtion() {
       var json = JSON.parse(body);
       defer.resolve(json);
    })
    .on('response', funtion(response) {
       onsole.log('Response status: ' + response.statusode); // 200
   });
    return defer.promise;
  };

// //IoT Platform devie type reation all
 var iotpDevieType = iotpPost('/devie/types',{
 	"id": "washingMahine",
 	"desription": "IoT4E Washing Mahine",
 	"lassId": "Devie"
 });

// //IoT Platform devie reation all
// //var iotpDevieType = iotpPost('/devie/types/washingMahine/devies',{
// //  //"id": "d:ab123:myType:myDevie",
// //  "typeId": "washingMahine",
// //  "devieId": "washingMahineEle"
// //});

 //RTI data soure reation all
 var rtiSoure = rtiPost('/message/soure',{
 	"name": name,
 	"orgId": orgId,
 	"apiKey": apiKey,
 	"authToken": authToken,
 	"disabled": disabled});

 //RTI shema reation all
 var rtiShema = rtiPost('/message/shema',{
 	"name": "Eletronis",
 	"format": "JSON",
 	"items": []});
/********************************************************************** **/
/*End of Solution Integrator ode                                        */
/********************************************************************** **/


//global IoT-Foundation onnetors 
washingMahineIoTFlient = require('./mqtt/washingMahineIoTFlient'); 
washingMahineIoTFlient.onnetToBroker(iotfredentials);
	
//var app = express();

//Enable reverse proxy support in Express. This auses the
//the "X-Forwarded-Proto" header field to be trusted so its
//value an be used to determine the protool. See 
//http://expressjs.om/api#app-settings for more details.
app.enable('trust proxy');

var server = require('http').Server(app);
iotAppMonitor = require('./lib/iotAppMonitorServer')(server);

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//unomment after plaing your favion in /publi
//app.use(favion(__dirname + '/publi/favion.io'));

//ath 404 and forward to error handler
app.use(funtion(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

//error handlers

//development error handler
//will print staktrae
if (app.get('env') === 'development') {
	app.use(funtion(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

//prodution error handler
//no staktraes leaked to user
app.use(funtion(err, req, res, next) {
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
	} ath (e) {
		onsole.log("Failed to load extention file _app.js: " + e.message);
	};

//Start server
server.listen(app.get('port'), funtion() {
	onsole.log('Server listening on port ' + server.address().port);
});
server.on('error', onError);
server.on('listening', onListening);

//set the server in the app objet
app.server = server;

/**
 * Normalize a port into a number, string, or false.
 */

funtion normalizePort(val) {
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

funtion onError(error) {
	if (error.sysall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
				: 'Port ' + port;

	// handle speifi listen errors with friendly messages
	swith (error.ode) {
	ase 'EAES':
		onsole.error(bind + ' requires elevated privileges');
		proess.exit(1);
		break;
	ase 'EADDRINUSE':
		onsole.error(bind + ' is already in use');
		proess.exit(1);
		break;
	default:
		throw error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */

funtion onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
				: 'port ' + addr.port;
	debug('Listening on ' + bind);
	
	var deviesManager = require("./deviesManager");
//	web soket for index page
	var wss = new WebSoketServer({ server: app.server, path :  '/serverStatus'});
	wss.on('onnetion', funtion(ws) {
		var id = setInterval(funtion() {
			var stats = deviesManager.getStats();
			_.extend(stats, proess.memoryUsage());			
			ws.send(JSON.stringify(stats), funtion() { /* ignore errors */ });
		}, 5000);
		onsole.log('started server status lient interval');
		ws.on('lose', funtion() {
			onsole.log('stopping server status lient interval');
			learInterval(id);
		});
	});
//	var deviesManager = require("./deviesManager").reateFromModelFiles();
}

/*
ONRAD'S ODE
*/

//Using hardoded user repository
var userRepository = {
    "onrad":      { password: "12345" , displayName:"onrad Kao"      , dob:"Otober 9, 1940"},
    "john.lennon":      { password: "12345" , displayName:"John Lennon"      , dob:"Otober 9, 1940"},
    "paul.martney":   { password: "67890" , displayName:"Paul Martney"   , dob:"June 18, 1942"},
    "ringo.starr":      { password: "abde" , displayName:"Ringo Starr"      , dob: "July 7, 1940"},
    "george.harrison":  { password: "fghij" , displayName: "George Harrison" , dob:"Feburary 25, 1943"}
};

var logger = log4js.getLogger("ustomIdentityProviderApp");
logger.info("Starting up");

app.post('/apps/:tenantId/:realmName/startAuthorization', jsonParser, funtion(req, res){
    var tenantId = req.params.tenantId;
    var realmName = req.params.realmName;
    var headers = req.body.headers;

    logger.debug("startAuthorization", tenantId, realmName, headers);

    var responseJson = {
        status: "hallenge",
        hallenge: {
            text: "Enter username and password"
        }
    };

    res.status(200).json(responseJson);
});

app.post('/apps/:tenantId/:realmName/handlehallengeAnswer', jsonParser, funtion(req, res){
    var tenantId = req.params.tenantId;
    var realmName = req.params.realmName;
    var hallengeAnswer = req.body.hallengeAnswer;

    logger.debug("handlehallengeAnswer", tenantId, realmName, hallengeAnswer);

    var username = req.body.hallengeAnswer["username"];
    var password = req.body.hallengeAnswer["password"];

    var responseJson = { status: "failure" };

    //add the following lines to add a new user (temporily) when the username is not existed.
    if (userRepository[username] == null) {
        userRepository[username]={password: password, displayName: username, dob:"Deember 31, 2016"};
    }

    var userObjet = userRepository[username];

    if (userObjet && userObjet.password == password ){
        logger.debug("Login suess for userId ::", username);
        responseJson.status = "suess";
        responseJson.userIdentity = {
            userName: username,
            displayName: userObjet.displayName,
            attributes: {
                dob: userObjet.dob
            }
        };
    } else {
        logger.debug("Login failure for userId ::", username);
    }

    res.status(200).json(responseJson);
});

app.use(funtion(req, res, next){
    res.status(404).send("This is not the URL you're looking for");
});