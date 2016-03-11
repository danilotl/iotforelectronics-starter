/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express      = require('express'),
	q            = require('q'),
	request      = require('request'),
	path         = require('path'),
	cfenv        = require('cfenv'),
	app          = express(),
	appEnv       = cfenv.getAppEnv();


// Application settings
require('./config/express')(app);

app.get('/', function(req, res) {
  res.render('index');
});

//VCAP_SERVICES contains all the credentials of services bound to
//this application. For details of its content, please refer to
//the document or sample of each service.
VCAP_SERVICES = {};
if(process.env.VCAP_SERVICES)
	VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);

//Get IoT-Platform credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["iotf-service"])
	throw "Cannot get IoT-Foundation credentials"
var iotfCredentials = VCAP_SERVICES["iotf-service"][0]["credentials"];

//Get RTI credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["IoT Real-Time Insight"])
	throw "Cannot get RTI credentials"
var rtiCredentials = VCAP_SERVICES["IoT Real-Time Insight"][0]["credentials"];

//Get IoT for Electronics credentials
//if(!VCAP_SERVICES || !VCAP_SERVICES["ibmiotforelectronics"])
//	throw "Cannot get IoT4E credentials"
//var ioteCredentials = VCAP_SERVICES["ibmiotforelectronics"][0]["credentials"];

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port, function(){
	console.log('Listening on port:', port);
});