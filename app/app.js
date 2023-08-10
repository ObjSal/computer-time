"use strict";

let app = {
    realm: null,
    username: null,
    mongo: null,
    collection: null,
    logs: null,
    totalUsedTime: 0,
    timerId: 0,
    maxHoursPerWeek: 10*60*60000, // 10HRS;  min * milliseconds = hours
};

const MONGO = {
    CLUSTER_NAME: "mongodb-atlas",
    DATABASE_NAME: "computer-time",
    COLLECTION_NAME: "log",
};

const LogType ={
    START: "Start",
    STOP: "Stop"
};

class Log {
    constructor(username, type) {
        this.owner_id = app.realm.currentUser.id;
        this.timestamp = new Date();
        this.userAgent = navigator.userAgent;
        this.username = username;
        this.type = type;
    }
}

async function loginApiKey(apiKey) {
    // const credentials = Realm.Credentials.anonymous();
    const credentials = Realm.Credentials.apiKey(apiKey);

    // Authenticate the user
    const user = await app.realm.logIn(credentials);

    // `app.realm.currentUser` updates to match the logged in user
    console.assert(user.id === app.realm.currentUser.id);

    return user;
}
  
async function login() {
    let appId = document.getElementById("appId").value;
    let key = document.getElementById("key").value;
    let username = document.getElementById("users").value;

    if (appId == "" || key == "" || username == "") {
        await setupUI();
        return;
    }

    // initialize the app global instance
    app.realm = new Realm.App({ id: appId });
    let user = null;

    try {
        user = await loginApiKey(key);
        saveAppLogin();
        initMongo();
        await downloadLog();
        await setupUI();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function logout() {
    let appId = localStorage.getItem("appId");
    let key = localStorage.getItem("key");
    document.getElementById("users").value = "";
    app.username = null;
    localStorage.clear();
    localStorage.setItem("appId", appId);
    localStorage.setItem("key", key);
    location.reload();
}

function msToTime(duration) {
    // ref: https://stackoverflow.com/a/19700358

    // let milliseconds = Math.floor((duration % 1000) / 100);
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
  
    return hours + ":" + minutes + ":" + seconds; // + "." + milliseconds;
  }

async function downloadLog() {
    // Set to Monday of this week
    var date = new Date();
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    date.setHours(0, 0, 0, 0);

    // Download log
    let logs = await app.collection.find({ username: app.username, timestamp: {$gt: date} });
    app.logs = logs.sort();
    console.log("app.", app.logs);

    // Calculate time taken
    let totalTime = 0;
    // Make sure that we start with a start log.
    let startFound = false;
    let startDate = null;
    app.logs.forEach(log => {
        if (startFound == false && log.type == LogType.START) {
            startFound = true;
        }
        if (startFound) {
            if (log.type == LogType.START) {
                startDate = log.timestamp;
            } else if(log.type == LogType.STOP) {
                totalTime += log.timestamp.getTime() - startDate.getTime();
            }
        }
    });
    app.totalUsedTime = totalTime;
}

function saveAppLogin(saveUsername = true) {
    let appId = document.getElementById("appId").value;
    let key = document.getElementById("key").value;
    let username = document.getElementById("users").value;
    localStorage.setItem("appId", appId);
    localStorage.setItem("key", key);
    localStorage.setItem("username", username);

    loadLocalStorage();
}

function initMongo() {
    app.mongo = app.realm.currentUser.mongoClient(MONGO.CLUSTER_NAME);
    app.collection = app.mongo.db(MONGO.DATABASE_NAME).collection(MONGO.COLLECTION_NAME);
}

function loadLocalStorage() {
    let appId = localStorage.getItem("appId");
    let key = localStorage.getItem("key");
    let username = localStorage.getItem("username");

    if (appId) {
        document.getElementById("appId").value = appId;
    }
    if (key) {
        document.getElementById("key").value = key;
    }
    if (username) {
        document.getElementById("users").value = username;
        app.username = username;
    }
}

function updateTimeLabel() {
    let usedTime = app.totalUsedTime;
    if (app.logs && app.logs.length > 0) {
        let lastLog = app.logs[app.logs.length - 1];
        if (lastLog.type == LogType.START) {
            let date = new Date();
            usedTime += (date.getTime() - lastLog.timestamp.getTime());
        }
    }

    let timeLeft = app.maxHoursPerWeek - usedTime;
    let timerElement = document.getElementById("timer");
    let sign = timeLeft < 0 ? "-": "";
    timerElement.innerHTML = sign + msToTime(Math.abs(timeLeft));

    // Set background color as indicator
    if (timeLeft > 0) {
        timerElement.style = "background-color: chartreuse;";
    } else {
        timerElement.style = "background-color: crimson;";
    }
}

function startTimer() {
    stopTimer();
    updateTimeLabel();
    app.timerId = setInterval(updateTimeLabel, 1000);
    document.getElementById("timerButton").innerHTML = "STOP";
}

function stopTimer() {
    clearInterval(app.timerId);
    updateTimeLabel();
    app.timerId = 0;
    document.getElementById("timerButton").innerHTML = "START";
}

async function toggleTimer() {
    await downloadLog();
    
    let newType = LogType.START;
    if (app.logs && app.logs.length > 0) {
        let lastLog = app.logs[app.logs.length - 1];
        newType = lastLog.type == LogType.START ? LogType.STOP : LogType.START;
    }

    // INSERT NEW DOCUMENT!!
    let newLog = new Log(app.username, newType);
    const result = await app.collection.insertOne(newLog);
    console.log(result);

    // Refetch the data
    await downloadLog();
    // manually add it instead <-- don't know why this doesn't work
    // app.logs.push(newLog);

    // Finally set the timer
    setupTimer();
}

function setupTimer() {
    if (app.logs == null || app.logs.length == 0) {
        stopTimer();
        return;
    }
    let lastLog = app.logs[app.logs.length - 1];
    if (lastLog.type == LogType.START) {
        startTimer();
    } else if (lastLog.type == LogType.STOP) {
        stopTimer();
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

async function setupUI() {
    if (app.username) {
        // hide the login elements
        document.getElementById("login").style.display = "none";
        // show logged in div
        document.getElementById("loggedIn").style.display = "";
        document.getElementById("username").innerHTML = "<b>Welcome " + capitalizeFirstLetter(app.username) + "!</b>"
    } else {
        document.getElementById("loggedIn").style.display = "none";
        document.getElementById("login").style.display = "";
    }

    setupTimer();
}

function init() {
    document.getElementById("login").style.display = "none";
    document.getElementById("loggedIn").style.display = "none";

    loadLocalStorage();
    login();
}

init();