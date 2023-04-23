
type ThingEditorServer = {
	fs:(comand: 'fs/saveFile' | 'fs/readFile', filename: string, content?:string) => Uint8Array | undefined
}
interface Window {
	thingEditorServer: ThingEditorServer
}
