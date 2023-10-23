'use strict';

const RegisterUI = (() => {
    async function register() {
        let appId = document.getElementById("registerAppId").value;
        let lnbitsHost = document.getElementById("registerLnbitsHost").value;
        let email = document.getElementById("registerEmail").value;
        let password = document.getElementById("registerPassword").value;

        // TODO(sal): validate appId, email and password

        // Re-initialize realm
        RealmWrapper.init(appId);
        // Save the AppId
        localStorage.setItem("appId", appId);
        localStorage.setItem("lnbitsHost", lnbitsHost);

        try {
            await RealmWrapper.registerUser({ email, password });
            showConfirmEmail();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    function showRegister() {
        // Hide login elements
        document.getElementById("login").style.display = "none";
        // Show the register elements
        document.getElementById("register").style.display = "";
    }

    function showConfirmEmail() {
        document.getElementById("register").style.display = "none";
        document.getElementById("checkEmail").style.display = "";
    }

    function confirmUser() {
        let urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get("token");
        let tokenId = urlParams.get("tokenId");

        // TODO(sal): Validate token and tokenId

        RealmWrapper.confirmUser({ token, tokenId }).then(() => {
            // Remove the URL query params by redirecting to the pathname
            window.location = window.location.pathname;
        });
    }

    return {
        register,
        showRegister,
        confirmUser
    }
})();