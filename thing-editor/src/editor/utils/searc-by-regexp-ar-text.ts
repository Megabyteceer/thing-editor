function searchByRegexpOrText(source: string, query: string) {
	if(!query) return true;
	try {
		return source.search(query) >= 0;
	} catch(er) {
		return source.indexOf(query) >= 0;
	}
}

export { searchByRegexpOrText };
