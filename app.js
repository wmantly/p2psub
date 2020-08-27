#!/usr/bin/env nodejs

const {PubSub} = require('./pubsub');
const {P2P} = require('./p2p');


class P2PSub{
	constructor(...args){
		let p2p = this.p2p = new P2P(...args);

		let pubsub = this.pubsub = new PubSub();

		let preBroadcast = this.preBroadcast = args[0].preBroadcast || function(data){return data};

		this.pubsub.subscribe(/.*/gi, function(data, topic){
			if(data.__local) return false;
			let body = preBroadcast(data, topic);
			
			if(body) p2p.broadcast({
				type:'topic',
				body:{
					topic: topic,
					data: body
				}
			});
		});

		this.p2p.onData(function(data){
			data.body.data.__local = true;
			if(data.type === 'topic') pubsub.publish(data.body.topic, data.body.data);
		});
	}

	subscribe(){
		return this.pubsub.subscribe.apply(this.pubsub, arguments);
	}

	publish(){
		return this.pubsub.publish.apply(this.pubsub, arguments);
	}

	addPeer(){
		return this.p2p.addPeer.apply(this.p2p, arguments);
	}

	removePeer(){
		return this.p2p.removePeer.apply(this.p2p, arguments);
	}
}

module.exports = {P2PSub, P2P, PubSub};


if (require.main === process.mainModule) {
    const args = process.argv.slice(1);

	const exec_name = args[0].split('/').pop();
	const listenPort = args[1];
	const peers = args.slice(2);

	if(listenPort === "help"){
		console.error('Please supply the server port and list of clients to connect too;')
		console.error(`${exec_name} <server port> <client 1> <client 2> <client 3> ...` )
		console.error(`${exec_name} 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575` )
		process.exit(0)
	}

	// console.log('port:', server_port, 'clients:', clients_list)

	let instance = new P2P({
		listenPort,
		peers,
		logLevel: ['info']
	});
}
