'use strict';

const FetchUtils = (() => {

    async function FETCH(method, url, body, headersArgs) {
        // Default headers
        let headers = {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        };
        // Ref: https://stackoverflow.com/a/171256/877225
        headers = {...headers, ...headersArgs};

        let fetchData = {
            method: method, // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: headers,
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer" // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        }

        if (body) {
            fetchData.body = JSON.stringify(body); // body data type must match "Content-Type" header
        }

        // const response = await fetch(url, fetchData);
        // return response.json(); // parses JSON response into native JavaScript objects
        return fetch(url, fetchData);
    }

    async function POST(url = "", body = {}, headersArgs = {}) {
        return FETCH('POST', url, body, headersArgs);
    }

    async function DELETE(url, headersArgs = {}) {
        return FETCH('DELETE', url, null, headersArgs);
    }

    return {
        POST,
        DELETE
    }
})();