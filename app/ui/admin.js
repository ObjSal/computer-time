'use strict';

const AdminUI = (() => {

    let temp_qrcode_dataURL = null;
    // let temp_qrcode_base64 = null;
    // let temp_qrcode_hex = null;

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

    async function createTask() {
        let desc = document.getElementById("task_description").value;
        let sats = parseInt(document.getElementById("task_reward_sats").value);
        // TODO(sal): upload as binary, ask on forums how to do this from MongoDB Web SDK.
        // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromBase64/
        // let qrcode = Realm.BSON.Binary.createFromBase64(temp_qrcode_base64);
        // https://www.mongodb.com/docs/manual/reference/method/Binary.createFromHexString/
        // let qrcode = Realm.BSON.Binary.createFromHexString(temp_qrcode_hex);

        await TasksAPI.insertTask(new TasksAPI.Task(desc, sats, temp_qrcode_dataURL));
    }

    function loadTaskQRCodeImage(element) {
        let file = element.files[0];
        let reader = new FileReader();
        reader.onloadend = function() {
            // 150x150 seems to be good enough for QR Codes
            ImageUtils.resizeImage(reader.result, file.type, 150, 150, (dataURL)=> {
                // console.log(dataURL);
                // document.getElementById("test").src = dataURL;
                temp_qrcode_dataURL = dataURL;
                // temp_qrcode_base64 = dataURL.split(';base64,')[1];
                // temp_qrcode_hex = StringUtils.base64ToHex(temp_qrcode_base64);
            });
        }
        reader.readAsDataURL(file);
    }

    return {
        showAdmin,
        createTask,
        loadTaskQRCodeImage
    }
})();