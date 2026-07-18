const {test, describe, after} = require('node:test');
const assert = require('node:assert');
const {P2PSub} = require('../app');

describe('P2PSub', () => {
	test('should create instance', () => {
		const p2psub = new P2PSub({});
		assert.ok(p2psub);
		assert.ok(p2psub.p2p);
		assert.ok(p2psub.pubsub);
	});

	test('should create instance with no arguments', () => {
		const p2psub = new P2PSub();
		assert.ok(p2psub);
		assert.ok(p2psub.p2p);
		assert.ok(p2psub.pubsub);
	});

	test('should expose subscribe method', () => {
		const p2psub = new P2PSub({});
		assert.strictEqual(typeof p2psub.subscribe, 'function');
	});

	test('should expose publish method', () => {
		const p2psub = new P2PSub({});
		assert.strictEqual(typeof p2psub.publish, 'function');
	});

	test('should expose addPeer method', () => {
		const p2psub = new P2PSub({});
		assert.strictEqual(typeof p2psub.addPeer, 'function');
	});

	test('should expose removePeer method', () => {
		const p2psub = new P2PSub({});
		assert.strictEqual(typeof p2psub.removePeer, 'function');
	});

	test('should publish and subscribe locally', (t, done) => {
		const p2psub = new P2PSub({});

		p2psub.subscribe('local-test', (data, topic) => {
			assert.strictEqual(topic, 'local-test');
			assert.strictEqual(data.message, 'hello');
			done();
		});

		p2psub.publish('local-test', {message: 'hello'});
	});

	test('should support regex subscriptions', (t, done) => {
		const p2psub = new P2PSub({});

		p2psub.subscribe(/^test-/, (data, topic) => {
			assert.strictEqual(topic, 'test-topic');
			assert.strictEqual(data.value, 123);
			done();
		});

		p2psub.publish('test-topic', {value: 123});
	});

	test('should prevent local messages from broadcasting with __local flag', (t, done) => {
		const p2psub = new P2PSub({});
		let broadcastCalled = false;

		const originalBroadcast = p2psub.p2p.broadcast;
		p2psub.p2p.broadcast = () => {
			broadcastCalled = true;
		};

		p2psub.publish('test', {__local: true, data: 'local only'});

		setTimeout(() => {
			assert.strictEqual(broadcastCalled, false);
			p2psub.p2p.broadcast = originalBroadcast;
			done();
		}, 100);
	});

	test('should use custom preBroadcast function', (t, done) => {
		const p2psub = new P2PSub({
			preBroadcast: (data, topic) => {
				let newData = {...data};
				delete newData.secret;
				return newData;
			}
		});

		const originalBroadcast = p2psub.p2p.broadcast;
		p2psub.p2p.broadcast = (message) => {
			assert.strictEqual(message.body.data.public, 'visible');
			assert.strictEqual(message.body.data.secret, undefined);
			p2psub.p2p.broadcast = originalBroadcast;
			done();
		};

		p2psub.publish('test', {public: 'visible', secret: 'hidden'});
	});

	test('preBroadcast can prevent broadcasting by returning false', (t, done) => {
		const p2psub = new P2PSub({
			preBroadcast: () => false
		});

		let broadcastCalled = false;
		const originalBroadcast = p2psub.p2p.broadcast;
		p2psub.p2p.broadcast = () => {
			broadcastCalled = true;
		};

		p2psub.publish('test', {data: 'should not broadcast'});

		setTimeout(() => {
			assert.strictEqual(broadcastCalled, false);
			p2psub.p2p.broadcast = originalBroadcast;
			done();
		}, 100);
	});

	describe('Integration tests', () => {
		let peer1, peer2;
		let created = [];

		after(() => {
			for (const peer of created) peer.destroy();
			created = [];
		});

		function track(...peers) {
			created.push(...peers);
			return peers;
		}

		test('should publish across network', (t, done) => {
			[peer1, peer2] = track(
				new P2PSub({listenPort: 18001, logLevel: [], connectInterval: 50}),
				new P2PSub({listenPort: 18002, peers: ['localhost:18001'], logLevel: [], connectInterval: 50})
			);

			peer1.subscribe('network-test', (data, topic) => {
				assert.strictEqual(topic, 'network-test');
				assert.strictEqual(data.message, 'across network');
				done();
			});

			setTimeout(() => {
				peer2.publish('network-test', {message: 'across network'});
			}, 500);
		});

		test('should work with regex subscriptions across network', (t, done) => {
			[peer1, peer2] = track(
				new P2PSub({listenPort: 18003, logLevel: [], connectInterval: 50}),
				new P2PSub({listenPort: 18004, peers: ['localhost:18003'], logLevel: [], connectInterval: 50})
			);

			peer1.subscribe(/^announcement/, (data, topic) => {
				if (topic === 'announcement-test') {
					assert.strictEqual(data.msg, 'regex works');
					done();
				}
			});

			setTimeout(() => {
				peer2.publish('announcement-test', {msg: 'regex works'});
			}, 500);
		});
	});

	test('should add peers dynamically', () => {
		const p2psub = new P2PSub({});
		p2psub.addPeer('192.168.1.1:7575');
		assert.ok(p2psub.p2p.wantedPeers.has('192.168.1.1:7575'));
	});

	test('should remove peers dynamically', () => {
		const p2psub = new P2PSub({});
		p2psub.addPeer('192.168.1.1:7575');
		p2psub.removePeer('192.168.1.1:7575');
		assert.ok(!p2psub.p2p.wantedPeers.has('192.168.1.1:7575'));
	});

	test('should add and remove an array of peers dynamically', () => {
		const p2psub = new P2PSub({});
		const peers = ['192.168.1.1:7575', '192.168.1.2:7575'];

		p2psub.addPeer(peers);
		assert.strictEqual(p2psub.p2p.wantedPeers.size, 2);

		p2psub.removePeer(peers[0]);
		assert.strictEqual(p2psub.p2p.wantedPeers.size, 1);
		assert.ok(!p2psub.p2p.wantedPeers.has(peers[0]));
		assert.ok(p2psub.p2p.wantedPeers.has(peers[1]));
	});

	test('should attribute locally published messages to the local peer', (t, done) => {
		const p2psub = new P2PSub({});

		p2psub.subscribe('local-origin', (data, topic, from) => {
			assert.strictEqual(topic, 'local-origin');
			assert.strictEqual(from, p2psub.p2p.peerID);
			done();
		});

		p2psub.publish('local-origin', {msg: 'mine'});
	});

	test('should expose destroy() that tears down the p2p layer', (t, done) => {
		const p2psub = new P2PSub({listenPort: 18005, logLevel: []});
		assert.ok(p2psub.p2p.server);
		p2psub.destroy();
		assert.strictEqual(p2psub.p2p.server, null);
		assert.strictEqual(p2psub.p2p.connectInterval._destroyed, true);
		done();
	});

	describe('Peer attribution across network', () => {
		let peer1, peer2;
		let created = [];

		after(() => {
			for (const peer of created) peer.destroy();
			created = [];
		});

		test('subscribe callback receives the originating peer id', (t, done) => {
			peer1 = new P2PSub({listenPort: 18006, logLevel: [], connectInterval: 50});
			peer2 = new P2PSub({listenPort: 18007, peers: ['localhost:18006'], logLevel: [], connectInterval: 50});
			created.push(peer1, peer2);

			peer1.subscribe('who', (data, topic, from) => {
				// The message originated on peer2, so `from` is peer2's id.
				assert.strictEqual(from, peer2.p2p.peerID);
				assert.strictEqual(data.msg, 'hello');
				done();
			});

			setTimeout(() => {
				peer2.publish('who', {msg: 'hello'});
			}, 500);
		});
	});
});
