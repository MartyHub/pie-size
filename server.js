var connect = require('connect');
var http = require('http');
var io = require('socket.io');
var open = require('open');
var pie = require("./pie-size");
var app = connect().use(connect.static(__dirname + '/static'));
var server = http.createServer(app);

io = io.listen(server);

io.set('log level', 1);

io.sockets.on('connection', function(socket) {
	pie.init(function(root, sep) {
		socket.emit('init', root, sep);
	});

	socket.on('size', function(basePath, lastName, noCache) {
		var handler = {
			start: function(name) {
				socket.emit('start', name);
			},
			onFile: function(name, size, isFolder) {
				socket.emit('file', name, size, isFolder);
			},
			end: function(size) {
				socket.emit('end', size);
			}
		}

		pie.size(basePath, lastName, handler, noCache);
	});
});

setTimeout(function() {
	open('http://localhost:8888');
}, 500);

server.listen(8888);