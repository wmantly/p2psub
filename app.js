#!/usr/bin/env nodejs

const p2p = require('./peers')

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

p2p.listen(server_port);

for(let client of clients_list){
	p2p.addPeer(client);
}


setTimeout(function(){
	p2p.broadcast({type:'topic', body:"yolo"})
}, 10000);