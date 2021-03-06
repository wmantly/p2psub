const crypto = require("crypto");
const net = require('net');

class P2P {
	constructor(args){
		args = args || {};

		// The list of clients this peer wants to connect to
		this.wantedPeers = new Set();

		// The peers we are currently connected to
		this.connectedPeers = {};

		// Random ID for this peer
		this.peerID = crypto.randomBytes(16).toString("hex");

		// Kick of the interval to connect to peers and send hear beats
		this.connectInterval = this.__peerInterval();

		// Hold the data callbacks when a message is received 
		this.onDataCallbacks = [];

		// Set the logging level
		this.logLevel = args.logLevel || [];

		// If a listen port was specified, have this peer listen for incoming
		// connection
		if(args.listenPort){
			this.server = this.__listen(args.listenPort);
		}

		// If a list of peers in supplied, add them.
		if(args.peers){
			this.addPeer(args.peers);
		}

		this.__log('info', 'Local peerID', this.peerID);
	}

	__log(type, ...message){
		if(this.logLevel === 'all' || this.logLevel.includes(type)){
			console[type](...message);
		}
	}

	// Take a peer as <host>:<port> and add it the `wantedPeers` list
	addPeer(peer){

		// If `peer` is a list, call `addPeer` with each item
		if(Array.isArray(peer)){
			for(let address of peer){
				this.addPeer(address);
			}
			return;
		}

		this.wantedPeers.add(peer);
	}

	// Close a connection to a peer and remove it from the `wantedPeers` list
	removePeer(peer){
		if(this.wantedPeers.has(peer)){
			this.wantedPeers.delete(peer);

			// find the peer in the `connectedPeers` object
			for(let peerID in this.connectedPeers){
				if(this.connectedPeers[peerID].peerConnectAddress  !== peer) continue;

				this.connectedPeers[peerID].end();
				delete this.connectedPeers[peerID];
			}
		}
	}

	// Connect to a remote peer
	__connectPeer(address, port) {
		if(!port){
			let parse = address.split(':');
			address = parse[0];
			port = parse[1];
		}

		let buffer ='';

		let peer = new net.Socket().connect(port, address);
		let p2p = this;

		peer.on('connect', function(){
			p2p.__log('info', `Peer ${address} is now connected.`);
			peer.peerConnectAddress = `${address}:${port}`
			peer.isClient = true;

			// When a connection is started, send a message informing the remote
			// peer of our ID
			peer.write(JSON.stringify({type:"register", id: p2p.peerID}));
		});
		
		peer.on('close', function(){
			p2p.__log('info', `Client Peer ${address}, ${peer.peerID} droped.`);
			delete p2p.connectedPeers[peer.peerID];
		});

		peer.on('data', function(data){
			buffer += data.toString();
			try{
				p2p.__read(JSON.parse(buffer), peer.remoteAddress, peer);
				buffer = '';
			}catch(error){

			}
		});

		peer.on('error', function(error){
			if(error.syscall === 'connect' && error.code === 'ECONNREFUSED'){
				p2p.__log('info', `Peer ${error.address}:${error.port} connection refussed!`);
			}else{
				p2p.__log('warn', 'client EVENT error:', arguments);
			}
		});
	}

	__peerInterval(interval){

		this.count = 1;

		return setInterval(function(p2p){
			// Copy the wanted peers list do we can reduce it.
			let tryConnectionSet = new Set(p2p.wantedPeers);

			// loop over all the connected peers 
			for(let peerID in p2p.connectedPeers){
				let peer = p2p.connectedPeers[peerID];

				// If the peer does not a `peerConnectAddress`, it 
				if(! peer.peerConnectAddress) continue;

				// Remove connected peers from the list
				tryConnectionSet.delete(peer.peerConnectAddress);

				// Every once and while send a heart beat keep the socket open.
				if(peer.isClient && (p2p.count % 10) == 0){
					peer.write(JSON.stringify({type:"heartbeat"}));
				}
			}

			p2p.count++
			// loop over the unconnected peers, and try to connect to them.
			for(let peer of tryConnectionSet){
				p2p.__connectPeer(peer);
			}
		}, interval || 1000, this);
	}

	__listen (port){

		let p2p = this;
		let buffer = '';

		let serverSocket = new net.Server(function (clientSocket) {

			clientSocket.on('error', function(){
				console.log('server-client EVENT error:', arguments);
			});

		});

		serverSocket.on('connection', function(clientSocket){

			console.log('server EVENT connection from client:', clientSocket.remoteAddress);

			// When a connection is started, send a message informing the remote
			// peer of our ID
			clientSocket.write(JSON.stringify({type:"register", id: p2p.peerID}));

			clientSocket.on('data', function(data){
				buffer += data.toString();
				try{
					p2p.__read(JSON.parse(buffer), clientSocket.remoteAddress, clientSocket);
					buffer = '';
				}catch(error){
					;
				}
			});

			clientSocket.on('close', function(){
				p2p.__log('info', `server Peer ${clientSocket.remoteAddress} - ${clientSocket.peerID} droped.`);
				delete p2p.connectedPeers[clientSocket.peerID];
			});

		});

		serverSocket.on('listening', function(){
			p2p.__log('info','p2p server listening on', port,)
		});

		serverSocket.on('error', function(error){
			if(error.syscall === 'listen' && error.code === 'EADDRINUSE'){
				console.error('ERROR: Server listening port', port, 'address already in use.')
				process.exit(2)	
			}
			p2p.__log('error','server EVENT error:', arguments);
		});

		serverSocket.listen(Number(port));

		return serverSocket;
	}

	broadcast(message, exclude){
		exclude = [...exclude || [], ...[this.peerID]];
		let sentTo = [];

		// Build a list of peers to send this message too
		for(let _peerID in this.connectedPeers){
			// console.log('broadcast peerID', _peerID , exclude.includes(_peerID))
			if(exclude.includes(_peerID)) continue;
			sentTo.push(_peerID);
		}

		// console.log('broadcastTo', sentTo, exclude, 'sentTo', sentTo)

		// Attach a list of peers this message has been send to, including our
		// peerID
		message.sentTo = [...new Set([...message.sentTo || [], ...sentTo, ...[this.peerID]])]
		message.from = message.from || this.peerID;

		// Send the message to the connected peers in the `sentTo` list.
		for(let _peerID of sentTo){

			this.connectedPeers[_peerID].write(JSON.stringify(message));
		}
	}

	__read(message, from, socket){
		// Parse an incoming message
		this.__log('info', 'p2p message', message);

		// Drop heart beats
		if(message.type === "heartbeat"){
			this.__log('info', 'heartbeat from', from);
			return ;
		}

		// Register new clients with this peer, drop them if a connection
		// already exists
		if(message.type === "register"){
			this.__log('info', 'registering peer', message.id, socket.remoteAddress)

			if(Object.keys(this.connectedPeers).includes(message.id)){

				if(socket.peerConnectAddress){
					this.connectedPeers[message.id].peerConnectAddress = socket.peerConnectAddress
				}
				this.__log('info', `Dropping ${message.id}, already connected`)
				socket.end();
			}else{
				socket.peerID = message.id
				// Add the peer to 'connectedPeers' object with the remote
				// peerID as the key and the socket as it' value.
				this.connectedPeers[message.id] = socket;
			}
			return ;
		}

		// forward the message to other peers
		this.broadcast(message, message.sentTo);
		// console.log('p2p read:', message)

		// pass message to local callbacks
		this.onDataCallbacks.forEach(function(callback){
			callback(message);
		})
	}

	onData(callback){
		if(callback instanceof Function){
			this.onDataCallbacks.push(callback);
		}
	}
}

module.exports = {P2P};
