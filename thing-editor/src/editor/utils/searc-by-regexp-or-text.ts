let lastSearchQuery: string;
let lastSearchRegExp: RegExp;

function searchByRegexpOrText(source: string, query: string) {
	if (!query) return true;
	try {
		let regExp;
		if (lastSearchQuery === query) {
			regExp = lastSearchRegExp;
		} else {
			regExp = new RegExp(query, 'i');
			lastSearchQuery = query;
			lastSearchRegExp = regExp;
		}
		if (source.search(regExp) >= 0) {
			return true;
		}
	} catch (_er) {}
	return source.toLowerCase().indexOf(query.toLowerCase()) >= 0;
}

export { searchByRegexpOrText };
