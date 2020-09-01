# NPM p2psub

Mesh peer to peer JSON Pub/Sub with no extremal dependencies. Each peer can act as
server and client, just a client or a simple relay peer. Topics can be
subscribed to using a simple string or regex pattern.

## Features

* Mesh peer to peer network forwards messages to all connected, even if they are
	not directly connected.
* Peers can be added and removed on the fly.
* PubSub topics can be subscribed using patter RegExp.
* Peer to peer and pub/sub is 2 separate importable classes for even more
	customization. 
* **No dependencies.**

[![NPM](https://nodei.co/npm/p2psub.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/p2psub/)

## Install

`npm install p2psub --save`


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

p2p.subscribe(\^announcement\, (data, topic)=> console.log(topic, data.message));

# announcement p2p pubsub is awesome!
# announcement-group1 Mesh is the future!
```

```javascript
// Another remote peer

p2p.subscribe(\.\, (data, topic)=> console.log(topic, data));

# announcement {message: 'p2p pubsub is awesome!'}
# announcement-group1 {message: 'Mesh is the future!'}
# resource-block-added {id: '123', name:'block0'}
```

### P2PSub instance options

All of these are provided by, and passed to the `P2P` class. `PubSub` takes no
instance options.

`listenPort` Optional, type Number or String. Sets the incoming TCP port for the
local peer to listen on. If this is left blank, the local peer will not accept
incoming peers. Default is `undefined`

`peers`: Optional, type Array of Strings. The list of peers this peer will try
to connect with. Peers should be specified as `{host}:{port{}`. The host can be
an IP or a hostname the system can resolve. Default is `[]`

`logLevel`: Optional, type Array of Strings or `false`. Sets how the instance
logs to STDIN out. Options are `info`, `warn` and `error` if one or more
are passed in the `logLevel` Array, messages will be printed to STDIN/STDERR.
Passing `false` or leaving it blank will suppress all message except if the
listening port is in use.

`preBroadcast(data, topic)`: Optional function to be ran before a topic is
published across the network. The message body Object is passed as the first
argument and the topic as the second. Return the Object to be broadcasted across
the network or `false` to prevent propagation. This is useful to prevent data
from leaving the local node. This is only used on `P2PSub` class instances.

Example of striping data from a message:

```javascript
const p2p = new P2PSub({
	listenPort: 7575,
	preBroadcast: function(data, topic){
		let thisData = {...data} // copy the object or all local subscriptions will lose the data too
		delete this.data.sensitiveInformation;

		return thisData
	}
});


``` 

## CLI usage

A simple relay peer can be set up using just the CLI, no code required. This
peer will only relay messages to all its connected peers. The logging level is
set to `info`.

```bash
./app.js 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575 ...

```

The first argument is the listening port, optionally followed by space separated
list of peers to connect with.

## Methods and attributes

Methods are provided by either the `P2P` or `PubSub` classes. The `P2PSub` class
is a mix of both classes and merges the Pub/Sub with p2p functions.

The `P2PSub` class provides `subscribe()`, `publish()`, `addPeer()` and
`removePeer()`. Please see the methods below for detailed usage.

#### Provided by `PubSub` class

* `subscribe(topic, callback-function)` Sets a function to be called on `topic`
	publish. A RegExp pattern can be passed as the topic and will match to
	`topic` on publish. a String will perform an exact match. The message and
	topic are passed to callback function as first and second argument.

* `publish(topic, Object-body)` Executes each callback attached to the passed
	`topic`. To prevent a publication from propagating across the network, pass
	`__local = true` in the message body.

* `topics` An instance attribute holding an Object on topics and bound callbacks.
	This is not exposed by the `P2PSub` class.

#### Provided by `P2P` class

* `addPeer(peer)` Adds a remote peer to the local peers connections. `peer` can
	passed as a single string with a hostname and port, `'remotehost.com:7575'`,
	or an Array of Strings with peers
	`['remotehost.com:7575', '10.10.2.1:7575']`. Duplicate and existing peers
	will be ignored.

* `removePeer(peer)` Disconnect the passed peer and removes it from the list of
	peers this instances auto reconnects to. `peer` is passed as a single sting
	with a hostname and port, `'remotehost.com:7575'`

* `onData(callback)` Pass a listener to called when this peer receives a message
	from the network. The message is passed to the callback as native JSON
	object. This is not exposed by the `P2PSub` class, `subscribe` should be
	used.

* `broadcast(message, <excludes>)` Sends a JSON message to all connected peers.
	`message` is JSON object that will be stringified. `excludes` is a Array of
	Strings containing peerID's that this broadcast should not be sent you, and
	is for internal use at this time. This is not exposed by the `P2PSub` class,
	`publish` should be used.

* `peerID` An instance attribute holding a String for the local `peerID`. This
	is randomly generated and is for internal use. This is not exposed by the
	`P2PSub` class.

## Notes

This project is in active development. Please report any issue and ask for new
features. PR's are also welcomed.

## Todo

* Add timestamps to each message.
* Change the parsing of the message move `sentTo` in the prototype before
	passing the class.
* Add optional TSL
* Internal ability to publish new peers across the network.
* Add config file for CLI mode.
