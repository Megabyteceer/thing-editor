function toggleDevTools() {
	thingEditorServer.fs('fs/toggleDevTools');
}

window.addEventListener('error', toggleDevTools);
