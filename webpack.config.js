module.exports = {
	mode: 'production',
	entry: './src/index.js',

	output: {
		path: __dirname,
		filename: './dist/bundle.js',
    	libraryTarget: 'umd',
		globalObject: 'this'
	},

	resolve: {
		alias: {
			path: 'path-browserify'
		}
	}
}
