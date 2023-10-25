'use strict';

const AdminUI = (() => {

    async function showAdmin() {
        document.getElementById("admin").style.display = "";
        await fillTimesTable();
    }

    async function fillTimesTable() {
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

    async function createTask() {
        let title = document.getElementById("task_title").value;
        let desc = document.getElementById("task_description").value;
        let sats = parseInt(document.getElementById("task_reward_sats").value);

        if (title === "") {
            alert('Set a title');
            return;
        }

        if (desc === "") {
            alert('Set a description');
            return;
        }

        let data = {
            "title": title,
            "min_withdrawable": sats,
            "max_withdrawable": sats,
            "uses": 1,
            "wait_time": 1,
            "is_unique": true
        }

        // TODO(sal): add error handling
        // TODO(sal): LNbits doesn't check for available balance before creating a new LNURLw... maybe check if I want
        //            to make it robust
        FetchUtils.POST(localStorage.getItem('lnbitsHost') + '/withdraw/api/v1/links', data, {'X-API-KEY': RealmWrapper.lnbitsWalletAdminKey()}).then(response => {
            if (response.status !== 201) {
                alert('There was an error creating the LNURLw with http status: ' + response.status);
                return;
            }
            response.json().then(data => {
                TasksAPI.insertTask(new TasksAPI.Task(title, desc, sats, data.id)).then(data => {
                    alert('complete');
                });
            });
        });
    }

    return {
        showAdmin,
        createTask
    }
})();