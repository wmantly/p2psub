const {test, describe, before, after} = require('node:test');
const assert = require('node:assert');
const {P2P} = require('../p2p');

describe('P2P', () => {
	test('should create instance with default options', () => {
		const p2p = new P2P({});
		assert.ok(p2p);
		assert.ok(p2p.peerID);
		assert.strictEqual(p2p.peerID.length, 32); // 16 bytes as hex
		assert.ok(p2p.wantedPeers instanceof Set);
		assert.strictEqual(p2p.wantedPeers.size, 0);
	});

	test('should generate unique peer IDs', () => {
		const p2p1 = new P2P({});
		const p2p2 = new P2P({});
		assert.notStrictEqual(p2p1.peerID, p2p2.peerID);
	});

	test('should add single peer', () => {
		const p2p = new P2P({});
		p2p.addPeer('192.168.1.1:7575');
		assert.ok(p2p.wantedPeers.has('192.168.1.1:7575'));
	});

	test('should add multiple peers from array', () => {
		const p2p = new P2P({});
		const peers = ['192.168.1.1:7575', '192.168.1.2:7575'];
		p2p.addPeer(peers);
		assert.strictEqual(p2p.wantedPeers.size, 2);
		assert.ok(p2p.wantedPeers.has('192.168.1.1:7575'));
		assert.ok(p2p.wantedPeers.has('192.168.1.2:7575'));
	});

	test('should add peers from constructor', () => {
		const peers = ['192.168.1.1:7575', '192.168.1.2:7575'];
		const p2p = new P2P({peers});
		assert.strictEqual(p2p.wantedPeers.size, 2);
	});

	test('should remove peer', () => {
		const p2p = new P2P({});
		p2p.addPeer('192.168.1.1:7575');
		assert.ok(p2p.wantedPeers.has('192.168.1.1:7575'));

		p2p.removePeer('192.168.1.1:7575');
		assert.ok(!p2p.wantedPeers.has('192.168.1.1:7575'));
	});

	test('should register onData callback', () => {
		const p2p = new P2P({});
		const callback = () => {};

		p2p.onData(callback);
		assert.strictEqual(p2p.onDataCallbacks.length, 1);
		assert.strictEqual(p2p.onDataCallbacks[0], callback);
	});

	test('should ignore non-function onData callback', () => {
		const p2p = new P2P({});

		p2p.onData('not a function');
		assert.strictEqual(p2p.onDataCallbacks.length, 0);
	});

	test('should set logLevel from constructor', () => {
		const p2p = new P2P({logLevel: ['info', 'warn']});
		assert.deepStrictEqual(p2p.logLevel, ['info', 'warn']);
	});

	test('should have empty logLevel by default', () => {
		const p2p = new P2P({});
		assert.deepStrictEqual(p2p.logLevel, []);
	});

	describe('Network operations', () => {
		let server1, server2;

		after(() => {
			if (server1) {
				clearInterval(server1.connectInterval);
				if (server1.server) server1.server.close();
			}
			if (server2) {
				clearInterval(server2.connectInterval);
				if (server2.server) server2.server.close();
			}
		});

		test('should start listening on port', (t, done) => {
			server1 = new P2P({listenPort: 17575});

			setTimeout(() => {
				assert.ok(server1.server);
				assert.ok(server1.server.listening);
				done();
			}, 100);
		});

		test('should connect two peers and exchange messages', (t, done) => {
			server1 = new P2P({listenPort: 17576, logLevel: []});
			server2 = new P2P({listenPort: 17577, peers: ['localhost:17576'], logLevel: []});

			server1.onData((message) => {
				if (message.type === 'test') {
					assert.strictEqual(message.body, 'hello from server2');
					done();
				}
			});

			setTimeout(() => {
				server2.broadcast({type: 'test', body: 'hello from server2'});
			}, 500);
		});

		test('should forward messages across network', (t, done) => {
			const server3 = new P2P({listenPort: 17578, logLevel: []});
			server1 = new P2P({listenPort: 17579, peers: ['localhost:17578'], logLevel: []});
			server2 = new P2P({listenPort: 17580, peers: ['localhost:17579'], logLevel: []});

			let receivedCount = 0;

			server3.onData((message) => {
				if (message.type === 'forward-test') {
					receivedCount++;
					assert.strictEqual(message.body, 'forwarded message');
					checkDone();
				}
			});

			server1.onData((message) => {
				if (message.type === 'forward-test') {
					receivedCount++;
					checkDone();
				}
			});

			function checkDone() {
				if (receivedCount === 2) {
					clearInterval(server3.connectInterval);
					if (server3.server) server3.server.close();
					done();
				}
			}

			setTimeout(() => {
				server2.broadcast({type: 'forward-test', body: 'forwarded message'});
			}, 800);
		});
	});

	describe('Message handling', () => {
		test('broadcast should add sentTo and from fields', () => {
			const p2p = new P2P({});
			const message = {type: 'test', body: 'data'};

			p2p.broadcast(message);

			assert.ok(Array.isArray(message.sentTo));
			assert.ok(message.sentTo.includes(p2p.peerID));
			assert.strictEqual(message.from, p2p.peerID);
		});

		test('broadcast should exclude specified peers', () => {
			const p2p = new P2P({});
			const excludeID = 'peer-to-exclude';
			const message = {type: 'test'};

			p2p.broadcast(message, [excludeID]);

			assert.ok(!message.sentTo.includes(excludeID));
		});
	});
});
