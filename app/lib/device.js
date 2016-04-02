var qr = require('qr-image');
//var cfenv = require('cfenv');

var device = module.exports;

/* ************** ************** **************
 * ************** UTIL FUNCTIONS **************
 * ************** ************** **************/

var setAttributeIsValid = function(deviceID, attribute, value, data){
	var status = data.attributes.status;
	
	if(!(attribute in data["attributes"])){
		return false;
	}
	
	if(attribute == "doorOpen"){
		switch(value){
		case "true":
			if(status !== "Working"){
				if(status == "Ready")
					simulationClient.setAttributeValue(deviceID, "status", "Not Ready");
			} else {
				return false;
			}
		case "false":
			if(status !== "Working"){
				if(status == "Not Ready")
					simulationClient.setAttributeValue(deviceID, "status", "Ready");
			} else {
				return false;
			}
		}
	}
	
	if(attribute == "program" && status == "Working"){
		return false;
	}
	
	if(attribute == "currentCycle" && status == "Working"){
		return false;
	}

	return true;
	
}

device.getQrCode = function(req, res){
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		var deviceID = req.params.deviceID;
		var serialNumber = data['attributes']['serialNumber'];
		var deviceMake = data['attributes']['make'];
		var deviceModel = data['attributes']['model'];
		
		var text = ['2', deviceID, serialNumber, deviceMake, deviceModel].join(',');
		
		var img = qr.image(text, { type: 'png', ec_level: 'H', size: 2, margin: 0 });
		res.writeHead(200, {'Content-Type': 'image/png'})
		img.pipe(res);
	});
}

device.QRcreds = function(req, res){
//	var VCAP_SERVICES = {};
//	if(process.env.VCAP_SERVICES)
//		VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
//	
//	var appEnv = cfenv.getAppEnv();
//	var org = VCAP_SERVICES['iotf-service'][0]['credentials'].org;
//	var route = appEnv.url;
//	var guid = VCAP_SERVICES['AdvancedMobileAccess'][0]['credentials'].clientId;
//	var key = VCAP_SERVICES['iotf-service'][0]['credentials'].apiKey;
//	var token = VCAP_SERVICES['iotf-service'][0]['credentials'].apiToken;
	
	var text = '1,rbncl3,https://test-vcap.stage1.mybluemix.net,83625e1b-4cb2-491f-aed0-da2551cceb1d,a-rbncl3-2mcy2brgdl,oWUZwHelISfJubaO8-'; //['1', org, route, guid, key, token].join(',');
	
	var img = qr.image(text, { type: 'png', ec_level: 'H', size: 3, margin: 0 });
	res.writeHead(200, {'Content-Type': 'image/png'})
	img.pipe(res);
}

device.getAllDevicesStatus = function(req, res){
	simulationClient.getAllDevicesStatus().then(function(data){
		res.json(data);
	});
}

device.getStatus = function(req, res) {
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		res.json(data);
	});
}

device.getAttribute = function(req, res){
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		if(data["attributes"][req.params.attributeName]){
			
			var key = req.params.attributeName;
			var val = data["attributes"][key];
			
			var obj = {};
			obj["deviceID"] = req.params.deviceID;
			obj["attribute"] = {};
			obj["attribute"][key] = val;
			
			res.json(obj);
			
		} else {
			res.status(400).send("Invalid attribute.");
		}
	});
}

device.setAttribute = function(req, res){
	
	var deviceID       = req.params.deviceID;
	var attributeName  = req.params.attributeName;
	var attributeValue = req.body.value;
	
	simulationClient.getDeviceStatus(deviceID).then(function(data){
		if(setAttributeIsValid(deviceID, attributeName, attributeValue, data)){
			simulationClient.setAttributeValue(deviceID, attributeName, attributeValue);
			simulationClient.getDeviceStatus(deviceID).then(function(data){
				res.json(data);
			});
		} else {
			res.status(400).send("Invalid attribute name / value.");
		}
	});
}

device.setAttributes = function(req, res){
	var deviceID  = req.params.deviceID;
	var json      = req.body;
	
	simulationClient.getDeviceStatus(deviceID).then(function(data){
		for(var key in json){
			var attributeName  = key;
			var attributeValue = json[key];
			
			if(setAttributeIsValid(deviceID, attributeName, attributeValue, data)){
				simulationClient.setAttributeValue(deviceID, attributeName, attributeValue);
			}
		}
	});
	
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		res.json(data);
	});
}

device.getAttributes = function(req, res){
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		
		var obj = {};
		obj["deviceID"] = req.params.deviceID;
		obj["attributes"] = {};
		obj["attributes"] = data["attributes"];
		
		res.json(obj);
	});
}

device.reset = function(req, res){
	simulationClient.restartSimulation();
	res.json("Simulation client is restarting.");
}

device.create = function(req, res){
	var numberOfDevices = parseInt(req.params.numberOfDevices);
	if(!isNaN(numberOfDevices)){
		
		var configs = [];
		var devices;
		
		for(var i = 0; i < numberOfDevices; i++){
			configs.push({connected: true});
		}
		
		simulationClient.createDevices("washingMachine", numberOfDevices, configs).then(function(data){			
			simulationClient.saveSimulationConfig("./simulationConfig.json");
			res.json(data);
		});
	} else {
		res.status(400);
		res.json("Invalid number of devices was provided. Please check and try again.");
	}
	
}

device.del = function(req, res){
	simulationClient.unregisterDevice(req.params.deviceID);
	res.json("The device was deleted.");
}

device.renderUI = function(req, res){
	
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		return res.render('device', {
			title:          'Watson IoT for Electronics',
			deviceId:          data.deviceID,
			deviceStatus:      data.attributes.status,
			deviceProgram:     data.attributes.program,
			deviceCurCycle:    data.attributes.currentCycle,
			deviceFailureType: data.attributes.failureType,
			vibration:         data.attributes.vibration,
			waterPressure:     data.attributes.waterPressure,
			serialNumber:      data.attributes.serialNumber,
			make:              data.attributes.make,
			model:             data.attributes.model
		});
	});
}