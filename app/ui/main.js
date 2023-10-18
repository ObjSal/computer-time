'use strict';

const MainUI = (() => {

    function showMain() {
        if (RealmWrapper.currentUsername() == null) {
            ProfileUI.showSetUsername();
            return;
        }

        // Hide login elements
        document.getElementById("login").style.display = "none";
        // Hide set username
        document.getElementById("setUsername").style.display = "none";
        // Show Main elements
        document.getElementById("main").style.display = "";
        document.getElementById("welcome").innerHTML = "<b>Welcome " + StringUtils.capitalizeFirstLetter(RealmWrapper.currentUsername()) + "!</b>"
        // Initialize mongo client and collections
        LogsUI.setupTimer();
        TasksUI.setupTasks().then();

        if (RealmWrapper.isGlobalAdmin()) {
            AdminUI.showAdmin().then();
        }
    }

    return {
        showMain
    }
})();