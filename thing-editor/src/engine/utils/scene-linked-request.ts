import { Container } from "pixi.js";
import assert from "thing-editor/src/engine/debug/assert";
import SceneLinkedPromise from "../lib/assets/___system/scene-linked-promise.c";



export default class SceneLinkedRequest {

	static fetch(owner: Container, url: string, resultFormat: ('json' | 'text' | 'blob' | 'arrayBuffer') = "json", options?: RequestInit) {
		assert(owner, "Request's owner display object should be provided.", 10062);
		assert(url, "Request's URL should be provided.", 10063);
		let ret = SceneLinkedPromise.promise((resolve, reject) => {
			fetch(url, options)
				.then((response) => (response as any)[resultFormat]()).then(resolve).catch(reject);
		}, owner);
		ret.name = "Request: " + url;
		return ret;
	}
}