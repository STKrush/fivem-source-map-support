# FiveM Source Map Support

## Information
This package provides ability to use JavaScript (e.g. TypeScript) source-maps both on server and client-side.\
**FxDK** is supported too.\
\
Note: Code was not tested on at least a little bit large project (because i don't have one), so i would appreciate any information on how this works for you.
<br />

## Usage
Install package
```
$ npm install fivem-source-map-support
```
or
```
$ yarn add fivem-source-map-support
```
Then put this code somewhere in your project:
```ts
import SourceMapSupport from 'fivem-source-map-support'
SourceMapSupport.inject()

// or

require("fivem-source-map-support").inject()
```
**Note** that this way of injecting **WILL NOT** work on **client-side** without **module bundler** because of lack import/export API.\
If your project builds with a module bundler (**esbuild** for e.g.) into single file, everything will work even on the **client-side**.
<br />
<br />
You can manually use package on client-side ignoring inject-code way:
1. Install package
2. Get **bundle.js** from ```node_modules/fivem-source-map-support/dist```
3. Put bundle into your **resource** folder and rename if you want to (e.g. ```fivem-sourcemap.js```)
4. Add **client_script** in **fxmanifest.lua** on top of other scripts
```lua
client_script "fivem-sourcemap.js"
```
Package will be injected automatically, no additional code required.
<br />
<br />
## Tricks
For some tricky annoying reason, if your resource located in sub-directory of **resources** folder, for example, not **resources/your-resource** but **resources/[core]/your-resource**, you need to help package to locate directory:
```js
require('fivem-source-map-support').inject({ subdir: '[core]' })
```
*Doesn't make sense on **client-side**.*
## Limitations
**Client-side** supports **only** inline source-maps. Maps that placed in separate files will not be readed.
