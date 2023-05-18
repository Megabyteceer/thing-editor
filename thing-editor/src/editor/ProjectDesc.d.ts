import { KeyedMap } from "thing-editor/src/editor/env"

type ProjectOrientation = "landscape" | "portrait" | "auto"

declare interface ProjectDesc {

	defaultFont: string;
	screenOrientation: ProjectOrientation;
	width: number;
	height: number;
	portraitWidth: number;
	portraitHeight: number;
	renderResolution: number;
	renderResolutionMobile: number;
	framesSkipLimit: number;
	dynamicStageSize: boolean;
	preventUpscale: boolean;
	webfontloader: {
		google: {
			families: string[]
		};
		timeout: number
	} | null,
	fontHolderText: string,
	mipmap: false,
	version: string,
	soundFormats: string[],
	soundDefaultBitrate: number,
	soundBitrates: {
	},
	loadOnDemandSounds: {
	},
	loadOnDemandTextures: {
	},
	__loadOnDemandTexturesFolders: {

	},
	defaultMusVol: number,
	defaultSoundsVol: number,
	embedLocales: true,
	__localesNewKeysPrefix: string,
	__externalTranslations: [],
	autoFullscreenDesktop: false,
	autoFullscreenMobile: false,
	__proxyFetchesViaNodeServer: false,
	__group: string,
	__webpack: {
		debug: string,
		production: string
	},
	jpgQuality: number,
	pngQuality: number[],
	[key: string]: any;
}

