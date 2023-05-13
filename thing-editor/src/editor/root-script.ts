function toggleDevTools() {
	thingEditorServer.fs('fs/toggleDevTools');
}

window.addEventListener('error', toggleDevTools);

window.addEventListener('keydown', (ev) => {
	if(ev.code === 'F5') {
		window.location.reload();
	} else if(ev.code === 'F12') {
		toggleDevTools();
	}
});