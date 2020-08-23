#!/usr/bin/env nodejs
const app = {};
const pubsub = new (require('./pubsub')).PubSub();
module.exports = app;

const {P2P} = require('./p2p')


const args = process.argv.slice(1);

const exec_name = args[0].split('/').pop();
const server_port = args[1];
const clients_list = args.slice(2);

if(server_port === "help"){
	console.error('Please supply the server port and list of clients to connect too;')
	console.error(`${exec_name} <server port> <client 1> <client 2> <client 3> ...` )
	console.error(`${exec_name} 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575` )
	process.exit(0)
}

console.log('port:', server_port, 'clients:', clients_list)

app.p2p = new P2P({
	listenPort: server_port,
	peers: clients_list
})

app.pub = pubsub.pub;
app.sub = pubsub.sub;


app.sub(/.*/gi, function(data, topic){
	if(data.__local) return false;
	data.__local = true;
	app.p2p.broadcast({
		type:'topic',
		body:{
			topic: topic,
			data: data
		}
	});
});

app.p2p.onData(function(data){
	if(data.type === 'topic') app.publish(data.body.topic, data.body.data, true);
});