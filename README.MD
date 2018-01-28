# Edgyfy

A shim to make Chromium extensions to run on Edge

## Reserved Namespaces

`window.edge`: Original `window.chrome` if it exists, an empty object otherwise.

`window.elib`: Internal tools for patching Edge APIs.

`window.econfig`: Configuration flags.

## Unpatched Differences

*Note: `triptype` means all of `window.Element.prototype`,
`window.Document.prototype`, and `window.DocumentFragment.prototype`.*

On Edge 40 and below, `triptype.querySelectorAll` will return a modifiable array
instead of a `StaticNodeList`. If your code (tries to) modify a `StaticNodeList`
then chances are your code is bugged.

Polyfilled and patched extension APIs *may* not validate your inputs, it's up
to you to make sure your extension works on Chromium first.

`chrome.webRequest.onBeforeRequest.removeListener` will not work unless you
specifies that your extension is aware of `fetch` type. This function is rarely
used, may be implemented in the future if there is a need for it.

## Configuration

*Note: These configuration flags are under `window.econfig`.*

`dateStripMarks` (Default `true`): When set to true, `\u200E` and `\u200F` are
stripped from return value of `Date.prototype.toLocaleString`.

`fetchAware` (Default `false`): When set to true, listener for
`chrome.webRequest.onBeforeRequest` will no loger be wrapped.
