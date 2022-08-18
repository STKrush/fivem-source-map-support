## Information
<sup>**Writed from scratch, but some of code based on [node-source-map-support](https://github.com/evanw/node-source-map-support)**</sup>
<br />
<br />
This package provides ability to use JavaScript (e.g. TypeScript) source-maps both on server and client-side.\
**FxDK** is supported too.\
<br />
> **Note**<br />
> Package was not tested on at least a little bit large project (because i don't have one), so i would appreciate any information on how this works for you.

## Installation and usage
Install package
```
$ npm install fivem-source-map-support
```
or
```
$ yarn add fivem-source-map-support
```
Then put this code somewhere in your project:
```js
import SourceMapSupport from 'fivem-source-map-support'
SourceMapSupport.inject()

// or

require("fivem-source-map-support").inject()
```
Please, note few things:
* This way of injecting will **NOT** work on **client-side** without **module bundler** because of lack import/export API.
* If your project builds with a module bundler (**esbuild** for e.g.) into single file, everything will work even on the **client-side**.
* On **server-side** you can use package in both ways, with module bundler and without.

### Manual usage
You can manually use package on client-side ignoring just mentioned way:
1. Install package or get one from [Releases](https://github.com/STKrush/fivem-source-map-support/releases/latest) page
2. Get **bundle.js** from ```node_modules/fivem-source-map-support/dist``` or from archive (if you downloaded release)
3. Put bundle into your **resource** folder and rename if you want to (e.g. ```fivem-sourcemap.js```)
4. Add **client_script** in **fxmanifest.lua** on top of other scripts:
```lua
client_script "fivem-sourcemap.js"
```
*Package will be injected automatically, no additional code required.*
<br />
<br />
## Tricks
For some tricky annoying reason, if your resource located in sub-directory of **resources** folder, for example, not ```resources/your-resource``` but ```resources/[core]/your-resource```, you need to help package to locate directory:
```js
import SourceMapSupport from 'fivem-source-map-support'
SourceMapSupport.inject({ subdir: '[core]' })

// or

require('fivem-source-map-support').inject({ subdir: '[core]' })
```
*Doesn't make sense on **client-side**.*
<br />
<br />
## Limitations
**Client-side** supports **only** inline source-maps. Maps that placed in separate files will not be readed.
