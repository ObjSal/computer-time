'use strict';

function init() {
    // Hide all the states
    document.getElementById("login").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("checkEmail").style.display = "none";
    document.getElementById("main").style.display = "none";
    document.getElementById("setUsername").style.display = "none";
    document.getElementById("admin").style.display = "none";

    LocalStorageUtils.load();

    let appId = localStorage.getItem("appId");

    if (appId == null || appId === "") {
        LoginUI.showLogin();
    } else {
        // Initialize realm
        RealmWrapper.init(appId);

        if (RealmWrapper.isRefreshTokenValid()) {
            MainUI.showMain();
        } else {
            let urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("confirm")) {
                RegisterUI.confirmUser();
            } else {
                // Logged out, or Refresh Token expired
                LoginUI.showLogin();
            }
        }
    }
}

init();