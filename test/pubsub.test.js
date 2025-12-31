const {test, describe} = require('node:test');
const assert = require('node:assert');
const {PubSub} = require('../pubsub');

describe('PubSub', () => {
	test('should create instance', () => {
		const pubsub = new PubSub();
		assert.ok(pubsub);
		assert.deepStrictEqual(pubsub.topics, {});
	});

	test('should subscribe to a topic with string', (t, done) => {
		const pubsub = new PubSub();
		const testData = {message: 'test'};

		pubsub.subscribe('test-topic', (data, topic) => {
			assert.strictEqual(topic, 'test-topic');
			assert.deepStrictEqual(data, testData);
			done();
		});

		pubsub.publish('test-topic', testData);
	});

	test('should subscribe to multiple topics', (t, done) => {
		const pubsub = new PubSub();
		let callCount = 0;

		pubsub.subscribe('topic1', (data) => {
			assert.strictEqual(data.msg, 'one');
			callCount++;
			if (callCount === 2) done();
		});

		pubsub.subscribe('topic2', (data) => {
			assert.strictEqual(data.msg, 'two');
			callCount++;
			if (callCount === 2) done();
		});

		pubsub.publish('topic1', {msg: 'one'});
		pubsub.publish('topic2', {msg: 'two'});
	});

	test('should support regex pattern subscriptions', (t, done) => {
		const pubsub = new PubSub();
		let callCount = 0;

		pubsub.subscribe(/^announcement/, (data, topic) => {
			callCount++;
			if (topic === 'announcement') {
				assert.strictEqual(data.msg, 'one');
			} else if (topic === 'announcement-group1') {
				assert.strictEqual(data.msg, 'two');
			}
			if (callCount === 2) done();
		});

		pubsub.publish('announcement', {msg: 'one'});
		pubsub.publish('announcement-group1', {msg: 'two'});
	});

	test('should match all topics with .* regex', (t, done) => {
		const pubsub = new PubSub();
		const received = [];

		pubsub.subscribe(/.*/, (data, topic) => {
			received.push(topic);
			if (received.length === 3) {
				assert.ok(received.includes('topic1'));
				assert.ok(received.includes('topic2'));
				assert.ok(received.includes('topic3'));
				done();
			}
		});

		pubsub.publish('topic1', {});
		pubsub.publish('topic2', {});
		pubsub.publish('topic3', {});
	});

	test('should handle multiple subscribers on same topic', (t, done) => {
		const pubsub = new PubSub();
		let callCount = 0;

		pubsub.subscribe('shared-topic', () => {
			callCount++;
			if (callCount === 2) done();
		});

		pubsub.subscribe('shared-topic', () => {
			callCount++;
			if (callCount === 2) done();
		});

		pubsub.publish('shared-topic', {});
	});

	test('should not call subscribers for different topics', (t, done) => {
		const pubsub = new PubSub();

		pubsub.subscribe('topic1', () => {
			assert.fail('topic1 should not be called');
		});

		pubsub.subscribe('topic2', () => {
			done();
		});

		pubsub.publish('topic2', {});
	});

	test('should pass empty object if no data provided', (t, done) => {
		const pubsub = new PubSub();

		pubsub.subscribe('test', (data) => {
			assert.deepStrictEqual(data, {});
			done();
		});

		pubsub.publish('test');
	});

	test('matchTopics should return empty array for non-existent topic', () => {
		const pubsub = new PubSub();
		const topics = pubsub.matchTopics('non-existent');
		assert.deepStrictEqual(topics, []);
	});

	test('matchTopics should return subscribers for exact match', () => {
		const pubsub = new PubSub();
		const callback = () => {};

		pubsub.subscribe('test-topic', callback);
		const topics = pubsub.matchTopics('test-topic');

		assert.strictEqual(topics.length, 1);
		assert.strictEqual(topics[0], callback);
	});
});
