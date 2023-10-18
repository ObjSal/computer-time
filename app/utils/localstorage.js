'use strict';

const LocalStorageUtils = (() => {
    function load() {
        let appId = localStorage.getItem("appId");
        let appIdFromURL = (new URLSearchParams(window.location.search)).get("appId");

        // URL params overwrites local cache
        if (appIdFromURL) {
            appId = appIdFromURL;
        }

        if (appId) {
            document.getElementById("loginAppId").value = appId;
            document.getElementById("registerAppId").value = appId;
        }
    }

    return {
        load
    }
})();