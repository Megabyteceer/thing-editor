type ThingEditorServer = {
	fs:(comand: string, filename?: string, content?:string) => Uint8Array | undefined,
	versions: {[key:string]:string}
}

interface Window {
	thingEditorServer: ThingEditorServer
}
