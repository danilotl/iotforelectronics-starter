
// 
// Monitor for http and mqtt messages using WebSocket library 'socket.io'
//  

module.exports = function (server) {
	
	var io = require('socket.io')(server);
	
	io.set('transports', ['websocket']);

	io.use(function(socket, next){
		url = socket.request.url;
		
		if(url.indexOf('/socket.io/?EIO=') == -1){
			socket.error('Bad Request');
  			socket.disconnect(true);
  			next(new Error('Bad Request'));
		} else {
			next();
		}
	});

	io.on('connection', function(socket){
		
	});
	
	return {
		sendToClient: function(protocol, id, msg){
			io.sockets.emit('iotwb-' + protocol, { id: id, message: msg });
		}
	}
} 