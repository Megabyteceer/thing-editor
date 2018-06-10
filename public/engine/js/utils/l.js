// internationalisation
// usage  L('TEXT_ID');
// usage  L('TEXT_ID', val); //val - will replace '%%' entry in result string. Useful fo localised templates.

let currentLanguageTable = {};
let languages = {};
let currentLanguageId = 'en';

function L(id, val1 = undefined, val2 = undefined) { //val1 - replaces '%%' entry; val2 - replaces '$$' entry
	
	let ret = currentLanguageTable.hasOwnProperty(id) ? currentLanguageTable[id] : id;
	if(typeof val1 !== 'undefined') {
		ret = ret.replace('%%', val1);
		if(typeof val2 !== 'undefined') {
			ret = ret.replace('$$', val2);
		}
	}
	return ret;
}

L.setLanguagesAssets = (_languages, defaultLanguage) => {
	languages = _languages;
	defaultLanguage = defaultLanguage || (location.hash.replace('#','')) || currentLanguageId;
	currentLanguageId = null;
	setCurrentLanguage(defaultLanguage);
};

function setCurrentLanguage(languageId) {
	if (currentLanguageId !== languageId) {
		currentLanguageId = languageId;
		if (languages.hasOwnProperty(languageId)) {
			currentLanguageTable = languages[languageId];
		} else {
			currentLanguageTable = languages['en'];
		}
		L.fefreshAllTextEwerywhere();
	}
	
}

L.fefreshAllTextEwerywhere = function fefreshAllTextEwerywhere() {
	game.forAllChildrenEwerywhere(refreshTranslantableText);
}

function refreshTranslantableText(o) {
	if(o.onLanguageChanged) {
		o.onLanguageChanged();
	}
}

L.getCurrentLanguageId = () => {
	return currentLanguageId;
};

L.getLanguagesList = () => {
	return Object.keys(languages);
};

L.setCurrentLanguage = setCurrentLanguage;

///#if EDITOR
L.__getTextAssets = () => {
	return languages;
}


///#endif


export default L;