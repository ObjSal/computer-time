'use strict';

const ProfileUI = (() => {
    async function saveUsername() {
        let username = document.getElementById("username").value;
        // TODO(sal): Validate username
        await UserAPI.saveUsername(username);
        MainUI.showMain();
    }

    function showSetUsername() {
        // Hide login elements
        document.getElementById("login").style.display = "none";
        document.getElementById("setUsername").style.display = "";
    }

    return {
        saveUsername,
        showSetUsername
    }
})();