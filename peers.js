const TcpServer = require('./server');
const TcpClient = require('./client');
const crypto = require("crypto");

const peerID = crypto.randomBytes(16).toString("hex");

console.log('Peer ID:', peerID)

let connectedPeers = {}
let peers = []

let addPeer = function(peer){
	if(peers.includes(peer)) return true;
	peers.push(peer)
}

setInterval(function(){
	let connected = Object.keys(connectedPeers).map(function(i){return connectedPeers[i].peerConnectAddress})
	console.log('interval', connected, Object.keys(connectedPeers))
	for(let peer of peers){
		if(!connected.includes(peer)){
			connectPeer(peer);
		}
	}
}, 1000);


let connectPeer = function(address, port) {
	if(!port){
		let parse = address.split(':');
		address = parse[0];
		port = parse[1];
	}

	let peer = TcpClient.connect(address, port);

	peer.on('connect', function(){
		console.info(`Peer ${address} is now connected.`);
		peer.peerConnectAddress = `${address}:${port}`
		peer.write(JSON.stringify({type:"register", id: peerID}));
	});
	
	peer.on('close', function(){
		delete connectedPeers[peer.peerID];
		console.info(`Peer ${address} droped.`);
	});

	peer.on('data', function(data){
		read(JSON.parse(data.toString()), peer.remoteAddress, peer);
	});

}

let removePeer = function(peer){
	if(peer[peer.address]){
		peer.end();
		delete peer[peer.address]
	}
}

let listen = function(port){
	console.log('p2p listen', port)
	let serverSocket = TcpServer(port);

	serverSocket.on('connection', function(clientSocket){
		console.log('server EVENT connection from client:', clientSocket.remoteAddress);
		clientSocket.write(JSON.stringify({type:"register", id: peerID}));

			clientSocket.on('data', function(data){
			read(JSON.parse(data.toString()), clientSocket.remoteAddress, clientSocket);
		});

		clientSocket.on('close', function(){
			delete connectedPeers[clientSocket.peerID];
			console.info(`Peer ${clientSocket.remoteAddress} droped.`);
		});

	});
}


let broadcast = function(message, exclude){
	exclude = [...exclude || [], ...[peerID]]
	let sentTo = []

	for(let _peerID in connectedPeers){
		if(exclude.includes(_peerID)) continue;
		sentTo.push(_peerID);
	}

	message.sentTo = [...new Set([...message.sentTo || [] ,...sentTo, ...[peerID]])]
	message.from = message.from || peerID;

	for(let _peerID of sentTo){
		connectedPeers[_peerID].write(JSON.stringify(message));
	}
}

let read = function(message, from, socket){
	if(message.type === "heartbeat"){
		console.log('heartbeat from', from);
		return ;
	}

	if(message.type === "register"){
		console.log('registering net peer', message.id, socket.remoteAddress)
		if(Object.keys(connectedPeers).includes(message.id)){
			console.log(`Dropping ${message.id}, already connected`)
			socket.end();
		}else{
			connectedPeers[message.id] = socket;
			connectedPeers[message.id].peerID = message.id
		}
	}

	if(message.type === 'topic'){
		broadcast(message, message.sentTo);
		console.log('p2p read:', message)

		// publish message locally
		//publish(message.top, message.body)
	}
}


module.exports = {broadcast, connectPeer, listen, addPeer}
