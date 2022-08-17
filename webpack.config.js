module.exports = {
	mode: 'production',
	entry: './src/index.js',

	output: {
		path: __dirname,
		filename: './dist/bundle.js',
		library: {
			type: "commonjs2"
		}
	},

	resolve: {
		alias: {
			path: 'path-browserify'
		}
	}
}
