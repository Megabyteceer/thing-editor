const { BrowserWindow } = require('electron');
const appConfig = require('electron-settings');

const IS_CI_RUN = process.env.IS_CI_RUN === 'true';

module.exports = function getPositionRestoreWindow(windowState, id) {
	const stateId = 'windowPosition-' + id;

	if (appConfig.has(stateId)) {
		windowState = Object.assign({}, appConfig.get(stateId), windowState);
	}

	const window = new BrowserWindow(windowState);

	if (IS_CI_RUN) {
		window.minimize();
	} else {
		if (windowState.isMaximized) {
			window.maximize();
		}
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
