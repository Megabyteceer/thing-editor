// vite dynamic imports broke sourcemaps lines; Thats why import moved to separate file.
const imp = (moduleName: string, version: string | undefined) => {
	if(!version) {
		return import(/* @vite-ignore */ `/${moduleName}.ts`);
	} else {
		return import(/* @vite-ignore */ `/${moduleName}.ts${version}`)
	}
}

export default imp;