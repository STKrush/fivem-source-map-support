# FiveM Source Map Support

This package provides ability to use JavaScript (e.g. TypeScript) source-maps both on server and client-side.

## Usage
### Installation via NPM
```
$ npm install fivem-source-map-support
```
or
```
$ yarn add fivem-source-map-support
```
or you can just clone resository and use like that (only on server, client-side requires a bundle).


### Client-side
Clone repository and build a bundle.
```
$ git clone https://github.com/STKrush/fivem-source-map-support.git
$ npm run build
```
Or download one from [**releases**](https://github.com/STKrush/fivem-source-map-support/releases).

## Usage
### Server-side
Add following code at the top in entry point of your project. You can add this line of code to decomplied script (e.g. for TypeScript in the index.ts) aswell.
```js
require('fivem-source-map-support').inject()
```
### Client-side
Put bundle in your resource and add script to **fxmanifest.lua** on very top above other scripts.

## Notes
For some reason, if your resource located in sub-directory of **resources** folder, for example, not **resources/your-resource** but **resources/[test]/your-resource**, you need to help package to locate directory:
```js
require('fivem-source-map-support').inject({ subdir: '[test]' })
```
