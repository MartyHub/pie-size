var fs = require("fs");
var path = require('path');
var memoize = require('memoizee');

function getDirectorySize(directory) {
	var result = 0;

	try {
		var dir = fs.readdirSync(directory);

		dir.map(function(file) {
			try {
				var child = path.join(directory, file);
				var stat = fs.lstatSync(child);

				if(!stat.isSymbolicLink()) {
					if(stat.isFile()) {
						result += stat.size;
					} else if(stat.isDirectory()) {
						result += memoized(child);
					}
				}
			} catch(err) {}
		});
	} catch(err) {}

	return result;
}

var memoized = memoize(getDirectorySize, {
	primitive: true
});

function getUserHome() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function size(basePath, lastName, handler, noCache) {
	if(basePath == null || basePath == '') {
		basePath = getUserHome();
	}

	var currentPath = basePath;

	if(lastName != null) {
		currentPath = path.join(basePath, lastName);
	}

	currentPath = path.resolve(currentPath);

	handler.start(currentPath);

	if (noCache) {
		memoized.clearAll();
	}

	var dir = fs.readdirSync(currentPath);
	var currentSize = 0;

	dir.map(function(file) {
		var childPath = path.join(currentPath, file);

		try {
			var stat = fs.lstatSync(childPath);

			if(!stat.isSymbolicLink()) {
				if(stat.isDirectory()) {
					var childSize = memoized(childPath);

					if(childSize > 0) {
						currentSize += childSize;

						handler.onFile(file + path.sep, childSize, true);
					}
				} else if(stat.isFile() && stat.size > 0) {
					currentSize += stat.size;

					handler.onFile(file, stat.size, false);
				}
			}
		} catch(err) {}
	});

	var length = currentPath.length;

	if (currentPath != '/' && currentPath.charAt(length - 1) == '/') {
		currentPath = currentPath.substring(0, length - 1);
	}

	handler.end(currentPath, currentSize);
}

exports.size = size;