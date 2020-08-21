#!/usr/bin/env nodejs
const app = {};
module.exports = app;

const {P2P} = require('./p2p')


const args = process.argv.slice(1);

const exec_name = args[0].split('/').pop();
const server_port = args[1];
const clients_list = args.slice(2);

if(server_port){
	console.log('port:', server_port, 'clients:', clients_list)

}else{
	console.error('Please supply the server port and list of clients to connect too;')
	console.error(`${exec_name} <server port> <client 1> <client 2> <client 3> ...` )
	console.error(`${exec_name} 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575` )
	process.exit(0)
}


app.p2p = new P2P({
	listenPort: server_port,
	peers: clients_list
})

app.pubsub = require('./pubsub')