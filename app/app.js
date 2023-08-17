"use strict";

let app = {
    realm: null,
    mongo: null,
    log_collection: null,
    user_data_collection: null,
    logs: null,
    totalUsedTime: 0,
    timerId: 0,
    maxHoursPerWeek: 10*60*60000, // 10HRS;  min * milliseconds = hours
};

const MONGO = {
    CLUSTER_NAME: "mongodb-atlas",
    DATABASE_NAME: "computer-time",
    LOG_COLLECTION_NAME: "log",
    USER_DATA_COLLECTION_NAME: "user_data"
};

const LogType ={
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

    // TODO: validate appId, email and password

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
    
    // Re-initialize the app global instance with the new appId
    if (app.realm == null || app.realm.id != appId) {
        // This code is not tested as I only have one Realm AppID.
        app.realm = new Realm.App({ id: appId });
    }
    // Save the AppId
    localStorage.setItem("appId", appId);

    // TODO: validate appId, email and password

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

async function downloadLog() {
    // Set to Monday of this week
    var date = new Date();
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    date.setHours(0, 0, 0, 0);

    // Download log
    let logs = await app.log_collection.find({ owner_id: app.realm.currentUser.id, timestamp: {$gt: date} });
    app.logs = logs.sort();

    calculateTotalTime();
}

function calculateTotalTime() {
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

function initMongo() {
    app.mongo = app.realm.currentUser.mongoClient(MONGO.CLUSTER_NAME);
    app.log_collection = app.mongo.db(MONGO.DATABASE_NAME).collection(MONGO.LOG_COLLECTION_NAME);
    app.user_data_collection = app.mongo.db(MONGO.DATABASE_NAME).collection(MONGO.USER_DATA_COLLECTION_NAME);
}

function loadLocalStorage() {
    let appId = localStorage.getItem("appId");

    if (appId) {
        document.getElementById("loginAppId").value = appId;
        document.getElementById("registerAppId").value = appId;
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
    let newLog = new Log(newType);
    const result = await app.log_collection.insertOne(newLog);
    console.log(result);
    app.logs.push(newLog);

    calculateTotalTime();

    setupTimer();
}

function setupTimer() {
    if (app.logs == null || app.logs.length == 0) {
        stopTimer();
        if (app.logs == null) {
            // Download logs only when logs is null so we're not stuck in an infinite loop
            downloadLog().then(() => setupTimer())
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

    // TODO: validate username

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

function showAdmin() {
    document.getElementById("admin").style.display = "";
}

// Old logs were created using a single key as the owner_id and
// a unique username to distinguish between users.
// Use the username field to find and fix the owner_id
async function fixOldDataUsername() {
    let username = document.getElementById("fixUsername").value;

    const userData = await app.user_data_collection.findOne({ username: username });
    
    await app.log_collection.updateMany(
        { username: username },
        { $set: { owner_id: userData.owner_id } }
    );

    alert("Completed");
}

// Confirm email and automatically take user to the logged-in screen
function confirm() {
    let urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get("token");
    let tokenId = urlParams.get("tokenId");

    // TODO: validate token and tokenId

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
        // TODO: check appId in login and register websites.
        app.realm = new Realm.App({ id: appId });

        if (refreshTokenValid()) {
            // Hacky/Temp way to logout server users
            if (app.realm.currentUser.profile.email == null) {
                logout();
                return;
            }
            showMain();
        } else {
            let urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("confirm")) {
                confirm();
            } else {
                // Logged out, or Refresh Token expired
                showLogin();
            }
        }
    }
}

init();