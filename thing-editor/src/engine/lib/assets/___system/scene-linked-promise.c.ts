import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { getCurrentStack, showStack } from 'thing-editor/src/editor/utils/stack-utils';
import assert from 'thing-editor/src/engine/debug/assert';
import game, { PRELOADER_SCENE_NAME } from 'thing-editor/src/engine/game';
import { constructRecursive } from 'thing-editor/src/engine/lib';
import Pool from 'thing-editor/src/engine/utils/pool';

const EMPTY_RESULT_SYMBOL = {};
let promiseIDCounter = 0;

/**
	### single promise
```
	SceneLinkedPromise.promise((resolve, reject, promise) => {
		resolve(data);
	}, owner).then((data) => {

	}).catch((error) => {

	}).finally(() => {

	});
```
	### list of promises
```
	SceneLinkedPromise.all([promise, promise], owner). then((dataArray) => {

	});
```
### resolved promise
```
	SceneLinkedPromise.resolve(result);
```
*/

export default class SceneLinkedPromise extends Container {

	static promise(handler: (resolve: (result: any) => void, reject?: (result: any) => void, promise?: SceneLinkedPromise) => void, container?: Container) {
		assert(!game.__EDITOR_mode, 'Attempt to create SceneLinkedPromise.promise() in editing mode.', 10057);
		if (!container) {
			container = game.currentContainer || game.currentFader;
		}
		let promise = Pool.create(SceneLinkedPromise);
		/// #if EDITOR
		constructRecursive(promise);
		/// #endif
		container.addChild(promise);
		if (container === game.currentFader || ((container === game.currentScene) && (container.name === PRELOADER_SCENE_NAME))) {
			promise.loadingAdded = true;
			game.loadingAdd(promise);
		} else {
			promise.loadingAdded = false;
		}
		/// #if EDITOR
		promise.throttlingDelay = Math.round(Math.random() * 15);
		promise.name = 'Promise: ' + (handler.name || 'anonymous function');
		promise.___stack = getCurrentStack('SceneLinkedPromise');
		/// #endif
		promise._promiseWaitForResult = true;
		let promiseId = promiseIDCounter++;
		promise._promiseId = promiseId;

		handler(
			(data) => {
				if (promise._promiseId === promiseId) {
					promise.resolve(data);
				}
			},
			(error) => {
				if (promise._promiseId === promiseId) {
					assert(promise._promiseResultWaiting === EMPTY_RESULT_SYMBOL, 'SceneLinkedPromise is resolved already.', 10058);
					assert(promise._promiseErrorWaiting === EMPTY_RESULT_SYMBOL, 'SceneLinkedPromise is rejected already.', 10059);
					assert(promise._rejectHandlers.length, 'Unhandled SceneLinkedPromise rejection.', 99999);
					promise._promiseErrorWaiting = error;
				}
			}, promise);

		return promise;
	}

	static resolve(data: any, container?: Container) {
		return SceneLinkedPromise.promise((r) => {
			r(data);
		}, container);
	}

	static all(promises: SceneLinkedPromise[], container = game.currentContainer) {
		let results: any[] | null = [];
		let count = promises.length;
		return SceneLinkedPromise.promise((resolve: (result: any) => void, reject?: (result: any) => void, promise?: SceneLinkedPromise) => {
			promises.forEach((p, i) => {
				assert(p instanceof SceneLinkedPromise, 'SceneLinkedPromise expected', 10060);
				promise!.addChild(p);
				p.then((data: any) => {
					results![i] = data;
				});
				p.catch((error: any) => {
					results = [];
					results[i] = error;
					reject!(results);
					results = null;
				});
				p.finally(() => {
					assert(count > 0, 'SceneLinkedPromise.all has more resolves that expected.');
					count--;
					if (count === 0) {
						if (results) {
							resolve(results);
						}
					}
				});
			});

		}, container);
	}


	@editable({ name: '___stack', type: 'ref', onClick: showStack })

	_promiseWaitForResult = false;
	_promiseId = -1;

	_rejectHandlers: ((result?: any) => any)[] = [];
	_resolveHandlers: ((result?: any) => any)[] = [];
	_finallyHandlers: ((result?: any) => any)[] = [];

	visible = false;
	_promiseResultWaiting = EMPTY_RESULT_SYMBOL;
	_promiseErrorWaiting = EMPTY_RESULT_SYMBOL;

	loadingAdded = false;

	/// #if EDITOR
	throttlingDelay = 0;
	/// #endif

	/// #if DEBUG
	___stack: any;
	__passedHandlersDebug: { handler: ((result?: any) => any); currentResult: any }[] = [];
	/// #endif

	onRemove() {
		super.onRemove();
		/// #if EDITOR
		if (!game.__EDITOR_mode && game.__time) { // game stopping - time = 0;
			if (this._promiseWaitForResult) {
				game.editor.ui.status.warn('SceneLinkedPromise was removed before its resolved or rejected.', 10061, this);
			}
		}
		/// #endif

		if (this._promiseWaitForResult) {
			this._promiseWaitForResult = false;
			this._handleFinally();
		}

		this._promiseId = -1;
		this._rejectHandlers.length = 0;
		this._resolveHandlers.length = 0;
		this._finallyHandlers.length = 0;
		this._promiseResultWaiting = EMPTY_RESULT_SYMBOL;
		this._promiseErrorWaiting = EMPTY_RESULT_SYMBOL;
	}

	resolve(data: any) {
		assert(this._promiseResultWaiting === EMPTY_RESULT_SYMBOL, 'SceneLinkedPromise is resolved already.', 10058);
		assert(this._promiseErrorWaiting === EMPTY_RESULT_SYMBOL, 'SceneLinkedPromise is rejected already.', 10059);
		this._promiseResultWaiting = data;
	}

	then(handler: (result: any) => any) {
		assert(this._promiseWaitForResult, 'Promise is already finished.', 10073);
		this._resolveHandlers.push(handler);
		return this;
	}

	catch(handler: (result: any) => any) {
		assert(this._promiseWaitForResult, 'Promise is already finished.', 10073);
		this._rejectHandlers.push(handler);
		return this;
	}

	finally(handler: (result: any) => any) {
		assert(this._promiseWaitForResult, 'Promise is already finished.', 10073);
		this._finallyHandlers.push(handler);
		return this;
	}

	constructor() {
		super();
		assert(arguments.length === 0, 'Please use SceneLinkedPromise.promise((resolve, reject) => {}), instead of \'new SceneLinkedPromise\'');
	}

	_handleFinally() {
		/// #if DEBUG
		let id = this._promiseId;
		let errorTimeout = window.setTimeout(() => {
			if (id === this._promiseId) {
				this._turnPromiseRejected('Exception in SceneLinkedPromise finally handler.');
			}
			game._reanimateTicker();
		});

		/// #endif
		while (this._finallyHandlers.length > 0) {
			/// #if DEBUG
			(this._finallyHandlers.shift()!)();
			continue;
			/// #endif

			try { // eslint-disable-line no-unreachable
				(this._finallyHandlers.shift()!)();
			} catch (err) { // eslint-disable-line no-empty
				window.setTimeout(() => {
					throw (err);
				}, 0);
				this._turnPromiseRejected(err); // eslint-disable-line no-unreachable
				return;
			}
		}
		/// #if DEBUG
		clearTimeout(errorTimeout);
		/// #endif
		this._promiseWaitForResult = false;
		if (this.loadingAdded) {
			game.loadingRemove(this);
			this.loadingAdded = false;
		}
	}

	_turnPromiseRejected(err: any) {
		if (this._promiseErrorWaiting === EMPTY_RESULT_SYMBOL) {
			this._resolveHandlers.length = 0;
			this._promiseResultWaiting = EMPTY_RESULT_SYMBOL;
			this._promiseErrorWaiting = err;
		}
	}

	update() {
		/// #if EDITOR
		if (this.throttlingDelay > 0) {
			this.throttlingDelay--;
			return;
		}
		/// #endif

		if (this._promiseErrorWaiting !== EMPTY_RESULT_SYMBOL) {
			let r = this._promiseErrorWaiting;
			/// #if DEBUG
			this.__passedHandlersDebug = [];

			/// #endif
			if (this._rejectHandlers.length === 0) {
				window.setTimeout(() => {
					console.error('SceneLinkedPromise unhandled rejection.');
					throw r;
				}, 0);
			}
			while (this._rejectHandlers.length > 0) {
				/// #if DEBUG

				let handler = this._rejectHandlers.shift()!;
				let currentResult = handler(r);
				this.__passedHandlersDebug.push({ handler, currentResult });
				if (typeof currentResult !== 'undefined') {
					r = currentResult;
				}
				continue;
				/// #endif

				try { // eslint-disable-line no-unreachable
					let currentResult = (this._rejectHandlers.shift()!)(r);
					if (typeof currentResult !== 'undefined') {
						r = currentResult;
					}
				} catch (err) { // eslint-disable-line no-empty
					if (this._rejectHandlers.length === 0) {
						window.setTimeout(() => {
							throw (err);
						}, 0);
					}
				}
			}
			this._handleFinally();
		} else if (this._promiseResultWaiting !== EMPTY_RESULT_SYMBOL) {

			let r = this._promiseResultWaiting;
			/// #if DEBUG
			this.__passedHandlersDebug = [];

			let id = this._promiseId;
			let errorTimeout = window.setTimeout(() => {
				if (id === this._promiseId) {
					this._turnPromiseRejected('Exception in SceneLinkedPromise handler.');
				}
				game._reanimateTicker();
			});

			/// #endif
			while (this._resolveHandlers.length > 0) {
				/// #if DEBUG
				let handler = this._resolveHandlers.shift()!; //in debug build no catch errors to
				let currentResult = handler(r);
				this.__passedHandlersDebug.push({ handler, currentResult });
				if (typeof currentResult !== 'undefined') {
					r = currentResult;
				}
				continue;
				/// #endif

				try { // eslint-disable-line no-unreachable
					let currentResult = (this._resolveHandlers.shift()!)(r);
					if (typeof currentResult !== 'undefined') {
						r = currentResult;
					}
				} catch (err) { // eslint-disable-line no-empty
					if (this._rejectHandlers.length === 0) {
						window.setTimeout(() => {
							throw (err);
						}, 0);
					}

					this._turnPromiseRejected(err); // eslint-disable-line no-unreachable
					return;
				}
			}
			/// #if DEBUG
			clearTimeout(errorTimeout);
			/// #endif

			this._handleFinally();
		}

		super.update();
		if (!this._promiseWaitForResult) {
			this.remove();
		}
	}
}

/// #if EDITOR
SceneLinkedPromise.__EDITOR_icon = 'tree/promise';
/// #endif
