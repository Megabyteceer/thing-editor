

const defaultProjectDesc: ProjectDesc = {
	id: '',
	title: '',
	icon: '',
	mainScene: 'main',
	dir: '',
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
	webfontloader: {
		google: {
			families: []
		},
		timeout: 6000
	},
	fontHolderText: 'ЯSфz',
	mipmap: false,
	version: "0.0.1",
	soundFormats: [
		"ogg",
		"aac"
	],
	soundDefaultBitrate: 96,
	soundBitRates: {
	},
	loadOnDemandSounds: {
	},
	loadOnDemandTextures: {
	},
	__loadOnDemandTexturesFolders: {

	},
	defaultLanguage: 'en',
	defaultMusVol: 1,
	defaultSoundsVol: 1,
	embedLocales: true,
	__localesNewKeysPrefix: '',
	autoFullScreenDesktop: false,
	autoFullScreenMobile: false,
	__proxyFetchesViaNodeServer: false,
	__group: '',
	__webpack: {
		debug: 'config/webpack.debug.js',
		production: 'config/webpack.prod.js'
	},
	__suspendWarnings: [],
	libs: []
};

export default defaultProjectDesc;