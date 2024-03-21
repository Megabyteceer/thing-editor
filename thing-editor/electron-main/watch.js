
const currentWatchers = {};

const chokidar = require('chokidar');


function watchFolders(dirs, onEvent) {

	const _onEvent = (path) => {
		onEvent(path);
	};

	for (let dir in currentWatchers) {
		if (dirs.indexOf(dir) < 0) {
			currentWatchers[dir].close();
			delete currentWatchers[dir];
		}
	}

	for (let dir of dirs) {
		if (!currentWatchers[dir]) {
			const watcher = chokidar.watch(dir, {
				ignoreInitial: true,
				//	awaitWriteFinish: true,
				ignored: /.*___editor_backup_.*|.*(\/|^)~.*/ // ignore backups and ~ started files
			});

			watcher.on('add', _onEvent)
				.on('change', _onEvent)
				.on('unlink', _onEvent);
			currentWatchers[dir] = watcher;
		}
	}
}

module.exports = {watchFolders};
