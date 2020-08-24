class PubSub{
	constructor(){
		this.topics = {};
	}

	subscribe(topic, listener) {
		if(topic instanceof RegExp){
			listener.match = topic;
			topic = "__REGEX__";
		}

		// console.log(this)
// 
		// create the topic if not yet created
		if(!this.topics[topic]) this.topics[topic] = [];

		// add the listener
		this.topics[topic].push(listener);
	}

	matchTopics(topic){
		let topics = [... this.topics[topic] ? this.topics[topic] : []];

		// console.log(this.topics)
		if(!this.topics['__REGEX__']) return topics;

		for(let listener of this.topics['__REGEX__']){
			if(topic.match(listener.match)) topics.push(listener);
		}

		return topics;
	}

	publish(topic, data) {

		// send the event to all listeners
		this.matchTopics(topic).forEach(function(listener) {
			setTimeout(function(data, topic){
					listener(data || {}, topic);
				}, 0, data, topic);
		});
	}
}

module.exports = {PubSub};
