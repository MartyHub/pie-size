var fs = require("fs");
var path = require('path');
var cache = {};

function getDirectorySize(directory) {
	var result = cache[directory];

	if(typeof(result) == 'undefined') {
		result = 0;

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
							result += getDirectorySize(child);
						}
					}
				} catch(err) {}
			});
		} catch(err) {}

		cache[directory] = result;
	}

	return result;
}

function getUserHome() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function size(basePath, lastName, handler) {
	if(basePath == null) {
		basePath = getUserHome();
	}

	var currentPath = basePath;

	if(lastName != null) {
		currentPath = path.join(basePath, lastName);
	}

	handler.start(currentPath);

	var dir = fs.readdirSync(currentPath);
	var currentSize = 0;

	dir.map(function(file) {
		var childPath = path.join(currentPath, file);

		try {
			var stat = fs.lstatSync(childPath);

			if(!stat.isSymbolicLink()) {
				if(stat.isDirectory()) {
					var childSize = getDirectorySize(childPath);

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

	handler.end(currentPath, currentSize);
}

exports.size = size;