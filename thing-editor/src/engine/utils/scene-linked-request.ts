import type { Container } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';
import SceneLinkedPromise from '../lib/assets/___system/scene-linked-promise.c';

const hooks:SceneLinkedRequestHook[] = [];

export type SceneLinkedRequestHook = (url: string, resultFormat: 'json' | 'text' | 'blob' | 'arrayBuffer', options?: RequestInit) => (Promise<void> | undefined);

export default class SceneLinkedRequest {

	static addHook(hook: SceneLinkedRequestHook) {
		hooks.push(hook);
	}

	static fetch(owner: Container, url: string, resultFormat: ('json' | 'text' | 'blob' | 'arrayBuffer') = 'json', options?: RequestInit, attempts = 1) {
		let destroyed = false;
		assert(owner, 'Request\'s owner display object should be provided.', 10062);
		assert(url, 'Request\'s URL should be provided.', 10063);
		let ret = SceneLinkedPromise.promise(async (resolve, reject) => {
			let delay = 1000;
			if (hooks.length) {
				await Promise.all(hooks.map(hook => hook(url, resultFormat, options)));
			}
			while (attempts > 0 && !destroyed) {
				await fetch(url, options)
					.then((response) => (response as any)[resultFormat]())
					.then((res) => {
						attempts = 0;
						resolve(res);
					}).catch((er) => {
						attempts--;
						if (attempts === 0) {
							if (reject) {
								reject(er);
							}
						}
					});
				await new Promise((resolve) => { window.setTimeout(resolve, delay); });
				delay += 1000;
			}
		}, owner);
		ret.name = 'Request: ' + url;
		ret.finally(() => {
			destroyed = true;
		});
		return ret;
	}
}
