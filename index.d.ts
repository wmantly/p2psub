// Type definitions for p2psub
// Project: https://github.com/wmantly/p2psub

export interface PubSubListener {
	(data: any, topic: string, from?: string): any;
	match?: RegExp;
}

export declare class PubSub {
	topics: Record<string, PubSubListener[]>;

	/**
	 * Subscribe to a topic. `topic` can be an exact string or a RegExp pattern.
	 * Returns an unsubscribe function.
	 */
	subscribe(topic: string | RegExp, listener: PubSubListener): () => void;

	/**
	 * Return all listeners that match the given topic name.
	 */
	matchTopics(topic: string): PubSubListener[];

	/**
	 * Publish data to a topic. Returns a Promise that resolves once every
	 * matching listener has settled. Async listeners are awaited.
	 */
	publish(topic: string, data?: any, from?: string): Promise<any>;
}

export interface P2POptions {
	/** TCP port to listen on. If omitted, the peer will not accept incoming connections. */
	listenPort?: number | string;

	/** Peers to connect to, each as `{host}:{port}`. */
	peers?: string | string[];

	/** Logging levels to enable. Set to `false` to suppress logging. */
	logLevel?: string[] | false;

	/**
	 * Milliseconds between connection attempts and heartbeats.
	 * @default 1000
	 */
	connectInterval?: number;
}

export interface P2PMessage {
	type: string;
	[id: string]: any;
}

export declare class P2P {
	peerID: string;
	wantedPeers: Set<string>;
	connectedPeers: Record<string, any>;
	logLevel: string[] | false;
	server?: any;
	connectInterval: any;
	onDataCallbacks: Array<(message: P2PMessage) => void>;

	constructor(args?: P2POptions);

	/** Add a peer address or array of addresses to the wanted-peers list. */
	addPeer(peer: string | string[]): void;

	/** Disconnect and remove a peer from the wanted-peers list. */
	removePeer(peer: string): void;

	/** Broadcast a message to all connected peers. */
	broadcast(message: P2PMessage, exclude?: string[]): void;

	/** Register a callback to be invoked when this peer receives a message. */
	onData(callback: (message: P2PMessage) => void): void;

	/** Tear down the peer: stop reconnecting, close the server, and destroy sockets. */
	destroy(): void;
}

export interface P2PSubOptions extends P2POptions {
	/**
	 * Called before a locally published message is broadcast to the mesh.
	 * Return the data object to send, or `false` to prevent broadcasting.
	 */
	preBroadcast?(data: any, topic: string): any | false;
}

export declare class P2PSub {
	p2p: P2P;
	pubsub: PubSub;

	constructor(args?: P2PSubOptions);

	/**
	 * Subscribe to a topic. `topic` can be an exact string or a RegExp pattern.
	 * Returns an unsubscribe function.
	 */
	subscribe(topic: string | RegExp, listener: PubSubListener): () => void;

	/**
	 * Publish data to a topic. Returns a Promise that resolves once every
	 * matching listener has settled. The message is attributed to the local peer.
	 */
	publish(topic: string, data?: any, from?: string): Promise<any>;

	/** Add a peer address or array of addresses. */
	addPeer(peer: string | string[]): void;

	/** Disconnect and remove a peer. */
	removePeer(peer: string): void;

	/** Tear down the underlying P2P layer. */
	destroy(): void;
}

/** Singleton PubSub instance for convenience. */
export declare const ps: PubSub;
