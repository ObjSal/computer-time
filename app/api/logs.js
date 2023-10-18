'use strict';

const LogsAPI = (() => {

    const Type = {
        START: "Start",
        STOP: "Stop"
    };

    class Log {
        constructor(type) {
            this.owner_id = RealmWrapper.currentUserId();
            this.timestamp = new Date();
            this.userAgent = navigator.userAgent;
            this.type = type;
        }
    }

    async function downloadLogs(ownerId) {
        // Set to Monday of this week
        let date = new Date();
        date.setDate(date.getDate() - (date.getDay() + 6) % 7);
        date.setHours(0, 0, 0, 0);

        // Download log
        let logs = await RealmWrapper.logs_collection.find({ owner_id: ownerId, timestamp: {$gt: date} });
        return logs.sort();
    }

    async function insertLog(log) {
        return RealmWrapper.logs_collection.insertOne(log);
    }

    async function updateLogs(filter, update, options = {}) {
        return RealmWrapper.logs_collection.updateMany(filter, update, options);
    }

    function calcTotalCompletedTime(logs) {
        if (logs == null) {
            return 0;
        }

        // Calculate time taken
        let totalTime = 0;
        // Make sure that we start with a start log.
        let startFound = false;
        let startDate = null;
        logs.forEach(log => {
            if (startFound === false && log.type === Type.START) {
                startFound = true;
            }
            if (startFound) {
                if (log.type === Type.START) {
                    startDate = log.timestamp;
                } else if(log.type === Type.STOP) {
                    totalTime += log.timestamp.getTime() - startDate.getTime();
                }
            }
        });
        return totalTime;
    }

    return {
        Type,
        Log,
        downloadLogs,
        insertLog,
        updateLogs,
        calcTotalCompletedTime
    }
})();