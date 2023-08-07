"use strict";

let app = {
    realm: null,
    username: null,
    mongo: null,
    collection: null,
    logs: null,
    totalTime: 0,
    timer: null,
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
    if (document.getElementById("appId").value == "" || document.getElementById("key").value == "") {
        await setupUI();
        return;
    }
    let appId = document.getElementById("appId").value;
    let key = document.getElementById("key").value;

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
    localStorage.clear();
    location.reload();
}

function msToTime(duration) {
    // ref: https://stackoverflow.com/a/19700358
    var milliseconds = Math.floor((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
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
    let logs = await app.collection.find({ username: "leo", timestamp: {$gt: date} });
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
    app.totalTime = totalTime;
}

function saveAppLogin() {
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
        app.username = username;
    }
}

let value = 0;

function updateTimeLabel() { 
    value += 1000;
    document.getElementById("timer").innerHTML = msToTime(value);
} 

async function startTimer(lastLog) {
    stopTimer(); 
    // value = 0; 
    let date = new Date();
    value = app.totalTime + (date.getTime() - lastLog.timestamp.getTime());
    app.timer = setInterval(updateTimeLabel, 1000);
    document.getElementById("timerButton").innerHTML = "STOP";
} 

function stopTimer() {
    clearInterval(app.timer); 
    app.timer = null;
    value = 0;
    document.getElementById("timerButton").innerHTML = "START";
    if (app.totalTime > 0) {
        document.getElementById("timer").innerHTML = msToTime(app.totalTime);
    }
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

async function setupTimer() {
    if (app.logs == null || app.logs.length == 0) {
        stopTimer();
        return;
    }
    let lastLog = app.logs[app.logs.length - 1];
    if (lastLog.type == LogType.START) {
        await startTimer(lastLog);
    } else if (lastLog.type == LogType.STOP) {
        stopTimer();
    }
}

async function setupUI() {
    if (app.username) {
        // hide the login elements
        document.getElementById("login").style.display = "none";
        // show logged in div
        document.getElementById("loggedIn").style.display = "";
        document.getElementById("username").innerHTML = "Welcome " + app.username + "!"

    } else {
        document.getElementById("loggedIn").style.display = "none";
        document.getElementById("login").style.display = "";
    }

    await setupTimer();
}

function init() {
    document.getElementById("login").style.display = "none";
    document.getElementById("loggedIn").style.display = "none";

    loadLocalStorage();
    login();
}

init();