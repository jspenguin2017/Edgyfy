/*******************************************************************************

MIT License

Copyright (c) 2018 Hugo Xu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*******************************************************************************/


"use strict";


window.edge = window.chrome || {};
window.chrome = window.browser;


window.elib = {};
window.elib.hardAssert = (test, err) => {
    if (!test) {
        throw err;
    }
};
window.elib.tricheck = (prop) => {
    return (
        typeof Element.prototype[prop] === "function" &&
        typeof Document.prototype[prop] === "function" &&
        typeof DocumentFragment.prototype[prop] === "function"
    );
};
window.elib.tripatch = (patcher) => {
    patcher(Element.prototype);
    patcher(Document.prototype);
    patcher(DocumentFragment.prototype);
};
window.elib.cpatch = (parent, name, value) => {
    Object.defineProperty(parent, name, {
        configurable: true,
        enumerable: true,
        writable: false,
        value: value,
    });
};
window.elib.unbreak_popup = () => {
    const style = document.createElement("style")
    style.innerHTML = "body { width: 100%; }";
    document.documentElement.prepend(style);
};


window.ecfg = {};
window.ecfg.dateStripMarks = true;
window.ecfg.fetchAware = false;


{
    const reMarks = /\u200E|\u200F/g;
    const _toLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function (...args) {
        if (args[0] === "fullwide") { // "fullwide" throws as of 41
            args.shift();
        }
        let temp = _toLocaleString.apply(this, args);
        if (ecfg.dateStripMarks) {
            // Chromium does not insert those marks
            temp = temp.replace(reMarks, "");
        }
        return temp;
    };
}
try {
    const nodes = document.querySelectorAll("html");
    for (const node of nodes) { // Throws until 40, fixed in 41
        void node;
    }
} catch (err) {
    elib.tripatch((ptype) => {
        const _querySelectorAll = ptype.querySelectorAll;
        ptype.querySelectorAll = function () {
            const result = _querySelectorAll.apply(this, arguments);
            return Array.from(result);
        };
    });
}
if (!elib.tricheck("prepend")) {
    elib.tripatch((ptype) => {
        ptype.prepend = function () { // Missing as of 41
            let docFrag = document.createDocumentFragment();
            for (const arg of arguments) {
                if (arg instanceof Node) {
                    docFrag.appendChild(arg);
                } else {
                    docFrag.appendChild(document.createTextNode(String(argItem)));
                }
            }
            this.insertBefore(docFrag, this.firstChild);
        };
    });
}
if (!elib.tricheck("append")) {
    elib.tripatch((ptype) => {
        ptype.append = function () { // Missing as of 41
            let docFrag = document.createDocumentFragment();
            for (const arg of arguments) {
                if (arg instanceof Node) {
                    docFrag.appendChild(arg);
                } else {
                    docFrag.appendChild(document.createTextNode(String(argItem)));
                }
            }
            this.appendChild(docFrag);
        };
    });
}
{
    // Local storage is not functional for extensions as of 41
    const _localStorage = localStorage;
    let newLocalStorage = {};

    const wrap = (name) => {
        return (...args) => {
            try {
                return _localStorage[name](...args);
            } catch (err) {
                console.warn("localStorage." + name + ": Crash prevented\n", err);
                debugger;
            }
        };
    };
    const keys = ["clear", "getItem", "key", "removeItem", "setItem"];
    for (const key of keys) {
        newLocalStorage[key] = wrap(key);
    }

    Object.defineProperty(window, "localStorage", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: newLocalStorage,
    });
}


if (chrome.tabs && typeof chrome.tabs.reload !== "function") {
    const _reload = (tabId, reloadProperties, callback) => {
        elib.hardAssert(
            typeof tabId === "undefined" || typeof tabId === "number",
            "Uncaught TypeError: Invalid type for tabId",
        );
        elib.hardAssert(
            typeof reloadProperties === "undefined" || typeof reloadProperties === "object",
            "Uncaught TypeError: Invalid type for reloadProperties",
        );
        elib.hardAssert(
            reloadProperties !== null,
            "Uncaught TypeError: Invalid type for reloadProperties",
        );
        if (reloadProperties) {
            for (const key in reloadProperties) {
                if (reloadProperties.hasOwnProperty(key)) {
                    switch (key) {
                        case "bypassCache":
                            elib.hardAssert(
                                typeof reloadProperties.bypassCache === "boolean",
                                "Uncaught TypeError: Invalid type for reloadProperties.bypassCache",
                            );
                            break;
                        default:
                            elib.hardAssert(
                                false,
                                "Uncaught TypeError: Unexpected key in reloadProperties",
                            );
                            break;
                    }
                }
            }
        }
        elib.hardAssert(
            typeof callback === "undefined" || typeof callback === "function",
            "Uncaught TypeError: Invalid type for callback",
        );
        let bypassCache = reloadProperties && reloadProperties.bypassCache;
        bypassCache = String(Boolean(bypassCache));
        const details = {
            code: ";location.reload(" + bypassCache + ");",
            runAt: "document_start",
        };
        const _callback = (...args) => {
            if (args.length) {
                console.log("chrome.tabs.reload: Workaround callback arguments discarded\n", args);
            }
            if (typeof callback === "function") {
                return callback();
            }
        };
        if (typeof tabId === "number") {
            chrome.tabs.executeScript(tabId, details, _callback);
        } else {
            chrome.tabs.executeScript(details, _callback);
        }
    };
    elib.cpatch(chrome.tabs, "reload", (...args) => { // Missing as of 41
        try {
            return _reload(...args);
        } catch (err) {
            console.warn("chrome.tabs.reload: Crash prevented\n", err);
            debugger;
        }
    });
}
if (chrome.browserAction) {
    const reIsNumber = /^\d+$/;
    const _setIcon = chrome.browserAction.setIcon;
    elib.cpatch(chrome.browserAction, "setIcon", (details, callback) => {
        let largest = -1;
        for (const key in details.path) {
            if (reIsNumber.test(key)) {
                const current = parseInt(key);
                if (isFinite(current) && current > largest) {
                    largest = current;
                }
            }
        }
        if (largest === -1) {
            throw new Error("chrome.browserAction.setIcon: No reasonable icon path");
        }
        const pathToLargest = details.path[String(largest)];
        // Edge modifies this object
        details.path = {
            // Edge does not care if the size is actually right but do care if
            // the key name is right
            "38": pathToLargest,
        };
        try {
            return _setIcon(details, callback);
        } catch (err) {
            console.warn("chrome.browserAction.setIcon: Crash prevented\n", err);
            debugger;
        }
    });
}
if (chrome.webRequest) {
    elib.cpatch(chrome.webRequest, "ResourceType", {
        "MAIN_FRAME": "main_frame",
        "SUB_FRAME": "sub_frame",
        "STYLESHEET": "stylesheet",
        "SCRIPT": "script",
        "IMAGE": "image",
        // "FONT": "font", // Not available as of 41
        "OBJECT": "object",
        "XMLHTTPREQUEST": "xmlhttprequest",
        "FETCH": "fetch", // Available starting in 41, but not Chromium
        "PING": "ping",
        // "CSP_REPORT": "csp_report", // Not available as of 41
        // "MEDIA": "media", // Not available as of 41
        // "WEBSOCKET": "websocket", // Not available as of 41
        "OTHER": "other",
    });
    {
        let canFilterFetch = null;
        let failCount = 0;
        const _addListener = chrome.webRequest.onBeforeRequest.addListener;
        elib.cpatch(chrome.webRequest.onBeforeRequest, "addListener", (callback, filter, opt_extraInfoSpec) => {
            if (canFilterFetch === null) {
                const noopfn = () => { };
                try {
                    _addListener(noopfn, {
                        urls: filter.urls,
                        types: ["fetch"],
                    }, opt_extraInfoSpec);
                    chrome.webRequest.onBeforeRequest.removeListener(noopfn);
                    canFilterFetch = true;
                } catch (err) {
                    failCount++;
                    if (failCount > 10) {
                        canFilterFetch = false;
                    }
                }
            }
            if (!ecfg.fetchAware) {
                if (canFilterFetch && filter.types && filter.types.includes("xmlhttprequest")) {
                    filter.types.push("fetch");
                }
                if (!filter.types || filter.types.includes("xmlhttprequest") || filter.types.includes("fetch")) {
                    const _callback = callback;
                    callback = (details) => {
                        if (details.type === "fetch") {
                            details.type = "xmlhttprequest";
                        }
                        return _callback(details);
                    };
                }
            }
            try {
                return _addListener(callback, filter, opt_extraInfoSpec);
            } catch (err) {
                console.warn("chrome.webRequest.onBeforeRequest: Crash prevented\n", err);
                debugger;
            }
        });
    }
    {
        const _addListener = chrome.webRequest.onBeforeSendHeaders.addListener;
        elib.cpatch(chrome.webRequest.onBeforeSendHeaders, "addListener", (callback, filter, opt_extraInfoSpec) => {
            try {
                return _addListener(callback, filter, opt_extraInfoSpec);
            } catch (err) {
                console.warn("chrome.webRequest.onBeforeSendHeaders: Crash prevented\n", err);
                debugger;
            }
        });
    }
}
