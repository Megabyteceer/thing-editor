
import { h, render } from "preact";

import Editor from "./editor.ts";

import "./index.d.ts";
import fs from "./fs.ts";

render(h(Editor, null), document.body);

window.addEventListener('keydown', (ev) => {
	if(ev.code === 'F5') {
		window.location.reload();
	} else if(ev.code === 'F12') {
		fs.toggleDevTools();
	}
});