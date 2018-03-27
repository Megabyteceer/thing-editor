const log = console.log;
log('Thing starting...');

const fs = require('fs');
const path = require('path')
const express = require('express')
const app = express()
const ef = () => {};
const rootPath = path.resolve(__dirname)+'/';

var PORT = 32023;

app.use('/', express.static(path.join(__dirname, 'public')));
app.get('/exit', (req, res) => {
	res.end();
	log('Thing closing...');
	server.close();
});
var clientLibs = {
	'jquery': 'node_modules/jquery/dist/jquery'
};
var libsFolder = rootPath + 'public/js/lib/';
if (!fs.existsSync(libsFolder)){
    fs.mkdirSync(libsFolder);
}
Object.keys(clientLibs).some((k) => {
	var src = rootPath + clientLibs[k];
	var dest = libsFolder + k;
	log(src);
	log(dest);
	fs.symlink(src + '.js', dest + '.js', ef);
	fs.symlink(src + '.min.js', dest + '.min.js', ef);
});

var server = app.listen(PORT, () => log('Example app listening on port ' + PORT + '!'))

const opn = require('opn');
opn('', {app: ['chrome', /*'--new-window --app=' +*/ 'http://127.0.0.1:' + PORT]});
