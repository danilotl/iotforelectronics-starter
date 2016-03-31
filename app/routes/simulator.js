var express = require('express');
var simulatorRouter = express.Router();

simulatorRouter.get('/startSimulator', function(req, res) {
	simulationClient.startSimulation();
});

simulatorRouter.get('/stopSimulator', function(req, res) {
	simulationClient.terminateSimulation();
});

simulatorRouter.get('/restartSimulator', function(req, res) {
	simulationClient.restartSimulation();
});

module.exports = simulatorRouter;