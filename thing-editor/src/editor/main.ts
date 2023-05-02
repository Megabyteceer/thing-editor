
import { h, render } from "preact";

import Editor from "./editor";

import fs from "./fs";


window.addEventListener('keydown', (ev) => {

	if(ev.code === 'F5') {
		window.location.reload();
	} else if(ev.code === 'F12') {
		fs.toggleDevTools();
	}
});

render(h(Editor, null), document.body);