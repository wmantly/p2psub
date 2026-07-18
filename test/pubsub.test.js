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

	test('publish should return a Promise', async () => {
		const pubsub = new PubSub();
		const result = pubsub.publish('topic', {});
		assert.ok(result && typeof result.then === 'function');
		await result;
	});

	test('publish should resolve after async listeners settle', async () => {
		const pubsub = new PubSub();
		let order = [];

		pubsub.subscribe('topic', async () => {
			await new Promise((r) => setTimeout(r, 20));
			order.push('async-listener-done');
		});

		await pubsub.publish('topic', {});
		// If publish awaited the async listener, this runs after it settled.
		order.push('after-publish');
		assert.deepStrictEqual(order, ['async-listener-done', 'after-publish']);
	});

	test('publish should forward the from argument to listeners', (t, done) => {
		const pubsub = new PubSub();
		pubsub.subscribe('topic', (data, topic, from) => {
			assert.strictEqual(topic, 'topic');
			assert.strictEqual(from, 'peer-xyz');
			done();
		});
		pubsub.publish('topic', {}, 'peer-xyz');
	});

	test('subscribe should return an unsubscribe handle', (t, done) => {
		const pubsub = new PubSub();
		let calls = 0;

		const unsubscribe = pubsub.subscribe('topic', () => { calls++; });

		assert.strictEqual(typeof unsubscribe, 'function');
		pubsub.publish('topic', {}).then(() => {
			unsubscribe();
			return pubsub.publish('topic', {});
		}).then(() => {
			assert.strictEqual(calls, 1);
			done();
		});
	});

	test('unsubscribe handle should work for regex subscriptions', (t, done) => {
		const pubsub = new PubSub();
		let calls = 0;

		const unsubscribe = pubsub.subscribe(/^topic/, () => { calls++; });

		pubsub.publish('topic-one', {}).then(() => {
			unsubscribe();
			return pubsub.publish('topic-two', {});
		}).then(() => {
			assert.strictEqual(calls, 1);
			done();
		});
	});

	test('publish should reject when a listener throws', async () => {
		const pubsub = new PubSub();
		const error = new Error('listener error');

		pubsub.subscribe('topic', () => {
			throw error;
		});

		await assert.rejects(pubsub.publish('topic', {}), error);
	});
});
