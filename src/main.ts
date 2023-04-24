
import { h, render } from "preact";

import Editor, { thingEditorServer } from "./editor.ts";

import "./index.d.ts";

/*
thingEditorServer.fs('fs/saveFile', 'myFile.txt', 'content' + rnd);
let result2 = thingEditorServer.fs('fs/readFile', 'myFile.txt');
let result2 = thingEditorServer.fs('fs/toggleDevTools');
*/

render(h(Editor), document.body);

window.addEventListener('keydown', (ev) => {
	if(ev.code === 'F5') {
		window.location.reload();
	} else if(ev.code === 'F12') {
		thingEditorServer.fs('fs/toggleDevTools');
	}
});