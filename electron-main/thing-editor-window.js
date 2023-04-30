const { BrowserWindow } = require('electron');
const appConfig = require('electron-settings');

module.exports = class WindowPositionRestoreWindow extends BrowserWindow {

	constructor(windowState, id) {
		const stateId = "windowPosition-" + id;

		if (appConfig.has(stateId)) {
			windowState = Object.assign({}, appConfig.getSync(stateId), windowState);
		}

		super(windowState);
		if (windowState.isMaximized) {
			this.maximize();
		}
		const saveWindowPos = (ev) => {
			let windowState = this.getBounds();
			windowState.isMaximized = this.isMaximized();
			appConfig.set(stateId, windowState);
		};

		this.on("moved", saveWindowPos);
		this.on("maximize", saveWindowPos);
		this.on("resized", saveWindowPos);
	}
}