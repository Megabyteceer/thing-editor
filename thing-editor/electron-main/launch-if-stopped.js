import('ps-list').then(async (psList) => {

	const path = require('path');
	const child_process = require('child_process');

	const isWin = process.platform === 'win32';
	const processName = isWin ? 'electron.exe' : 'electron';

	const ps = await psList.default();

	if(!ps.some(p => p.name === processName)) {

		let command = path.join(process.cwd(), './node_modules/.bin/electron');
		if(isWin) {
			command = path.join(process.cwd(), './node_modules/electron/dist/electron.exe');
		}

		let c = child_process.spawn(command,
			[
				"--remote-debugging-port=9223",
				"./thing-editor/electron-main"
			],
			{
				stdio: ['ignore', 'ignore', 'ignore'],
				detached: true,
				windowsHide: false,
				cwd: process.cwd()
			}
		);

		c.on('error', (er) => {
			debugger;
		});

		setTimeout(() => {
			process.exit(0);
		}, 100);
	}
	console.log('electron\nlaunched');
	process.exit(0);
});