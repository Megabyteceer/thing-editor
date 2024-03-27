const {exec} = require('child_process');

module.exports = async function (log, enable) {

	const command = 'git update-index --' + (enable ? '' : 'no-') + 'assume-unchanged thing-editor.code-workspace tsconfig.json';
	log(command);

	exec(command, {
		cwd: __dirname + '/../..'
	});
};
