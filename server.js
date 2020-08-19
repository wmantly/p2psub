const net = require('net')

const server = function(port){

	let serverSocket = new net.Server(function (clientSocket) {

		console.info(`server ${port}`)

		// clientSocket.on('connection', function(){
		// 	console.log('server-client EVENT connection:', arguments);
		// });

		// clientSocket.on('listening', function(){
		// 	console.log('server-client EVENT listening:', arguments);
		// });

		clientSocket.on('error', function(){
			console.log('server-client EVENT error:', arguments);
		});

		// clientSocket.on('data', function (data) {
		//     console.log('server-client EVENT data',  data.toString(), clientSocket.remoteAddress);
		// });

	})
	serverSocket.listen(Number(port));

	// serverSocket.on('connection', function(clientSocket){
	// 	console.log('server EVENT connection:', clientSocket.remoteAddress);
	// });

	// serverSocket.on('listening', function(){
	// 	console.log('server EVENT listening:', arguments);
	// });

	serverSocket.on('error', function(){
		console.log('server EVENT error:', arguments);
	});

	// serverSocket.on('data', function (data) {
	// 	console.info('here...')
	//     // console.log(arguments, serverSocket);
	// });


 	return serverSocket;

}


module.exports = server;