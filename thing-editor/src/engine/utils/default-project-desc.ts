import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";

const defaultProjectDesc: ProjectDesc = {
	defaultFont: 'Arial',
	screenOrientation: "landscape",
	width: 1280,
	height: 720,
	portraitWidth: 408,
	portraitHeight: 720,
	renderResolution: 1,
	renderResolutionMobile: 1,
	framesSkipLimit: 4,
	dynamicStageSize: false,
	preventUpscale: false,
	webfontloader: null,
	fontHolderText: 'ЯSфz',
	mipmap: false,
	version: "0.0.1",
	soundFormats: [
		"ogg",
		"aac"
	],
	soundDefaultBitrate: 96,
	soundBitrates: {
	},
	loadOnDemandSounds: {
	},
	loadOnDemandTextures: {
	},
	__loadOnDemandTexturesFolders: {

	},
	defaultMusVol: 1,
	defaultSoundsVol: 1,
	embedLocales: true,
	__localesNewKeysPrefix: '',
	__externalTranslations: [],
	autoFullscreenDesktop: false,
	autoFullscreenMobile: false,
	__proxyFetchesViaNodeServer: false,
	__group: '',
	__webpack: {
		debug: 'config/webpack.debug.js',
		production: 'config/webpack.prod.js'
	},
	jpgQuality: 95,
	pngQuality: [0.95, 1]
};

export default defaultProjectDesc;