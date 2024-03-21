const { BrowserWindow } = require('electron');
const appConfig = require('electron-settings');

module.exports = function getPositionRestoreWindow(windowState, id) {
	const stateId = 'windowPosition-' + id;

	if (appConfig.has(stateId)) {
		windowState = Object.assign({}, appConfig.getSync(stateId), windowState);
	}

	const window = new BrowserWindow(windowState);

	if (windowState.isMaximized) {
		window.maximize();
	}

	const saveWindowPos = () => {
		const windowState = window.getBounds();
		windowState.isMaximized = window.isMaximized();
		appConfig.set(stateId, windowState);
	};

	window.on('moved', saveWindowPos);
	window.on('maximize', saveWindowPos);
	window.on('resized', saveWindowPos);

	saveWindowPos();

	return window;
};
