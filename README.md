# p2psub

Mesh peer-to-peer JSON Pub/Sub with no external dependencies. Each peer can act as a server and client, just a client, or a simple relay peer. Topics can be subscribed to using a simple string or regex pattern.

## Features

* Mesh peer-to-peer network forwards messages to all connected peers, even if they are not directly connected
* Peers can be added and removed on the fly
* PubSub topics can be subscribed using RegExp patterns
* Peer-to-peer and pub/sub are two separate importable classes for maximum customization
* **Zero runtime dependencies**

[![NPM](https://nodei.co/npm/p2psub.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/p2psub/)

## Installation

```bash
npm install p2psub
```


## Usage

Instantiate a `P2PSub` instance:

```javascript
const {P2PSub} = require('p2psub');

const p2p = new P2PSub({
	listenPort: 7575,
	peers:[
		'10.10.10.11:7575',
		'10.10.10.12:7575',
		'172.16.24.2:8637'
	]
});
```

Now we can listen for and publish topics across the whole network:

```javascript
// Local peer

p2p.publish('announcement', {message: 'p2p pubsub is awesome!'});
```

```javascript
// Remote peer

p2p.subscribe('announcement', (data)=> console.log(data.message));

# p2p pubsub is awesome!
```

We can also use regex patterns in our subscribes to catch more, or all topics:

```javascript
// Local peer

p2p.publish('announcement', {message: 'p2p pubsub is awesome!'});
p2p.publish('announcement-group1', {message: 'Mesh is the future!'});
p2p.publish('resource-block-added', {id: '123', name:'block0'});
```

```javascript
// Remote peer

p2p.subscribe(/^announcement/, (data, topic)=> console.log(topic, data.message));

# announcement p2p pubsub is awesome!
# announcement-group1 Mesh is the future!
```

```javascript
// Another remote peer

p2p.subscribe(/./, (data, topic)=> console.log(topic, data));

# announcement {message: 'p2p pubsub is awesome!'}
# announcement-group1 {message: 'Mesh is the future!'}
# resource-block-added {id: '123', name:'block0'}
```

### P2PSub Instance Options

All options are provided by and passed to the `P2P` class. The `PubSub` class takes no instance options.

**`listenPort`** (Number or String, optional)
- Sets the incoming TCP port for the local peer to listen on
- If omitted, the local peer will not accept incoming connections
- Default: `undefined`

**`peers`** (Array of Strings, optional)
- List of peers this peer will attempt to connect with
- Peers should be specified as `{host}:{port}`
- The host can be an IP address or a hostname the system can resolve
- Default: `[]`

**`logLevel`** (Array of Strings or `false`, optional)
- Controls logging output to STDOUT/STDERR
- Options: `'info'`, `'warn'`, `'error'`
- Messages will be printed if their level is included in the array
- Set to `false` or leave blank to suppress all messages except critical errors (e.g., port already in use)
- Default: `[]`

**`preBroadcast(data, topic)`** (Function, optional)
- Function called before a topic is published across the network
- Receives the message body Object as the first argument and the topic as the second
- Return the Object to be broadcast across the network, or `false` to prevent propagation
- Useful for filtering sensitive data before network transmission
- Only used on `P2PSub` class instances

Example of stripping data from a message:

```javascript
const p2p = new P2PSub({
	listenPort: 7575,
	preBroadcast: function(data, topic){
		let thisData = {...data} // copy the object or all local subscriptions will lose the data too
		delete thisData.sensitiveInformation;

		return thisData
	}
});


``` 

## CLI Usage

A simple relay peer can be set up using just the CLI, no code required. This peer will only relay messages to all its connected peers. The logging level is automatically set to `info`.

```bash
./app.js 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575 ...
```

The first argument is the listening port, optionally followed by a space-separated list of peers to connect with.

## API Reference

Methods are provided by either the `P2P` or `PubSub` classes. The `P2PSub` class combines both and exposes `subscribe()`, `publish()`, `addPeer()`, and `removePeer()`.

### PubSub Class Methods

**`subscribe(topic, callback)`**
- Sets a callback function to be called when `topic` is published
- `topic` can be a String (exact match) or RegExp (pattern match)
- Callback receives `(data, topic)` as arguments
- Returns: void

**`publish(topic, data)`**
- Executes all callbacks subscribed to the given `topic`
- To prevent propagation across the network, set `__local = true` in the data object
- Returns: void

**`topics`** (Object)
- Instance attribute holding all topics and their bound callbacks
- Not exposed by the `P2PSub` class

### P2P Class Methods

**`addPeer(peer)`**
- Adds a remote peer to the local peer's connections
- `peer` can be a single String (`'remotehost.com:7575'`) or an Array of Strings
- Duplicate and already-connected peers are ignored
- Returns: void

**`removePeer(peer)`**
- Disconnects the specified peer and removes it from the auto-reconnect list
- `peer` is a String with hostname and port (`'remotehost.com:7575'`)
- Returns: void

**`onData(callback)`**
- Registers a listener to be called when this peer receives a message
- The message is passed to the callback as a parsed JSON object
- Not exposed by the `P2PSub` class (use `subscribe` instead)
- Returns: void

**`broadcast(message, [excludes])`**
- Sends a JSON message to all connected peers
- `message` is a JSON object that will be stringified
- `excludes` (optional) is an Array of peerIDs to skip (for internal use)
- Not exposed by the `P2PSub` class (use `publish` instead)
- Returns: void

**`peerID`** (String)
- Randomly generated unique identifier for the local peer
- For internal use only
- Not exposed by the `P2PSub` class

## Testing

Run the test suite using Node.js built-in test runner:

```bash
npm test
```

Tests cover:
- PubSub functionality (subscriptions, publications, regex patterns)
- P2P networking (connections, message forwarding, peer management)
- P2PSub integration (cross-network pub/sub, filtering, preBroadcast hooks)

## Contributing

This project is in active development. Please report issues and request features via GitHub Issues. Pull requests are welcome.

## License

MIT
