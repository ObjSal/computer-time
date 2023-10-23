'use strict';

const TasksAPI = (() => {

    const Status = {
        OPEN: "Open",
        STARTED: "Started",
        PENDING_APPROVAL: "PendingApproval",
        COMPLETED: "Completed",
        CLAIMED: "Claimed",
        CANCELED: "Canceled"
    }

    class Task {
        constructor(title, desc, sats, lnbitsWithdrawId, status = Status.OPEN) {
            this._id = Realm.BSON.ObjectID(Realm.BSON.ObjectID.generate());
            this.timestamp = new Date();
            this.title = title;
            this.description = desc;
            this.sats = sats;
            this.lnbits_withdraw_id = lnbitsWithdrawId;
            this.status = status;
            this.owner_id = null;
        }
    }

    async function insertTask(task) {
        // TODO(sal): Not safe, use backend functions.
        //            storing image as dataURL in the DB :/
        //            image/qrcode is also not protected
        return RealmWrapper.tasks_collection.insertOne(task);
    }

    async function updateTask(id, update, options = {}) {
        return RealmWrapper.tasks_collection.updateOne({ _id: new Realm.BSON.ObjectID(id) }, update, options);
    }

    async function downloadActiveTasks() {
        // Set to Monday of this week
        let date = new Date();
        date.setDate(date.getDate() - (date.getDay() + 6) % 7);
        date.setHours(0, 0, 0, 0);

        // I can filter out tasks that  have been started by other others, but I want to show them to other users.
        // TODO(sal): convert this to a cloud function that doesn't return reward QR codes.
        let tasks = await RealmWrapper.tasks_collection.find({ status: {$in: [Status.OPEN, Status.STARTED, Status.PENDING_APPROVAL,
                    Status.COMPLETED]} });
        return tasks.reverse();
    }

    async function downloadClaimedTasks() {
        // Set to Monday of this week
        let date = new Date();
        date.setDate(date.getDate() - (date.getDay() + 6) % 7);
        date.setHours(0, 0, 0, 0);

        // I can filter out tasks that  have been started by other others, but I want to show them to other users.
        // TODO(sal): convert this to a cloud function that doesn't return reward QR codes.
        let tasks = await RealmWrapper.tasks_collection.find({ status: {$in: [Status.CLAIMED]} });
        return tasks.reverse();
    }

    return {
        Task,
        Status,
        insertTask,
        updateTask,
        downloadActiveTasks,
        downloadClaimedTasks
    }
})();