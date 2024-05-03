var vscode = require('vscode');

function activate(_context) {

	let popStackRequired = false;

	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker(session) {
			return {
				onWillReceiveMessage: (m) => {
					//console.log(`,${JSON.stringify(m, undefined, 2)}`);
					session.name;
				},
				onDidSendMessage: (m) => {
					if(m.command === 'stackTrace') {
						const stackFrame = m.body.stackFrames[0];
						if(stackFrame && stackFrame.name && stackFrame.name.endsWith('_thing_editor_debug_helper')) {
							popStackRequired = true;
						}
					} else if(popStackRequired && m.command === 'scopes') {
						popStackRequired = false;
						vscode.commands.executeCommand('workbench.action.debug.callStackDown');
					}
					//console.log(`,${JSON.stringify(m, undefined, 2)}`);
				}
			};
		}
	});
}
exports.activate = activate;

module.exports = {
	activate
};