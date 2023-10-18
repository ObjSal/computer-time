'use strict';

const TasksUI = (() => {

    let tasks = null;
    let temp_qrcode_dataURL = null;
    // let temp_qrcode_base64 = null;
    // let temp_qrcode_hex = null;

    function clear() {
        tasks = null;
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

    async function startTask(taskId) {
        await TasksAPI.updateTask(taskId, { $set: {
                status: TasksAPI.Status.STARTED,
                owner_id: RealmWrapper.currentUserId()
            }}
        );

        // TODO(sal): do proper updating of table and cached collection
        location.reload();
    }

    async function finishTask(taskId) {
        await TasksAPI.updateTask(taskId, { $set: {
                status: TasksAPI.Status.PENDING_APPROVAL
            }}
        );

        // TODO(sal): notify admins that a task is waiting approval

        // TODO(sal): do proper updating of table and cached collection
        location.reload();
    }

    async function approveTask(taskId) {
        // TODO(sal): Not Safe! Move this function to a cloud function

        if (!RealmWrapper.isGlobalAdmin()) {
            return;
        }

        await TasksAPI.updateTask(taskId, { $set: {
                status: TasksAPI.Status.COMPLETED
            }}
        );

        // TODO(sal): do proper updating of table and cached collection
        location.reload();
    }

    async function cancelTask(taskId) {
        await TasksAPI.updateTask(taskId, { $set: {
                status: TasksAPI.Status.OPEN,
                owner_id: null
            }}
        );

        // TODO(sal): do proper updating of table and cached collection
        location.reload();
    }

    function showTaskReward(taskId) {
        let task = tasks.find((item)=>  item._id.toString() === taskId );
        let actionCell = document.getElementById(taskId);
        actionCell.innerHTML = '<img src="' + task.qrcode + '" alt="QR Code">';
    }

    async function claimTaskReward(taskId) {
        showTaskReward(taskId);

        // Mark task as claimed but don't refresh because users are scanning the code.
        await TasksAPI.updateTask(taskId, { $set: {
                status: TasksAPI.Status.CLAIMED
            }}
        );
    }

    function showTasks() {
        let tasksTable = document.getElementById("tasks");

        for (const task of tasks) {
            let row = tasksTable.insertRow(-1);
            let dateCell = row.insertCell(-1);
            let satsCell = row.insertCell(-1);
            let descriptionCell = row.insertCell(-1);
            let actionCell = row.insertCell(-1);

            actionCell.id = task._id;
            dateCell.innerHTML = task.timestamp.toLocaleDateString();
            satsCell.innerHTML = new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(task.sats);
            descriptionCell.innerHTML = task.description;
            if (task.status === TasksAPI.Status.OPEN) {
                // Task is open and unassigned
                actionCell.innerHTML = '<button onclick=\'TasksUI.startTask("' + task._id + '")\'>Start</button>';
            } else if (task.status === TasksAPI.Status.STARTED) {
                if (task.owner_id === RealmWrapper.currentUserId()) {
                    actionCell.innerHTML =
                        '<button onclick=\'TasksUI.finishTask("' + task._id + '")\'>Finish</button>' + '<br>' +
                        '<button onclick=\'TasksUI.cancelTask("' + task._id + '")\'>Cancel</button>';
                } else {
                    actionCell.innerHTML = 'Started by...';

                    UserAPI.findUser({ owner_id: task.owner_id }).then(userData => {
                        actionCell.innerHTML = 'Started by ' + StringUtils.capitalizeFirstLetter(userData.username);
                    });
                }
            } else if (task.status === TasksAPI.Status.PENDING_APPROVAL) {
                if (RealmWrapper.isGlobalAdmin()) {
                    actionCell.innerHTML = '<button onclick=\'TasksUI.approveTask("' + task._id + '")\'>Approve!</button>';
                } else if (task.owner_id === RealmWrapper.currentUserId()) {
                    actionCell.innerHTML = 'Ask for approval...';
                } else {
                    actionCell.innerHTML = 'Pending approval...';
                }
            } else if (task.status === TasksAPI.Status.COMPLETED) {
                if (task.owner_id === RealmWrapper.currentUserId()) {
                    actionCell.innerHTML = '<button onclick=\'TasksUI.claimTaskReward("' + task._id + '")\'>Claim Reward!</button>';
                } else {
                    actionCell.innerHTML = 'Completed by...';
                    UserAPI.findUser({ owner_id: task.owner_id }).then(userData => {
                        actionCell.innerHTML = 'Completed by ' + StringUtils.capitalizeFirstLetter(userData.username);
                    });
                }
            } else if (task.status === TasksAPI.Status.CLAIMED) {
                let innerHTML = 'Reward Claimed'

                if (task.owner_id === RealmWrapper.currentUserId()) {
                    innerHTML += '<br>' + '<button onclick=\'TasksUI.showTaskReward("' + task._id + '")\'>Show Reward</button>';
                }
                actionCell.innerHTML = innerHTML;
            }
        }
    }

    async function setupTasks() {
        tasks = await TasksAPI.downloadTasks();
        showTasks();
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
        createTask,
        clear,
        setupTasks,
        startTask,
        finishTask,
        approveTask,
        cancelTask,
        showTaskReward,
        claimTaskReward,
        loadTaskQRCodeImage
    }
})();