const {exec} = require('child_process');

module.exports = async function (log, enable) {

	const command = 'git update-index --' + (enable ? '' : 'no-') + 'assume-unchanged thing-editor.code-workspace tsconfig.json thing-editor/src/editor/current-scene-typings.d.ts thing-editor/src/editor/prefabs-typing.ts';
	log(command);

	exec(command, {
		cwd: __dirname + '/../..'
	});
};
