# Edgyfy

A shim to make Chromium extensions run on Edge

## Reserved Namespaces

`window.edge`: Original content of `window.chrome`.

`window.elib`: internal tools for patching Edge APIs.

`window.econfig`: configuration flags.

## Omitted Differences

`triptype` means all of `window.Element.prototype`, `window.Document.prototype`,
and `window.DocumentFragment.prototype`.

On Edge 40, `triptype.querySelectorAll` will return a modifiable array instead
of a `StaticNodeList`. If your code (tries to) modify a `StaticNodeList` then
chances are your code is bugged.

Polyfilled and patched extension APIs *may not* validate your inputs, it's up
to you to make sure your extension works on Chromium first.

## Configuration

All these configuration flags are under `window.econfig`.

`dateStripMarks` (Default `true`): When set to true, \u200E and \u200F are
stripped from return value of `Date.prototype.toLocaleString`.
