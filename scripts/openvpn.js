#!/usr/bin/env node

var fs = require('fs-plus');
var mv = require('mv');
var zlib = require('zlib');
var path = require('path');
var fstream = require("fstream");

var request = null;
request = require('../lib/request');

var tar = require('tar');
var temp = require('temp');
var archiver = require('archiver');

temp.track();

// OpenVPN Download Link
var config = {
	win32: {
		x86: 'https://github.com/VPNht/node-builder/releases/download/openvpn/openvpn-windows-x86.exe',
		x64: 'https://github.com/VPNht/node-builder/releases/download/openvpn/openvpn-windows-x64.exe',
	},
	darwin: {
		x86: 'https://github.com/VPNht/node-builder/releases/download/openvpn/openvpn-mac.tar.gz',
		x64: 'https://github.com/VPNht/node-builder/releases/download/openvpn/openvpn-mac.tar.gz',
	},
	linux: {
		x86: 'https://github.com/VPNht/node-builder/releases/download/openvpn/openvpn-linux-x86.tar.gz',
		x64: 'https://github.com/VPNht/node-builder/releases/download/openvpn/openvpn-linux-x64.tar.gz',
	}
}

var downloadFileToLocation = function (url, filename, callback) {
	var stream = fs.createWriteStream(filename);
	stream.on('finish', callback);
	stream.on('error', callback);
	request.createReadStream({
		url: url
	}, function (requestStream) {
		requestStream.pipe(stream);
	});
};

var downloadTarballAndExtract = function (url, location, callback) {
	var tempPath = temp.mkdirSync('vpnht-openvpn-');
	var stream = tar.Extract({
		path: tempPath
	});
	stream.on('end', callback.bind(this, tempPath));
	stream.on('error', callback);
	request.createReadStream({
		url: url
	}, function (requestStream) {
		requestStream.pipe(zlib.createGunzip()).pipe(stream);
	});
};

var copyToLocation = function (callback, targetFilename, fromDirectory) {
	return mv(fromDirectory, targetFilename, function (err) {
		if (err) {
			callback(err);
			return;
		}
		fs.chmod(targetFilename, "755", callback);
	});
};

var downloadOpenVPN = function (done) {
	var arch, downloadURL, filename;
	arch = process.arch === 'ia32' ? 'x86' : process.arch;

	// we clean our download folder
	fs.removeSync('openvpn');

	downloadURL = config[process.platform][arch];

	if (process.platform === 'win32') {
		// if windows we need our dir so we'll create it
		fs.makeTreeSync('openvpn');
		filename = path.join('openvpn', "openvpn.exe");
	} else {
		// we tell him to extract in openvpn folder
		filename = path.join('openvpn');
	}

	// it's a EXE
	if (process.platform === 'win32') {
		downloadFileToLocation(downloadURL, filename, done);
	} else if (process.platform === 'linux') {
		var next = copyToLocation.bind(this, done, filename);
		downloadTarballAndExtract(downloadURL, filename, next);
	} else {
		var next = copyToLocation.bind(this, done, filename);
		downloadTarballAndExtract(downloadURL, filename, next);
	}
};

var createTarOpenVpn = function (done) {

	fs.removeSync('build');
	fs.makeTreeSync('build');

	var arch = process.arch === 'ia32' ? 'x86' : process.arch;
	var platform = process.platform === 'darwin' ? 'mac' : process.platform;

	var dirDest = fs.createWriteStream('build/openvpn-' + platform + '-' + arch + '.tar.gz');

	// we'll copy our openvpn.conf
	fs.createReadStream('openvpn.conf').pipe(fs.createWriteStream('openvpn/openvpn.conf'));

	var tarArchive = archiver('tar', {
	  gzip: true,
	  gzipOptions: {
	    level: 1
	  }
	});

	dirDest.on('close', function() {
	    console.log('done with the tar', 'build/openvpn-' + platform + '-' + arch + '.tar.gz');
		done();
	});

	tarArchive.pipe(dirDest);

	tarArchive.bulk([
	    { src: [ '**/*' ], cwd: path.resolve(__dirname, '..', 'openvpn'), expand: true }
	]);

	tarArchive.finalize()
}

var createTarRunAs = function (done) {

	var arch = process.arch === 'ia32' ? 'x86' : process.arch;
	var platform = process.platform === 'darwin' ? 'mac' : process.platform;

	var dirDest = fs.createWriteStream('build/runas-' + platform + '-' + arch + '.tar.gz');

	var tarArchive = archiver('tar', {
	  gzip: true,
	  gzipOptions: {
	    level: 1
	  }
	});

	dirDest.on('close', function() {
	    console.log('done with the tar', 'build/runas-' + platform + '-' + arch + '.tar.gz');
		done();
	});

	tarArchive.pipe(dirDest);

	tarArchive.bulk([
	    { src: [ '**/*' ], cwd: path.resolve(__dirname, '..', 'node_modules', 'runas'), expand: true }
	]);

	tarArchive.finalize()
}

downloadOpenVPN(function (error) {
	if (error != null) {
		console.error('Failed to download openvpn', error);
		return process.exit(1);
	} else {
		// we can pack it !
		createTarOpenVpn(function(error) {
			if (error != null) {
				console.error('Failed to generate final build', error);
				return process.exit(1);
			} else {
				createTarRunAs(function(error) {
					if (error != null) {
						console.error('Failed to generate runas build', error);
						return process.exit(1);
					} else {
						return process.exit(0);
					}
				})
			}
		})
	}
});
