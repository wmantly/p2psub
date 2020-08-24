const {PubSub} = require('./pubsub');
const {P2P} = require('./p2p');


class P2PSub{
	constructor(...args){
		this.p2p = new P2P(...args);

		this.pubsub = new PubSub();

		this.pubsub.subscribe(/.*/gi, function(data, topic){
			if(data.__local) return false;
			this.p2p.broadcast({
				type:'topic',
				body:{
					topic: topic,
					data: data
				}
			});
		});

		this.p2p.onData(function(data){
			data.__local = true;
			if(data.type === 'topic') this.pubsub.publish(data.body.topic, data.body.data, true);
		});
	}

	subscribe(){
		return this.subscribe.apply(this.pubsub, arguments);
	}

	publish(){
		return this.publish.apply(this.pubsub, arguments);
	}

	broadcast(){
		return this.broadcast.apply(this.p2p, arguments);
	}

	onData(){
		return this.onData.apply(this.p2p, arguments);
	}

	addPeer(){
		return this.addPeer.apply(this.p2p, arguments);
	}

	removePeer(){
		return this.removePeer.apply(this.p2p, arguments);
	}
}

module.exports = {P2PSub, P2P, PubSub};
