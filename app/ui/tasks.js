'use strict';

const TasksUI = (() => {

    let activeTasks = null;
    let claimedTasks = null;

    function clear() {
        activeTasks = null;
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

    function getTaskById(taskId) {
        let task = activeTasks.find((item)=>  item._id.toString() === taskId);
        if (!task) {
            // this function is called from two table sources, account for the two instead of making a call to the
            // backend
            task = claimedTasks.find((item)=>  item._id.toString() === taskId);
        }
        return task;
    }

    function showTaskReward(taskId) {
        // TODO(sal): not secure, move to the backend.
        let task = getTaskById(taskId);
        let actionCell = document.getElementById(taskId);
        if (task['qrcode']) {
            // Legacy, not used anymore
            actionCell.innerHTML = '<img src="' + task['qrcode'] + '" alt="QR Code">';
        } else {
            // get QRCode directly from lnbits
            actionCell.innerHTML = '<img src="' + localStorage.getItem('lnbitsHost')  + '/withdraw/img/' + task.lnbits_withdraw_id + '" alt="LNbits QR Code">';
        }
    }

    async function claimTaskReward(taskId) {
        showTaskReward(taskId);

        // Mark task as claimed but don't refresh because users are scanning the code.
        await TasksAPI.updateTask(taskId, { $set: {
                status: TasksAPI.Status.CLAIMED
            }}
        );
    }

    async function showUsername(cellId, userId) {
        let cell = document.getElementById(cellId);
        UserAPI.findUser({ owner_id: userId }).then(userData => {
            cell.innerHTML = userData.username.capitalizeFirstLetter();
        });
    }

    function deleteTask(taskId) {
        let task = getTaskById(taskId);
        if (confirm('Delete "' + task.title + '" task?')) {

            if (task.lnbits_withdraw_id) {
                // First delete the LNURLw
                let url = localStorage.getItem('lnbitsHost') + '/withdraw/api/v1/links/' + task.lnbits_withdraw_id;
                FetchUtils.DELETE(url, {'X-API-KEY': RealmWrapper.lnbitsWalletAdminKey()})
                    .catch(error => {
                        if (error.message === 'Failed to fetch') {
                            alert('Go to ' + localStorage.getItem('lnbitsHost') + ' manually to accept cert and try again');
                        } else {
                            alert('There was an error, try again.\n' + error.message);
                        }
                        throw error;
                    })
                    .then(response => {
                        // If we get 404 it means that the LNURLw has already been deleted, treat it as successful
                        if (response.status !== 200 && response.status !== 404) {
                            alert('There was an error creating the LNURLw with http status: ' + response.status);
                            return;
                        }

                        // TODO(sal): error handling
                        TasksAPI.deleteTask(task).then(data => {
                            location.reload();
                        });
                    });
            } else /* legacy tasks */ {
                // TODO(sal): error handling
                TasksAPI.deleteTask(task).then(data => {
                    location.reload();
                });
            }
        }
    }

    function showTasks(tableId, tasks) {
        let tasksTable = document.getElementById(tableId);

        for (const task of tasks) {
            let row = tasksTable.insertRow(-1);
            let dateCell = row.insertCell(-1);
            let satsCell = row.insertCell(-1);
            let titleCell = row.insertCell(-1);
            let descriptionCell = row.insertCell(-1);
            let assigneeCell = row.insertCell(-1);
            let actionCell = row.insertCell(-1);

            if (RealmWrapper.isGlobalAdmin()) {
                let adminCell = row.insertCell(-1);
                adminCell.innerHTML = '<button onclick=\'TasksUI.deleteTask("' + task._id + '")\'>Delete</button>';
            }

            actionCell.id = task._id;
            assigneeCell.id = 'assignee.' + task._id;
            dateCell.innerHTML = task.timestamp.toLocaleDateString();
            satsCell.innerHTML = new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(task.sats);
            titleCell.innerHTML = task.title ? task.title : "";
            descriptionCell.innerHTML = task.description;

            if (task.status !== TasksAPI.Status.OPEN) {
                // if task is assigned, we can show the username
                assigneeCell.innerHTML = '<button onclick=\'TasksUI.showUsername("' + assigneeCell.id + '", "' + task.owner_id + '")\'>Show</button>';
            }

            if (task.status === TasksAPI.Status.OPEN) {
                // Task is open and unassigned
                actionCell.innerHTML = '<button onclick=\'TasksUI.startTask("' + task._id + '")\'>Start</button>';
            } else if (task.status === TasksAPI.Status.STARTED) {
                if (task.owner_id === RealmWrapper.currentUserId()) {
                    actionCell.innerHTML =
                        '<button onclick=\'TasksUI.finishTask("' + task._id + '")\'>Finish</button>' + '<br>' +
                        '<button onclick=\'TasksUI.cancelTask("' + task._id + '")\'>Cancel</button>';
                } else {
                    actionCell.innerHTML = 'Started';
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
                    actionCell.innerHTML = 'Completed';
                }
            } else if (task.status === TasksAPI.Status.CLAIMED) {
                let innerHTML = 'Reward Claimed';

                if (task.owner_id === RealmWrapper.currentUserId()) {
                    innerHTML += '<br>' + '<button onclick=\'TasksUI.showTaskReward("' + task._id + '")\'>Show Reward</button>';
                }
                actionCell.innerHTML = innerHTML;
            }
        }
    }

    async function setupTasks() {
        activeTasks = await TasksAPI.downloadActiveTasks();
        if (RealmWrapper.isGlobalAdmin()) {
            document.getElementById('tasks_title_td').colspan += 1;
        }
        showTasks("tasks", activeTasks);
    }

    async function showClaimedTasks() {
        claimedTasks = await TasksAPI.downloadClaimedTasks();
        showTasks("completedTasks", claimedTasks);
    }

    return {
        clear,
        setupTasks,
        startTask,
        finishTask,
        approveTask,
        cancelTask,
        showTaskReward,
        claimTaskReward,
        showClaimedTasks,
        showUsername,
        deleteTask
    }
})();