# node-p2p-simple

Peer to peer JSON Pub/Sub with no extremal dependencies. Each peer can act as
server and client, just a client or a simple relay peer. Topics can be
subscribed to using a simple string or regex pattern.

## Install

`npm install <Name Soon!> --save`


## Usage

Instantiate a `P2PSub` instance:

```
const {P2PSub} = require('<Name Soon!>');

const p2p = new P2PSub({
	listenPort: 7575,
	peers:[
		'10.10.10.11:7575',
		'10.10.10.11:7575',
		'172.16.24.2:8637'
	]
});
```

Now we can listen for and publish topics across the whole network:

```
// Local peer

p2p.publish('announcement', {message: 'p2p pubsub is awesome!'});
```

```
// Remote peer

p2p.subscribe('announcement', (data)=> console.log(data.message));

# p2p pubsub is awesome!
```

We can also use regex patterns in our subscribes to catch more, or all topics:

```
// Local peer

p2p.publish('announcement', {message: 'p2p pubsub is awesome!'});
p2p.publish('announcement-group1', {message: 'Mesh is the future!'});
p2p.publish('resource-block-added', {id: '123', name:'block0'});
```

```
// Remote peer

p2p.subscribe(\^announcement\, (data)=> console.log(data.message));

# p2p pubsub is awesome!
# Mesh is the future!
```

```
// Another remote peer

p2p.subscribe(\.\, (data)=> console.log(data));

# {message: 'p2p pubsub is awesome!'}
# {message: 'Mesh is the future!'}
# {id: '123', name:'block0'}
```

### P2PSub instance options

`listenPort` Optional, type Number or String. Sets the incoming TCP port for the
local peer to listen on. If this is left blank, the local peer will not accept
incoming peers. Default is `undefined`

`peers`: Optional, type Array of Strings. The list of peers this peer will try
to connect with. Peers should be specified as `{host}:{port{}`. The host can be
an IP or a hostname the system can resolve. Default is `[]`

`logLevel`: Optional, type Array of Strings or `false`. Sets the how the
instance log to STDIN out. Options are `info`, `warn` and `error` if one or more
is passed in the `logLevel` Array, messages ill be printed to STDIN/STDERR.
Passing `false` or leaving it blank will suppress all message except if the
listening port is in use.

### CLI usage

A simple relay peer can be set up using just the CLI, no code required. This
peer will only relay messages to all its connected peers. The logging level is
set to `info`.

```
./app.js 7575 10.1.0.1:7575 10.2.0.1:7575 10.3.0.1:7575 ...

```

The first argument is the listen port, optionally followed by space separated
list of peers to connect with.
