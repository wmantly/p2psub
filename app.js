#!/usr/bin/env node

const {PubSub} = require('./pubsub');
const {P2P} = require('./p2p');

const ps = new PubSub();

class P2PSub{
	constructor(...args){
		let options = args[0] || {};
		let p2p = this.p2p = new P2P(options);

		let pubsub = this.pubsub = new PubSub();

		let preBroadcast = this.preBroadcast = options.preBroadcast || function(data){return data};

		// Locally published messages are broadcast to the mesh. The `__local`
		// flag is set on messages that arrive from the network (see onData
		// below) so they are not re-broadcast and loop.
		this.pubsub.subscribe(/.*/gi, function(data, topic, from){
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

		// Messages arriving from the network are republished locally. The
		// origin peer id (`data.from`) is forwarded as the `from` argument so
		// subscribers can attribute or filter messages by peer.
		this.p2p.onData(function(data){
			data.body.data.__local = true;
			if(data.type === 'topic') pubsub.publish(data.body.topic, data.body.data, data.from);
		});
	}

	subscribe(){
		return this.pubsub.subscribe.apply(this.pubsub, arguments);
	}

	publish(topic, data, from){
		// Locally originated messages are attributed to this peer unless the
		// caller passes an explicit `from`.
		if(from === undefined) from = this.p2p.peerID;
		return this.pubsub.publish(topic, data, from);
	}

	addPeer(){
		return this.p2p.addPeer.apply(this.p2p, arguments);
	}

	removePeer(){
		return this.p2p.removePeer.apply(this.p2p, arguments);
	}

	// Tear down the underlying P2P layer (reconnection timer, server, sockets).
	destroy(){
		return this.p2p.destroy();
	}
}

module.exports = {P2PSub, P2P, PubSub, ps};


if (require.main === module) {
    const args = process.argv.slice(1);

	const exec_name = args[0].split('/').pop();
	const listenPort = args[1];
	const peers = args.slice(2);

	if(!listenPort || listenPort === "help"){
		console.error('Please supply the server port and list of clients to connect too;')
		console.error(`${exec_name} <server port> <client 1> <client 2> <client 3> ...` )
		console.error(`${exec_name} 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575` )
		process.exit(listenPort === "help" ? 0 : 1)
	}

	// console.log('port:', server_port, 'clients:', clients_list)

	let instance = new P2P({
		listenPort,
		peers,
		logLevel: ['info']
	});
}
