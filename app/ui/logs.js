'use strict';

const LogsUI = (() => {

    let logs = null;
    let timerId = 0;
    let totalUsedTime = 0;
    const maxHoursPerWeek = 10*60*60000; // 10HRS;  min * milliseconds = hours

    async function downloadLogsForCurrentUser() {
        logs = await LogsAPI.downloadLogs(RealmWrapper.currentUserId());
        totalUsedTime = LogsAPI.calcTotalCompletedTime(logs);
    }

    async function toggleTimer() {
        await LogsUI.downloadLogsForCurrentUser();

        let newType = LogsAPI.Type.START;
        if (logs && logs.length > 0) {
            let lastLog = logs[logs.length - 1];
            newType = lastLog.type === LogsAPI.Type.START ? LogsAPI.Type.STOP : LogsAPI.Type.START;
        }

        // TODO(sal): NOT SAFE! Move to a backend function
        let newLog = new LogsAPI.Log(newType);
        await LogsAPI.insertLog(newLog);

        logs.push(newLog);
        totalUsedTime = LogsAPI.calcTotalCompletedTime(logs);

        setupTimer();
    }

    // Returns the time-lapse since the last log was started
    // If the last log is stopped then it returns 0
    function timeSinceLastLogStarted(logs) {
        if (logs && logs.length > 0) {
            let lastLog = logs[logs.length - 1];
            if (lastLog.type === LogsAPI.Type.START) {
                let date = new Date();
                return (date.getTime() - lastLog.timestamp.getTime());
            }
        }
        return 0;
    }

    function backgroundColorForValue(value) {
        if (value > 0) {
            return "chartreuse;";
        } else {
            return "crimson;";
        }
    }

    function updateTimeLabel() {
        let usedTime = totalUsedTime + timeSinceLastLogStarted(logs);
        let timeLeft = maxHoursPerWeek - usedTime;
        let timerElement = document.getElementById("timer");
        let sign = timeLeft < 0 ? "-": "";
        timerElement.innerHTML = sign + DateUtils.msToTime(Math.abs(timeLeft));
        timerElement.style.backgroundColor = backgroundColorForValue(timeLeft);
    }

    function startTimer() {
        stopTimer();
        updateTimeLabel();
        timerId = setInterval(updateTimeLabel, 1000);
        document.getElementById("timerButton").innerHTML = "STOP";
    }

    function stopTimer() {
        clearInterval(timerId);
        updateTimeLabel();
        timerId = 0;
        document.getElementById("timerButton").innerHTML = "START";
    }

    function setupTimer() {
        if (logs == null || logs.length === 0) {
            stopTimer();
            if (logs == null) {
                // Download logs only when logs is null, so we're not stuck in an infinite loop
                downloadLogsForCurrentUser().then(() => setupTimer())
            }
            return;
        }
        let lastLog = logs[logs.length - 1];
        if (lastLog.type === LogsAPI.Type.START) {
            startTimer();
        } else if (lastLog.type === LogsAPI.Type.STOP) {
            stopTimer();
        }
    }

    function clear() {
        logs = null;
        totalUsedTime = 0;
        stopTimer();
    }

    return {
        downloadLogsForCurrentUser,
        toggleTimer,
        setupTimer,
        timeSinceLastLogStarted,
        backgroundColorForValue,
        maxHoursPerWeek,
        clear
    }
})();