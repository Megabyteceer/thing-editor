type FileDesc = {
	/** file name*/
	name:string,
	/** modification time*/
	mTime:number
};

type FSCallback = Uint8Array | undefined | FileDesc[];

type ThingEditorServer = {
	fs:(comand: string, filename?: string, content?:string) => FSCallback,
	versions: {[key:string]:string}
}

interface Window {
	thingEditorServer: ThingEditorServer
}
