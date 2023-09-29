import { ComponentChild, ComponentChildren } from "preact";
import fs, { FileDesc, LibInfo } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import sp from "thing-editor/src/editor/utils/stop-propagation";

let libInfoCounter = 0;
const libIconCache: Map<LibInfo, ComponentChild> = new Map();

const LIB_HOLDER = R.span({ className: 'empty-lib-holder' });

const libIcon = (libInfo: LibInfo): ComponentChildren => {
	if(!libIconCache.has(libInfo)) {
		libIconCache.set(libInfo, R.icon('lib' + (libInfoCounter++ % 5)));
	}
	return libIconCache.get(libInfo);
}

const libInfo = (file: FileDesc): ComponentChildren => {
	if(file.lib) {
		if(!file.libInfoCache) {
			const libInfo = file.lib;
			const icon = libIcon(libInfo);
			file.libInfoCache = R.span({
				className: 'lib-info',
				onContextMenu: (ev: PointerEvent) => {
					sp(ev);
					showContextMenu([
						{
							name: 'copy asset to the project',
							onClick: () => {
								fs.copyAssetToProject(file)
							}
						}
					], ev)
				},
				title: "LIBRARY: " + libInfo.name
			},
				icon
			);
		}
		return file.libInfoCache;
	} else {
		return LIB_HOLDER;
	}
}

export default libInfo;
export { libIcon };
