
const path = require('path');
const child_process = require('child_process');

const isWin = process.platform === 'win32';

let command = path.join(process.cwd(), './node_modules/.bin/electron');
if (isWin) {
	command = path.join(process.cwd(), './node_modules/electron/dist/electron.exe');
}

child_process.spawn(command,
	[
		'--remote-debugging-port=9223',
		'./thing-editor/electron-main',
		'debugger-detection-await'
	],
	{
		stdio: ['ignore', 'ignore', 'ignore'],
		detached: true,
		windowsHide: false,
		cwd: process.cwd()
	}
);
console.log('editor launched');
process.exit(0);
