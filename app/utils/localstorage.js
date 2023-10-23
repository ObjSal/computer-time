'use strict';

const LocalStorageUtils = (() => {
    function load() {
        let appId = localStorage.getItem("appId");
        let lnbitsHost = localStorage.getItem("lnbitsHost");
        let appIdFromURL = (new URLSearchParams(window.location.search)).get("appId");
        let lnbitsHostFromURL = (new URLSearchParams(window.location.search)).get("lnbitsHost");

        // URL params overwrites local cache
        if (appIdFromURL) {
            appId = appIdFromURL;
        }
        if (lnbitsHostFromURL) {
            lnbitsHost = lnbitsHostFromURL;
        }

        if (appId) {
            document.getElementById("loginAppId").value = appId;
            document.getElementById("registerAppId").value = appId;
        }

        if (lnbitsHost) {
            document.getElementById("lnbitsHost").value = lnbitsHost;
            document.getElementById("registerLnbitsHost").value = lnbitsHost;
        }
    }

    return {
        load
    }
})();