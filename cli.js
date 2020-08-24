#!/usr/bin/env nodejs


const {P2PSub} = require('./app');

const args = process.argv.slice(1);

const exec_name = args[0].split('/').pop();
const listenPort = args[1];
const peers = args.slice(2);

if(P2PSub === "help"){
	console.error('Please supply the server port and list of clients to connect too;')
	console.error(`${exec_name} <server port> <client 1> <client 2> <client 3> ...` )
	console.error(`${exec_name} 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575` )
	process.exit(0)
}

// console.log('port:', server_port, 'clients:', clients_list)

let instance = new P2PSub({
	listenPort,
	peers,
	logLevel: ['info']
});