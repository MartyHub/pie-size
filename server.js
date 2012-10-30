var connect = require('connect');
var http = require('http');
var io = require('socket.io');
var open = require('open');
var treenode = require("./pie-size");
var app = connect().use(connect.static(__dirname + '/static'));
var server = http.createServer(app);

io = io.listen(server);

io.set('log level', 1);

io.sockets.on('connection', function(socket) {
	socket.on('size', function(basePath, lastName, noCache) {
		var handler = {
			start: function(name, sep) {
				socket.emit('start', name, sep);
			},
			onFile: function(name, size, isFolder) {
				socket.emit('file', name, size, isFolder);
			},
			end: function(size) {
				socket.emit('end', size);
			}
		}

		treenode.size(basePath, lastName, handler, noCache);
	});
});

setTimeout(function() {
	open('http://localhost:8888', function(err) {});
}, 500);

server.listen(8888);