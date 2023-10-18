'use strict';

const AdminUI = (() => {

    async function showAdmin() {
        document.getElementById("admin").style.display = "";
        let timesTable = document.getElementById("times");

        const users = await UserAPI.findUsers(
            { },
            { username: 1, owner_id: 1 }
        );

        for (const user of users) {
            let row = timesTable.insertRow(-1);
            let nameCell = row.insertCell(-1);
            let timeCell = row.insertCell(-1);
            let statusCell = row.insertCell(-1);

            nameCell.innerHTML = user.username;

            let logs = await LogsAPI.downloadLogs(user.owner_id);
            let totalTime = LogsAPI.calcTotalCompletedTime(logs)
            let usedTime = totalTime + LogsUI.timeSinceLastLogStarted(logs);
            let timeLeft = LogsUI.maxHoursPerWeek - usedTime;
            let sign = timeLeft < 0 ? "-": "";
            timeCell.style.backgroundColor = LogsUI.backgroundColorForValue(timeLeft);
            timeCell.innerHTML = sign + DateUtils.msToTime(Math.abs(timeLeft));

            let lastType = LogsAPI.Type.STOP;
            if (logs && logs.length > 0) {
                lastType = logs[logs.length -1].type;
            }
            statusCell.innerHTML = lastType;
        }
    }

    return {
        showAdmin
    }
})();