const app = require('./app');

app.p2p.onData(function(data){
	console.log('app, data:', data)
})


setTimeout(function(){
	app.p2p.broadcast({type:'topic', body:"yolo"})
}, 10000);

