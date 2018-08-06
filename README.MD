# Edgyfy

Shim to make Chromium extensions to run on Edge

## Namespaces

`window.edge`: Original `window.chrome` if it exists, an empty object otherwise.

`window.elib`: Tools for patching Edge APIs, mostly internal.

`window.ecfg`: Configuration flags.

## Caveats

*Note: `triptype` means all of `Element.prototype`, `Document.prototype`,
and `DocumentFragment.prototype`.*

The minimum supported Edge version is 40, you still need to work out the
manifest, using `-ms-preload` is recommended:
```JSON
"-ms-preload": {
  "backgroundScript": "edgyfy.js",
  "contentScript": "edgyfy.js"
}
```

If your popup pane is behaving weird, please call `elib.unbreak_popup();`.

`operator []` and `length` are not working for `localStorage`.

Polyfilled and patched extension APIs *may* not validate your inputs, it's up
to you to make sure your extension works on Chromium first.

On Edge 40, `triptype.querySelectorAll` will return a modifiable array instead
of a `StaticNodeList`. If your code (tries to) modify a `StaticNodeList` then
chances are your code is bugged.

`chrome.webRequest.ResourceType` will always include `FETCH` regardless whether
it is actually supported.

`chrome.webRequest.onBeforeRequest.removeListener` will not work unless you
specifies that your extension is aware of `fetch` type. This function is rarely
used, may be implemented in the future if there is a need for it.

Many other shims are missing and will be added as needed.

## Configuration

*Note: These configuration flags are under `window.ecfg`.*

`dateStripMarks` (Default `true`): When set to true, `\u200E` and `\u200F` are
stripped from return value of `Date.prototype.toLocaleString`.

`fetchAware` (Default `false`): When set to true, listener for
`chrome.webRequest.onBeforeRequest` will no loger be wrapped.
