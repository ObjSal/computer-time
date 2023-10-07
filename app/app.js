'use strict';

let app = {
    realm: null,
    mongo: null,
    log_collection: null,
    user_data_collection: null,
    logs: null,
    totalUsedTime: 0,
    timerId: 0,
    maxHoursPerWeek: 10*60*60000, // 10HRS;  min * milliseconds = hours

    // Temp helper globals
    temp_qrcode_dataURL: null
};

const MONGO = {
    CLUSTER_NAME: "mongodb-atlas",
    DATABASE_NAME: "computer-time",
    LOG_COLLECTION_NAME: "log",
    TASKS_COLLECTION_NAME: "tasks",
    USER_DATA_COLLECTION_NAME: "user_data"
};

const LogType = {
    START: "Start",
    STOP: "Stop"
};

class Log {
    constructor(type) {
        this.owner_id = app.realm.currentUser.id;
        this.timestamp = new Date();
        this.userAgent = navigator.userAgent;
        this.type = type;
    }
}

const TaskStatus = {
    OPEN: "Open",
    COMPLETED: "Completed",
    HIDDEN: "Hidden"
}

class Task {
    constructor(desc, sats, qrcode, status = TaskStatus.OPEN) {
        this._id = Realm.BSON.ObjectID(Realm.BSON.ObjectID.generate());
        this.timestamp = new Date();
        this.description = desc;
        this.sats = sats;
        this.qrcode = qrcode;
        this.status = status;
        this.owner_id = null;
    }
}

async function createTask() {
    let desc = document.getElementById("task_description").value;
    let sats = parseInt(document.getElementById("task_reward_sats").value);
    let qrcode = app.temp_qrcode_dataURL;

    let newTask = new Task(desc, sats, qrcode);

    // TODO(sal): Not safe, use backend functions.
    //            storing image as dataURL in the DB :/
    await app.tasks.insertOne(newTask);
}

function resizeImage(dataURL, type, width, height, callback) {
    // Reference: https://imagekit.io/blog/how-to-resize-image-in-javascript/

    let img = document.createElement("img");
    img.onload = function (event) {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext("2d");
        // ctx.mozImageSmoothingEnabled = false;
        // ctx.webkitImageSmoothingEnabled = false;
        // ctx.msImageSmoothingEnabled = false;
        // ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL(type));
    }
    img.src = dataURL;
}

function loadTaskQRCodeImage(element) {
    let file = element.files[0];
    let reader = new FileReader();
    reader.onloadend = function() {
        // 150x150 seems to be good enough for QR Codes
        resizeImage(reader.result, file.type, 150, 150, (dataURL)=> {
            // console.log(dataURL);
            // document.getElementById("test").src = dataURL;
            app.temp_qrcode_dataURL = dataURL;
        });
    }
    reader.readAsDataURL(file);
}

async function loginWithApiKey(apiKey) {
    const credentials = Realm.Credentials.apiKey(apiKey);

    // Authenticate the user
    const user = await app.realm.logIn(credentials);

    // `app.realm.currentUser` updates to match the logged in user
    console.assert(user.id === app.realm.currentUser.id);

    return user;
}

async function loginWithEmail(email, password) {
    const credentials = Realm.Credentials.emailPassword(email, password);

    // Authenticate the user
    const user = await app.realm.logIn(credentials);

    // `app.realm.currentUser` updates to match the logged in user
    console.assert(user.id === app.realm.currentUser.id);

    return user;
}

function refreshTokenValid() {
    let currentUser = app.realm ? app.realm.currentUser : null;
    if (currentUser && currentUser.isLoggedIn) {
        let refreshTokenJWT = jwt_decode(currentUser.refreshToken);
        // Expiration is unix epoch timestamps in seconds
        let expiration = refreshTokenJWT.exp;
        // multiply by 1,000 to convert to milliseconds
        let expDate = new Date(expiration * 1000);
        let now = new Date();
        return expDate > now;
    }
    return false;
}

async function login() {
    let appId = document.getElementById("loginAppId").value;
    let email = document.getElementById("loginEmail").value;
    let password = document.getElementById("loginPassword").value;

    // TODO(sal): Validate appId, email and password

    // Re-initialize the app global instance with the new appId
    if (app.realm == null || app.realm.id != appId) {
        // This code is not tested as I only have one Realm AppID.
        app.realm = new Realm.App({ id: appId });
    }

    // Save the AppId
    localStorage.setItem("appId", appId);

    try {
        await loginWithEmail(email, password);
        showMain();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function logout() {
    app.logs = null;
    app.totalUsedTime = 0;
    stopTimer();
    let currentUser = app.realm ? app.realm.currentUser : null;
    if (currentUser && currentUser.isLoggedIn) {
        currentUser.logOut().then(() => {
            location.reload();
        });
    } else {
        location.reload();
    }
}

async function register() {
    let appId = document.getElementById("registerAppId").value;
    let email = document.getElementById("registerEmail").value;
    let password = document.getElementById("registerPassword").value;

    // TODO(sal): validate appId, email and password

    // Re-initialize the app global instance with the new appId
    if (app.realm == null || app.realm.id != appId) {
        // This code is not tested as I only have one Realm AppID.
        app.realm = new Realm.App({ id: appId });
    }
    // Save the AppId
    localStorage.setItem("appId", appId);

    try {
        await app.realm.emailPasswordAuth.registerUser({ email, password });
        showConfirmEmail();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
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

async function downloadLogs(ownerId) {
    // Set to Monday of this week
    var date = new Date();
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    date.setHours(0, 0, 0, 0);

    // Download log
    let logs = await app.log_collection.find({ owner_id: ownerId, timestamp: {$gt: date} });
    return logs.sort();
}

async function downloadLogsForCurrentUser() {
    app.logs = await downloadLogs(app.realm.currentUser.id);
    app.totalUsedTime = calculateTotalCompletedTime(app.logs);
}

function calculateTotalCompletedTime(logs) {
    if (logs == null) {
        return 0;
    }

    // Calculate time taken
    let totalTime = 0;
    // Make sure that we start with a start log.
    let startFound = false;
    let startDate = null;
    logs.forEach(log => {
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
    return totalTime;
}

function initMongo() {
    app.mongo = app.realm.currentUser.mongoClient(MONGO.CLUSTER_NAME);
    app.log_collection = app.mongo.db(MONGO.DATABASE_NAME).collection(MONGO.LOG_COLLECTION_NAME);
    app.tasks = app.mongo.db(MONGO.DATABASE_NAME).collection(MONGO.TASKS_COLLECTION_NAME);
    app.user_data_collection = app.mongo.db(MONGO.DATABASE_NAME).collection(MONGO.USER_DATA_COLLECTION_NAME);
}

function loadLocalStorage() {
    let appId = localStorage.getItem("appId");

    if (appId) {
        document.getElementById("loginAppId").value = appId;
        document.getElementById("registerAppId").value = appId;
    }
}

// Returns the time lapse since the last log was started
// If the last log is stopped then it returns 0
function timeSinceLastLogStarted(logs) {
    if (logs && logs.length > 0) {
        let lastLog = logs[logs.length - 1];
        if (lastLog.type == LogType.START) {
            let date = new Date();
            return (date.getTime() - lastLog.timestamp.getTime());
        }
    }
    return 0;
}

function backgroundColorForValue(value) {
    if (value > 0) {
        return "background-color: chartreuse;";
    } else {
        return "background-color: crimson;";
    }
}

function updateTimeLabel() {
    let usedTime = app.totalUsedTime + timeSinceLastLogStarted(app.logs);
    let timeLeft = app.maxHoursPerWeek - usedTime;
    let timerElement = document.getElementById("timer");
    let sign = timeLeft < 0 ? "-": "";
    timerElement.innerHTML = sign + msToTime(Math.abs(timeLeft));
    timerElement.style = backgroundColorForValue(timeLeft);
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
    await downloadLogsForCurrentUser();

    let newType = LogType.START;
    if (app.logs && app.logs.length > 0) {
        let lastLog = app.logs[app.logs.length - 1];
        newType = lastLog.type == LogType.START ? LogType.STOP : LogType.START;
    }

    // TODO(sal): NOT SAFE! Move to a backend function
    let newLog = new Log(newType);
    await app.log_collection.insertOne(newLog);

    app.logs.push(newLog);
    app.totalUsedTime = calculateTotalCompletedTime(app.logs);

    setupTimer();
}

function setupTimer() {
    if (app.logs == null || app.logs.length == 0) {
        stopTimer();
        if (app.logs == null) {
            // Download logs only when logs is null so we're not stuck in an infinite loop
            downloadLogsForCurrentUser().then(() => setupTimer())
        }
        return;
    }
    let lastLog = app.logs[app.logs.length - 1];
    if (lastLog.type == LogType.START) {
        startTimer();
    } else if (lastLog.type == LogType.STOP) {
        stopTimer();
    }
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showLogin() {
    document.getElementById("login").style.display = "";
}

function showRegister() {
    // Hide login elements
    document.getElementById("login").style.display = "none";
    // Show the register elements
    document.getElementById("register").style.display = "";
}

function forgotPassword() {
    // use the loginEmail field.
    alert("implement me!!");
}

function showConfirmEmail() {
    document.getElementById("register").style.display = "none";
    document.getElementById("checkEmail").style.display = "";
}

async function saveUsername() {
    let username = document.getElementById("username").value;

    // TODO(sal): Validate username

    initMongo();

    if (app.realm.currentUser.customData.username == null) {
        // Create the the user's custom data document
        await app.user_data_collection.insertOne(
            {
                owner_id: app.realm.currentUser.id,
                username: username
            },
        );
    } else {
        // Update the user's custom data document
        await app.user_data_collection.updateOne(
            { owner_id: app.realm.currentUser.id },
            { $set: { username: username } }
        );
    }

    // Refresh the user's local customData property
    await app.realm.currentUser.refreshCustomData();

    showMain();
}

function showSetUsername() {
    // Hide login elements
    document.getElementById("login").style.display = "none";
    document.getElementById("setUsername").style.display = "";
}

function showMain() {
    if (app.realm.currentUser.customData.username == null) {
        showSetUsername();
        return;
    }

    // Hide login elements
    document.getElementById("login").style.display = "none";
    // Hide set username
    document.getElementById("setUsername").style.display = "none";
    // Show Main elements
    document.getElementById("main").style.display = "";
    document.getElementById("welcome").innerHTML = "<b>Welcome " + app.realm.currentUser.customData.username + "!</b>"
    // Initialize mongo client and collections
    initMongo();
    setupTimer();

    if (app.realm.currentUser.customData.isGlobalAdmin) {
        showAdmin();
    }
}

async function showAdmin() {
    document.getElementById("admin").style.display = "";
    let timesTable = document.getElementById("times");

    const users = await app.user_data_collection.find(
        { },
        { username: 1, owner_id: 1 }
    );

    for (const user of users) {
        let row = timesTable.insertRow(-1);
        let nameCell = row.insertCell(-1);
        let timeCell = row.insertCell(-1);
        let statusCell = row.insertCell(-1);

        nameCell.innerHTML = user.username;

        let logs = await downloadLogs(user.owner_id);
        let totalTime = calculateTotalCompletedTime(logs)
        let usedTime = totalTime + timeSinceLastLogStarted(logs);
        let timeLeft = app.maxHoursPerWeek - usedTime;
        let sign = timeLeft < 0 ? "-": "";
        timeCell.style = backgroundColorForValue(timeLeft);
        timeCell.innerHTML = sign + msToTime(Math.abs(timeLeft));

        let lastType = LogType.STOP;
        if (logs && logs.length > 0) {
            lastType = logs[logs.length -1].type;
        }
        statusCell.innerHTML = lastType;
    }
}

// Old logs were created using a single key as the owner_id and
// a unique username to distinguish between users.
// Use the username field to find and fix the owner_id
// NOTE: this function only works if an admin executes it.
// TODO(sal): Remove, keeping it as a snippet for now.
async function fixOldDataUsername() {
    let username = document.getElementById("fixUsername").value;

    const userData = await app.user_data_collection.findOne({ username: username });

    await app.log_collection.updateMany(
        { username: username },
        { $set: { owner_id: userData.owner_id } }
    );

    alert("Completed");
}

function confirmUser() {
    let urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get("token");
    let tokenId = urlParams.get("tokenId");

    // TODO(sal): Validate token and tokenId

    app.realm.emailPasswordAuth.confirmUser({ token, tokenId }).then(() => {
        // Remove the URL query params by redirecting to the pathname
        window.location = window.location.pathname;
    });
}

function init() {
    // Hide all the states
    document.getElementById("login").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("checkEmail").style.display = "none";
    document.getElementById("main").style.display = "none";
    document.getElementById("setUsername").style.display = "none";
    document.getElementById("admin").style.display = "none";

    loadLocalStorage();

    let appId = localStorage.getItem("appId");

    if (appId == null || appId == "") {
        showLogin();
    } else {
        // Initialize the app global instance
        app.realm = new Realm.App({ id: appId });

        if (refreshTokenValid()) {
            showMain();
        } else {
            let urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("confirm")) {
                confirmUser();
            } else {
                // Logged out, or Refresh Token expired
                showLogin();
            }
        }
    }
}

init();