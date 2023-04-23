
import A from "./a.ts";
import B from "./b.ts";
import "./index.d.ts";

const thingEditorServer:ThingEditorServer = window.thingEditorServer;

setInterval(() => {
	console.log(c++);

}, 1000);


let c: number = 0;
const rnd = Math.random();
console.log(rnd);

let a:A = new A();
let b:B = new B();
a.init();
b.init();

thingEditorServer.fs('fs/saveFile', 'myFile.txt', 'content' + rnd);
let result2 = thingEditorServer.fs('fs/readFile', 'myFile.txt');
console.log(result2);

setInterval(() => {
	console.log(c++);

}, 1000);

