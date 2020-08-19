const net = require('net');

var connect = function(address, port){
	if(!port){
		let parse = address.split(':');
		address = parse[0];
		port = parse[1];
	}

	let socket = new net.Socket().connect(port, address);

	// socket.on('connect', function(){
	// 	console.log('client EVENT connect:', arguments);
	// });

	// socket.on('close', function(){
	// 	console.log('client EVENT close:', arguments);
	// });

	// socket.on('ready', function(){
	// 	console.log('client EVENT ready:', arguments);
	// });

	// socket.on('data', function(data){
	// 	console.log('client EVENT data:',data.toString(), socket.remoteAddress);
	// });


	socket.on('error', function(){
		console.log('client EVENT error:', arguments);
	});


	return socket;

}

module.exports = {connect}
