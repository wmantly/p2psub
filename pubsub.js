class PubSub{
	constructor(){
		this.topics = {};
	}

	subscribe(topic, listener) {
		if(topic instanceof RegExp){
			listener.match = topic;
			topic = "__REGEX__";
		}

		// create the topic if not yet created
		if(!this.topics[topic]) this.topics[topic] = [];

		// add the listener
		this.topics[topic].push(listener);

		// return an unsubscribe handle
		let self = this;
		return function unsubscribe(){
			let arr = self.topics[topic];
			if(!arr) return;
			let index = arr.indexOf(listener);
			if(index !== -1) arr.splice(index, 1);
		};
	}

	matchTopics(topic){
		topic = topic || '';
		let topics = [... this.topics[topic] ? this.topics[topic] : []];

		if(!this.topics['__REGEX__']) return topics;

		for(let listener of this.topics['__REGEX__']){
			if(topic.match(listener.match)) topics.push(listener);
		}

		return topics;
	}

	// Publish data to a topic.
	//
	// Returns a Promise that resolves once every matching listener has
	// settled. Listeners may be sync or async; if a listener returns a
	// thenable it is awaited. This lets callers do:
	//
	//     await pubsub.publish('topic', data);
	//
	// The optional `from` argument is an opaque origin identifier (a peer
	// ID when used through P2PSub) that is forwarded to listeners as the
	// third argument: `listener(data, topic, from)`.
	publish(topic, data, from) {
		data = data || {};

		// send the event to all listeners
		let listeners = this.matchTopics(topic);
		if(!listeners.length) return Promise.resolve();

		return Promise.all(listeners.map(function(listener) {
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					try {
						// Resolve with the listener's result so async
						// listeners (returning a Promise) are awaited.
						resolve(Promise.resolve(listener(data, topic, from)));
					} catch(error) {
						reject(error);
					}
				}, 0);
			});
		}));
	}
}

module.exports = {PubSub};
