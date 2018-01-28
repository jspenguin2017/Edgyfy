﻿/*******************************************************************************

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
window.browser = undefined;
delete window.browser;


window.elib = {};
window.elib.tripatch = (patcher) => {
    patcher(window.Element.prototype);
    patcher(window.Document.prototype);
    patcher(window.DocumentFragment.prototype);
};
window.elib.hardAssert = (test, err) => {
    if (!test) {
        throw err;
    }
};


window.econfig = {};
window.econfig.dateStripMarks = true;
window.econfig.fetchAware = false;


(() => {
    const reMarks = /\u200E|\u200F/g;
    const _toLocaleString = window.Date.prototype.toLocaleString;
    window.Date.prototype.toLocaleString = function (...args) {
        if (args[0] === "fullwide") { // "fullwide" throws as of 41
            args.shift();
        }
        let temp = _toLocaleString.apply(this, args);
        if (window.econfig.dateStripMarks) {
            temp = temp.replace(reMarks, ""); // Chromium does not insert those marks
        }
        return temp;
    };
})();
try {
    const nodes = window.document.querySelectorAll("html");
    for (let node of nodes) { // Throws until 40, fixed in 41
        void node;
    }
} catch (err) {
    window.elib.tripatch((ptype) => {
        const _querySelectorAll = ptype.querySelectorAll;
        ptype.querySelectorAll = function () {
            let result = _querySelectorAll.apply(this, arguments);
            return window.Array.prototype.slice.call(result);
        };
    });
}


if (window.chrome.tabs && typeof window.chrome.tabs.reload !== "function") {
    window.chrome.tabs.reload = (tabId, reloadProperties, callback) => { // Missing as of 41
        window.elib.hardAssert(
            typeof tabId === "undefined" || typeof tabId === "number",
            "chrome.tabs.reload: Invalid type for tabId",
        );
        window.elib.hardAssert(
            typeof reloadProperties === "undefined" || typeof reloadProperties === "object",
            "chrome.tabs.reload: Invalid type for reloadProperties",
        );
        window.elib.hardAssert(
            reloadProperties !== null,
            "chrome.tabs.reload: Invalid type for reloadProperties",
        );
        if (reloadProperties) {
            for (let key in reloadProperties) {
                if (reloadProperties.hasOwnProperty(key)) {
                    switch (key) {
                        case "bypassCache":
                            window.elib.hardAssert(
                                typeof reloadProperties.bypassCache === "boolean",
                                "chrome.tabs.reload: Invalid type for reloadProperties.bypassCache",
                            );
                            break;
                        default:
                            window.elib.hardAssert(
                                false,
                                "chrome.tabs.reload: Unexpected key in reloadProperties",
                            );
                            break;
                    }
                }
            }
        }
        window.elib.hardAssert(
            typeof callback === "undefined" || typeof callback === "function",
            "chrome.tabs.reload: Invalid type for callback",
        );
        let bypassCache = reloadProperties && reloadProperties.bypassCache;
        bypassCache = String(Boolean(bypassCache));
        const details = {
            code: ";window.location.reload(" + bypassCache + ");",
            runAt: "document_start",
        };
        const cbfn = (...args) => {
            if (args.length) {
                console.log("chrome.tabs.reload: Workaround callback arguments discarded\n", args);
            }
            if (typeof callback === "function") {
                return callback();
            }
        };
        if (typeof tabId === "number") {
            window.chrome.tabs.executeScript(tabId, details, cbfn);
        } else {
            window.chrome.tabs.executeScript(details, cbfn);
        }
    };
}
(() => {
    const reIsNumber = /^\d+$/;
    const _setIcon = window.chrome.browserAction.setIcon;
    window.chrome.browserAction.setIcon = (details, callback) => {
        let largest = -1;
        for (let key in details.path) {
            if (reIsNumber.test(key)) {
                let current = parseInt(key);
                if (isFinite(current) && current > largest) {
                    largest = current;
                }
            }
        }
        if (largest === -1) {
            throw new Error("chrome.browserAction.setIcon: No reasonable icon path");
        }
        const pathToLargest = details.path[String(largest)];
        details.path = { // Edge modifies this object
            "38": pathToLargest, // Edge does not care if the size is right
        };
        return _setIcon(details, callback);
    };
})();
if (window.chrome.webRequest) {
    window.chrome.webRequest.ResourceType = {
        "MAIN_FRAME": "main_frame",
        "SUB_FRAME": "sub_frame",
        "STYLESHEET": "stylesheet",
        "SCRIPT": "script",
        "IMAGE": "image",
        // "FONT": "font", // Not available as of 41
        "OBJECT": "object",
        "XMLHTTPREQUEST": "xmlhttprequest",
        "FETCH": "fetch", // Not available as of 40, available in 41, but not Chromium
        "PING": "ping",
        // "CSP_REPORT": "csp_report", // Not available as of 41
        // "MEDIA": "media", // Not available as of 41
        // "WEBSOCKET": "websocket", // Not available as of 41
        "OTHER": "other",
    };
    (() => {
        let canFilterFetch = null;
        const _addListener = window.chrome.webRequest.onBeforeRequest.addListener;
        window.chrome.webRequest.onBeforeRequest.addListener = (callback, filter, opt_extraInfoSpec) => {
            if (canFilterFetch === null) {
                const noopfn = () => { };
                try {
                    window.chrome.webRequest.onBeforeRequest.addListener(noopfn, {
                        urls: filter.urls,
                        types: ["fetch"],
                    }, opt_extraInfoSpec);
                    window.chrome.webRequest.onBeforeRequest.removeListener(noopfn);
                    canFilterFetch = true;
                } catch (err) {
                    canFilterFetch = false;
                }
            }
            if (!window.econfig.fetchAware && canFilterFetch) {
                if (filter.types && filter.types.includes("xmlhttprequest")) {
                    filter.types.push("fetch");
                }
                if (!filter.types || filter.types.includes("fetch")) {
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
            }
        };
    })();
    (() => {
        const _addListener = window.chrome.webRequest.onBeforeSendHeaders.addListener;
        window.chrome.webRequest.onBeforeSendHeaders.addListener = (callback, filter, opt_extraInfoSpec) => {
            try {
                return _addListener(callback, filter, opt_extraInfoSpec);
            } catch (err) {
                console.warn("chrome.webRequest.onBeforeSendHeaders: Crash prevented\n", err);
            }
        };
    })();
}
