'use strict';

const LoginUI = (() => {

    function showLogin() {
        document.getElementById("login").style.display = "";
    }

    async function login() {
        let appId = document.getElementById("loginAppId").value;
        let lnbitsHost = document.getElementById("lnbitsHost").value;
        let email = document.getElementById("loginEmail").value;
        let password = document.getElementById("loginPassword").value;

        // TODO(sal): Validate appId, email and password

        // Re-initialize realm
        RealmWrapper.init(appId);
        // Save the AppId & LNbits hostname
        localStorage.setItem("appId", appId);
        localStorage.setItem("lnbitsHost", lnbitsHost);

        try {
            await RealmWrapper.loginWithEmail(email, password);
            MainUI.showMain();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    function logout() {
        LogsUI.clear();
        TasksUI.clear();
        RealmWrapper.logOut().then(()=> {
            location.reload();
        });
    }

    return {
        showLogin,
        login,
        logout
    }
})();