
import A from "./a.ts";
import B from "./b.ts";
import "./index.d.ts";

const thingEditorServer:ThingEditorServer = window.thingEditorServer;

let c: number = 0;
const rnd = Math.random();
console.log(rnd);

let a:A = new A();
let b:B = new B();
a.init();
b.init();

for(let key in thingEditorServer.versions) {
	let e = window.document.getElementById(key + '-version');
	if(e) {
		e.innerText = thingEditorServer.versions[key]();
	}
}

thingEditorServer.fs('fs/saveFile', 'myFile.txt', 'content' + rnd);
let result2 = thingEditorServer.fs('fs/readFile', 'myFile.txt');
console.log(result2);

setInterval(() => {
	console.log(c++);
	document.body.innerHTML += c + '<br>';
}, 1000);

window.addEventListener('keydown', (ev) => {
	if(ev.code === 'F5') {
		window.location.reload();
	}
});