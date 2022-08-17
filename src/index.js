const OPTIONS = new Map()
const IS_CLIENT = !IsDuplicityVersion()

const path = require('path')

let base64
if (IS_CLIENT) {
	base64 = require('js-base64')
}

let isFxDK = false
if (!IS_CLIENT) {
	isFxDK = GetConvarInt("sv_fxdkMode", 0) == 1
}

const SourceMapConsumer = require('source-map').SourceMapConsumer

const sourceMapConsumerCache = new Map()
const currentResourceName = GetCurrentResourceName()

const RegEx = {
	resourceRelativeFileName: new RegExp(`(.*)${currentResourceName}[^(\\\\|\\\/)]*[\\\\|\\\/]`),
	sourceMappingURL: /(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/mg,
	sourceMappingURLBase64: /.+(data:application\/json;base64,)/m,
	sourceMappingURLCut: /.+(# ? +sourceMappingURL=)/m,
	evalOrigin: /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/,
	evalOriginRecursive: /^eval at ([^(]+) \((.+)\)$/
}

function isResourceFileNameValid(fileName) {
	return RegEx.resourceRelativeFileName.test(fileName)
}

function getFileRelativePath(fileName) {
	const resourceFilePath = fileName.replace(RegEx.resourceRelativeFileName, '')
	return resourceFilePath
}

function getResourcesDir() {
	return isFxDK ? '../../' : 'resources'
}

function getSubDir() {
	return OPTIONS.get('resourceSubDir') || ''
}

function getResourceAbsolutePath() {
	return path.join(getResourcesDir(), getSubDir(), currentResourceName)
}

function getFileAbsolutePath(fileName) {
	return path.join(getResourceAbsolutePath(), getFileRelativePath(fileName))
}

function readResourceFile(fileName) {
	if (!isResourceFileNameValid(fileName)) {
		return false
	}

	let file = false

	try {
		if (IS_CLIENT) {
			const filePath = getFileRelativePath(fileName)
			file = LoadResourceFile(currentResourceName, filePath)
		} else {
			const filePath = getFileAbsolutePath(fileName)
			file = fs.readFileSync(filePath, { encoding: 'utf-8' })
		}
	} catch (err) {}

	return file
}

function matchSourceMappingURL(bufferString) {
	const matches = bufferString.match(RegEx.sourceMappingURL)

	if (!matches) {
		return false
	}

	// get only last match in buffer
	const lastMatch = matches[matches.length - 1]

	return lastMatch
}

function parseSourceMap(fileName) {
	const fileBuffer = readResourceFile(fileName)

	if (!fileBuffer) {
		return false
	}

	const sourceMappingURL = matchSourceMappingURL(fileBuffer)
	if (!sourceMappingURL) {
		return false
	}

	let sourceMap = false

	try {
		if (RegEx.sourceMappingURLBase64.test(sourceMappingURL)) {
			// Parse source-map from Base64

			// Cut url data from string and leave only encoded source-map data
			const sourceMapBase64 = sourceMappingURL.replace(RegEx.sourceMappingURLBase64, '')

			if (IS_CLIENT) {
				// Using js-base64 package (for bundle include) to decode on client
				const sourceMapString = base64.fromBase64(sourceMapBase64)
				sourceMap = JSON.parse(sourceMapString)
			} else {
				// Using node-native way to decode source-map
				const sourceMapBuffer = Buffer.from(sourceMapBase64, 'base64')
				const sourceMapString = sourceMapBuffer.toString('utf-8')
				sourceMap = JSON.parse(sourceMapString)
			}
		} else {
			// Parse source-map from a separate file

			if (IS_CLIENT) {
				// Unavailable on client due to file system
				return false
			}

			// Transform original .js file path to .js.map file path
			let sourceMapRelativePath = sourceMappingURL.replace(RegEx.sourceMappingURLCut, '')
			sourceMapRelativePath = path.join(path.dirname(fileName), sourceMapRelativePath)

			// Read file and parse json
			const sourceMapFile = readResourceFile(sourceMapRelativePath)
			sourceMap = JSON.parse(sourceMapFile)
		}
	} catch (err) {}

	return sourceMap
}

function nativeFormatCallSite(callSite, extraInfo) {
	const fileName = extraInfo ? extraInfo.fileName && extraInfo.fileName : callSite.getFileName()
	let fileLocation = ""

	if (callSite.isNative()) {
		fileLocation = "native"
	} else {
		if (!fileName && callSite.isEval()) {
			fileLocation = callSite.getEvalOrigin()
			fileLocation += ", ";  // Expecting source position to follow.
		}

		if (fileName) {
			fileLocation += fileName
		} else {
			// Source code does not originate from a file and is not native, but we
			// can still get the source position inside the source string, e.g. in
			// an eval string.
			fileLocation += "<anonymous>"
		}

		const lineNumber = extraInfo ? extraInfo.lineNumber && extraInfo.lineNumber : callSite.getLineNumber()

		if (lineNumber != null) {
			fileLocation += ":" + lineNumber

			const columnNumber = extraInfo ? extraInfo.columnNumber && extraInfo.columnNumber : callSite.getColumnNumber()

			if (columnNumber) {
				fileLocation += ":" + columnNumber
			}
		}
	}

	let line = "";

	const functionName = callSite.getFunctionName()
	const isConstructor = callSite.isConstructor()
	const isMethodCall = !(callSite.isToplevel() || isConstructor)

	let addSuffix = true;

	if (isMethodCall) {
		let typeName = callSite.getTypeName();

		// Fixes shim to be backward compatable with Node v0 to v4
		if (typeName === "[object Object]") {
			typeName = "null"
		}

		const methodName = callSite.getMethodName()

		if (functionName) {
			if (typeName && functionName.indexOf(typeName) != 0) {
				line += typeName + "."
			}

			line += functionName

			if (methodName && functionName.indexOf("." + methodName) != functionName.length - methodName.length - 1) {
				line += " [as " + methodName + "]"
			}
		} else {
			line += typeName + "." + (methodName || "<anonymous>")
		}
	} else if (isConstructor) {
		line += "new " + (functionName || "<anonymous>")
	} else if (functionName) {
		line += functionName
	} else {
		line += fileLocation
		addSuffix = false
	}

	if (addSuffix) {
		line += " (" + fileLocation + ")"
	}

	return line
}

function getEvalOriginPosition(origin) {
	let match = origin.match(RegEx.evalOrigin)

	if (match) {
		return {
			source: match[2],
			line: +match[3],
			column: match[4] - 1
		}
	}

	match = origin.match(RegEx.evalOriginRecursive)

	if (match) {
		return getEvalOriginPosition(match[2])
	}

	return false
}

function stringifyCallSite(callSite) {
	let fileName = callSite.getFileName()

	let lineNumber = callSite.getLineNumber()
	let columnNumber = callSite.getColumnNumber()

	if (callSite.isEval()) {
		const evalSite = getEvalOriginPosition(callSite.getEvalOrigin())

		if (evalSite) {
			fileName = evalSite.source
			lineNumber = evalSite.line
			columnNumber = evalSite.column
		}
	}

	try {
		if (isResourceFileNameValid(fileName)) {
			const originalFilePath = fileName

			const relativePath = getFileRelativePath(fileName)
			fileName = path.join(currentResourceName, relativePath)

			if (!sourceMapConsumerCache.get(fileName)) {
				const sourceMap = parseSourceMap(fileName)

				if (sourceMap) {
					const sourceMapConsumer = new SourceMapConsumer(sourceMap)
					sourceMapConsumerCache.set(fileName, sourceMapConsumer)
				}
			}

			const sourceMapConsumer = sourceMapConsumerCache.get(fileName)

			if (sourceMapConsumer) {
				const position = sourceMapConsumer.originalPositionFor({
					line: lineNumber, column: columnNumber
				})

				if (position.source && position.line) {
					// transform original file path to the source file path
					if (OPTIONS.get('filePathReduce')) {
						fileName = path.join(fileName, position.source)
					} else {
						fileName = path.join(path.dirname(originalFilePath), position.source)
					}

					// assign line and column from source file
					lineNumber = position.line
					columnNumber = position.column
				}
			}

			if (OPTIONS.get('filePathReduce')) {
				fileName = '@' + fileName
			}
		}
	} catch (err) {}

	const callSiteString = nativeFormatCallSite(callSite, { fileName, lineNumber, columnNumber })

	return `    at ${callSiteString}`
}

function prepareStackTrace(error, stackTrace) {
	const errorMessage = `${(error.name ? error.name : 'Error')}: ${error.message ? error.message : ''}`

	const modifiedStackTrace = []

	for (let i = 0; i < stackTrace.length; i++) {
		const callSite = stackTrace[i]

		if (!callSite) {
			continue
		}

		if (callSite.isNative()) {
			continue
		}

		const stringTrace = stringifyCallSite(callSite)

		if (stringTrace) {
			modifiedStackTrace.push(stringTrace)
		}
	}

	return `${errorMessage}\n${modifiedStackTrace.join('\n')}`
}

function inject(options) {
	if (options && options.subdir && typeof options.subdir == 'string') {
		OPTIONS.set('resourceSubDir', options.subdir)
	}

	if (!IS_CLIENT && options) {
		OPTIONS.set('filePathReduce', !!options.filePathReduce)
	}

	Error.prepareStackTrace = prepareStackTrace
}

const plugin = { inject }

if (IS_CLIENT) {
	plugin.inject()
}

if (module && module.exports) {
	module.exports = plugin
}
