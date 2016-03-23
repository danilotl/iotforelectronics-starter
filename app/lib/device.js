var qr = require('qr-image');

var device = module.exports;

/* ************** ************** **************
 * ************** UTIL FUNCTIONS **************
 * ************** ************** **************/

var generateSerialNumber = function(){
	var serialNumber = String(Math.floor(Math.random()*900) + 100);
	serialNumber = serialNumber.concat(new Date().getTime());
	serialNumber = [serialNumber.slice(0, 4), '-', serialNumber.slice(4, 8), '-', serialNumber.slice(8, 12), '-', serialNumber.slice(12)].join('');
	return serialNumber;
}

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
	var data = {};
	data.ID = req.params.deviceID;
	data.SN = generateSerialNumber();
	
	var img = qr.image(JSON.stringify(data), { type: 'png', ec_level: 'H', size: 8, margin: 0 });
	res.writeHead(200, {'Content-Type': 'image/png'});
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
		
		simulationClient.terminateSimulation();
		
		var configs = [];
		for(var i = 0; i < numberOfDevices; i++){
			configs.push({connected: true});
		}
		
		simulationClient.createDevices("washingMachine", numberOfDevices, configs).then(function(data){
			
			for(var i = 0; i < data.length; i++){
				var obj = data[i];
				simulationClient.connectDevice(obj["deviceID"]);
			}
			simulationClient.saveSimulationConfig("./simulationConfig.json");
			simulationClient.restartSimulation();

			res.json(data);
		});
	} else {
		res.status(400);
		res.json("Invalid number of devices was provided. Please check and try again.");
	}
	
}

device.renderUI = function(req, res){
	simulationClient.getDeviceStatus(req.params.deviceID).then(function(data){
		return res.render('device', {
			title:          'Watson IoT for Electronics',
			deviceId:          data.deviceID,
			deviceStatus:      data.attributes.status,
			deviceDoorOpen:    data.attributes.doorOpen,
			deviceProgram:     data.attributes.program,
			deviceCurCycle:    data.attributes.currentCycle,
			deviceFailureType: data.attributes.failureType
		});
	});
}