import('ps-list').then(async (psList) => {

	const path = require('path');
	const child_process = require('child_process');

	const isWin = process.platform === 'win32';
	const processName = isWin ? 'electron.exe' : 'electron';

	const ps = await psList.default();

	if(!ps.some(p => p.name === processName)) {
		let command = './node_modules/.bin/electron';
		if(isWin) {
			command += '.cmd';
		}
		child_process.exec(path.join(process.cwd(), command) + " --remote-debugging-port=9223 ./thing-editor/electron-main",
			{
				cwd: process.cwd()
			});
	}
	console.log('electron launched.');
});