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
var VCAP_SERVICES = {};
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

//IoT Platform Credentials
var name = iotfCredentials["org"];
var orgId = iotfCredentials["org"];
var apiKey = iotfCredentials["apiKey"];
var authToken = iotfCredentials["apiToken"];
var baseURI = iotfCredentials["base_uri"];
var apiURI = 'https://' + iotfCredentials["http_host"] + ':443/api/v0002';

//RTI Credentials
var rtiApiKey = rtiCredentials["apiKey"];
var rtiAuthToken = rtiCredentials["authToken"];
var rtiBaseUrl = rtiCredentials["baseUrl"];
var disabled = false;

//IoT for Electronics Credentials
//var ioteUser = ioteCredentials["userid"];
//var iotePass = ioteCredentials["password"];

//IoT Platform Device Types
//var	iotpDevId = "washingMachine";
//var	iotpDescription = "IoT4E Washing Machine";
//var	iotpClassId = "Device"

//RTI Message Schema Info
//var	rtiSchemaName = "Electronics";

//IoT Platform Config Creation Method.
var iotpPost = function iotpPost (path, json) {
  //console.log('calling api to POST: ' + baseURI);
  //console.log('calling api on json: ' + JSON.stringify(json));

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

//RTI Config Creation Method.
var rtiPost = function rtiPost (path, json) {
  //console.log('calling api to POST: ' + path);
  //console.log('Rti Api: ' + rtiApiKey);
  //console.log('Rti Token: ' + rtiAuthToken);
  //console.log('calling api on json: ' + JSON.stringify(json));

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
      console.log('Response status: ' + response.statusCode); // 200
  });
   return defer.promise;
};

//IoT Platform device type creation call
var iotpDeviceType = iotpPost('/device/types',{
	"id": "washingMachine",
	"description": "IoT4E Washing Machine",
	"classId": "Device"
});

//IoT Platform device creation call
//var iotpDeviceType = iotpPost('/device/types/washingMachine/devices',{
//  //"id": "d:abc123:myType:myDevice",
//  "typeId": "washingMachine",
//  "deviceId": "washingMachineElec"
//});

//RTI data source creation call
var rtiSource = rtiPost('/message/source',{
	"name": name,
	"orgId": orgId,
	"apiKey": apiKey,
	"authToken": authToken,
	"disabled": disabled});

//RTI schema creation call
var rtiSchema = rtiPost('/message/schema',{
	"name": "Electronics",
	"format": "JSON",
	"items": []});

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port, function(){
	console.log('Listening on port:', port);
});