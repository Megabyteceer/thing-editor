import type { ComponentChild, ComponentChildren } from 'preact';
import type { FileDesc, LibInfo } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';

const libIconCache: Map<LibInfo, ComponentChild> = new Map();

const LIB_HOLDER = R.span({ className: 'empty-lib-holder' });

const libIcon = (libInfo: LibInfo): ComponentChildren => {
	if (!libIconCache.has(libInfo)) {
		libIconCache.set(libInfo, R.icon('lib' + (libInfo.libNum % 5)));
	}
	return libIconCache.get(libInfo);
};

const libInfo = (file: FileDesc): ComponentChildren => {
	if (file.lib) {
		if (!file.libInfoCache) {
			const libInfo = file.lib;
			const icon = libIcon(libInfo);
			file.libInfoCache = R.span({
				className: 'lib-info',
				title: libInfo.name
			},
				icon
			);
		}
		return file.libInfoCache;
	} else {
		return LIB_HOLDER;
	}
};

export default libInfo;
export { libIcon };
