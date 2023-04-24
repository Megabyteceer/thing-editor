
type ThingEditorServer = {
	fs:(comand: 'fs/saveFile' | 'fs/readFile' | 'fs/toggleDevTools', filename?: string, content?:string) => Uint8Array | undefined,
	versions: {[key:string]:string}
}

interface Window {
	thingEditorServer: ThingEditorServer
}
