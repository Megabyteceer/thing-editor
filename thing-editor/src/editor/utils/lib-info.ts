import { ComponentChild, ComponentChildren } from "preact";
import fs, { FileDesc, LibInfo } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import sp from "thing-editor/src/editor/utils/stop-propagation";

let libInfoCounter = 0;
const libInfoCache: Map<LibInfo, ComponentChild> = new Map();

const libInfo = (file: FileDesc): ComponentChildren => {
	if(file.lib) {
		const libInfo = file.lib;
		if(!libInfoCache.has(libInfo)) {
			libInfoCache.set(libInfo,
				R.span({
					className: 'lib-info',
					onContextMenu: (ev: PointerEvent) => {
						sp(ev);
						showContextMenu([
							{
								name: 'copy file to project',
								onClick: () => {
									fs.copyAssetToProject(file)
								}
							}
						], ev)
					},
					title: "LIBRARY: " + libInfo.name
				},
					R.icon('lib' + (libInfoCounter++ % 5))
				)
			)
		}
		return libInfoCache.get(libInfo);
	}
}

export default libInfo;