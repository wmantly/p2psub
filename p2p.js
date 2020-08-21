const crypto = require("crypto");
const net = require('net');

class P2P {
	constructor(args){
		this.wantedPeers = new Set();
		this.connectedPeers = {};
		this.peerID = crypto.randomBytes(16).toString("hex");
		this.connectInterval = this.__peerInterval();
		this.onDataCallbacks = [];


		if(args.listenPort){
			this.server = this.__listen(args.listenPort);
		}

		if(args.peers){
			this.addPeer(args.peers);
		}

	}

	addPeer(peer){
		if(Array.isArray(peer)){
			for(let address of peer){
				this.addPeer(address);
			}
			return;
		}

		if(this.wantedPeers.has(peer)) return true;
		this.wantedPeers.add(peer);
	}

	removePeer(peer){
		if(this.wantedPeers.has(peer)){
			this.wantedPeers.delete(peer);

			for(let peerID in this.connectedPeers){
				if(this.connectedPeers[peerID].peerConnectAddress !== peer) continue;
				this.connectedPeers[peerID].end();
				delete this.connectedPeers[peerID];
			}
		}
	}

	__connectPeer(address, port) {
		if(!port){
			let parse = address.split(':');
			address = parse[0];
			port = parse[1];
		}

		let peer = new net.Socket().connect(port, address);
		let p2p = this;

		peer.on('connect', function(){
			console.info(`Peer ${address} is now connected.`);
			peer.peerConnectAddress = `${address}:${port}`
			peer.write(JSON.stringify({type:"register", id: p2p.peerID}));
		});
		
		peer.on('close', function(){
			console.info(`Client Peer ${address}, ${peer.peerID} droped.`);
			delete p2p.connectedPeers[peer.peerID];
		});

		peer.on('data', function(data){
			p2p.__read(JSON.parse(data.toString()), peer.remoteAddress, peer);
		});

		peer.on('error', function(error){
			if(error.syscall === 'connect' && error.code === 'ECONNREFUSED'){
				console.info(`Peer ${error.address}:${error.port} connection refussed!`);
			}else{
				console.warn('client EVENT error:', arguments);
			}
		});
	}

	__peerInterval(interval){

		return setInterval(function(p2p){
			let connected = Object.keys(p2p.connectedPeers).map(function(peerID){
				return p2p.connectedPeers[peerID].peerConnectAddress
			});

			for(let peer of p2p.wantedPeers){
				if(!connected.includes(peer)){
					p2p.__connectPeer(peer);
				}
			}
		}, interval || 1000, this);
	}

	__listen (port){

		let p2p = this;

		let serverSocket = new net.Server(function (clientSocket) {

			console.info(`server ${port}`)


			clientSocket.on('error', function(){
				console.log('server-client EVENT error:', arguments);
			});


		});

		serverSocket.on('connection', function(clientSocket){

			console.log('server EVENT connection from client:', clientSocket.remoteAddress);
			clientSocket.write(JSON.stringify({type:"register", id: p2p.peerID}));

			clientSocket.on('data', function(data){
				p2p.__read(JSON.parse(data.toString()), clientSocket.remoteAddress, clientSocket);
			});

			clientSocket.on('close', function(){
				console.info(`server Peer ${clientSocket.remoteAddress} - ${clientSocket.peerID} droped.`);
				delete p2p.connectedPeers[clientSocket.peerID];
			});

		});

		serverSocket.on('listening', function(){
			console.log('p2p server listening on', port,)
		});

		serverSocket.on('error', function(){
			console.log('server EVENT error:', arguments);
		});

		serverSocket.listen(Number(port));

		return serverSocket;
	}

	broadcast(message, exclude){
		exclude = [...exclude || [], ...[this.peerID]]
		let sentTo = []

		for(let _peerID in this.connectedPeers){
			if(exclude.includes(_peerID)) continue;
			sentTo.push(_peerID);
		}

		message.sentTo = [...new Set([...message.sentTo || [], ...sentTo, ...[this.peerID]])]
		message.from = message.from || this.peerID;

		for(let _peerID of sentTo){
			this.connectedPeers[_peerID].write(JSON.stringify(message));
		}
	}

	__read(message, from, socket){
		if(message.type === "heartbeat"){
			console.log('heartbeat from', from);
			return ;
		}

		if(message.type === "register"){
			console.log('registering peer', message.id, socket.remoteAddress)

			if(Object.keys(this.connectedPeers).includes(message.id)){
				console.log(`Dropping ${message.id}, already connected`)
				socket.end();
			}else{
				socket.peerID = message.id
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
