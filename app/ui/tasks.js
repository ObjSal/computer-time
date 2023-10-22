'use strict';

const TasksUI = (() => {

    let tasks = null;

    function clear() {
        tasks = null;
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
                        actionCell.innerHTML = 'Started by ' + userData.username.capitalizeFirstLetter();
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
                        actionCell.innerHTML = 'Completed by ' + userData.username.capitalizeFirstLetter();
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

    return {
        clear,
        setupTasks,
        startTask,
        finishTask,
        approveTask,
        cancelTask,
        showTaskReward,
        claimTaskReward
    }
})();