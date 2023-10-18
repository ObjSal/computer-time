// noinspection JSUnusedGlobalSymbols

'use strict';

const RealmWrapper = (() => {

    let instance = null;
    let mongo = null;

    const CONFIG = {
        CLUSTER_NAME: "mongodb-atlas",
        DATABASE_NAME: "computer-time",
        LOG_COLLECTION_NAME: "log",
        TASKS_COLLECTION_NAME: "tasks",
        USER_DATA_COLLECTION_NAME: "user_data"
    };

    return {

        users_collection: null,
        tasks_collection: null,
        logs_collection: null,

        init: function (appId) {
            if (instance == null || instance.id !== appId) {
                // This code is not tested as I only have one Realm AppID.
                instance = new Realm.App({ id: appId });
            }
            this.initMongo();
        },

        initMongo: function() {
            if (!instance.currentUser) {
                return;
            }
            mongo = instance.currentUser.mongoClient(CONFIG.CLUSTER_NAME);
            this.users_collection = mongo.db(CONFIG.DATABASE_NAME).collection(CONFIG.USER_DATA_COLLECTION_NAME);
            this.tasks_collection = mongo.db(CONFIG.DATABASE_NAME).collection(CONFIG.TASKS_COLLECTION_NAME);
            this.logs_collection = mongo.db(CONFIG.DATABASE_NAME).collection(CONFIG.LOG_COLLECTION_NAME);
        },

        refreshCustomData: async function() {
            return instance.currentUser.refreshCustomData();
        },

        currentUserId: function() {
            return instance.currentUser.id;
        },

        currentUsername: function() {
            return instance.currentUser.customData["username"];
        },

        isGlobalAdmin: function() {
            return instance.currentUser.customData["isGlobalAdmin"];
        },

        loginWithEmail: async function (email, password) {
            const user = await instance.logIn(Realm.Credentials.emailPassword(email, password));
            this.initMongo();
            return user;
        },

        isLoggedIn: function () {
            if (!instance) return null;
            if (!instance.currentUser) return null;
            return instance.currentUser.isLoggedIn;
        },

        logOut: async function() {
            let user = instance.currentUser;
            if (user && user.isLoggedIn) {
                return user.logOut();
            } else {
                // TODO(sal): test!!
                return Promise.resolve();
            }
        },

        isRefreshTokenValid: function () {
            let user = instance.currentUser;
            if (user && user.isLoggedIn) {
                let refreshTokenJWT = window.jwt_decode(user.refreshToken);
                // Expiration is unix epoch timestamps in seconds
                let expiration = refreshTokenJWT.exp;
                // multiply by 1,000 to convert to milliseconds
                let expDate = new Date(expiration * 1000);
                let now = new Date();
                return expDate > now;
            }
            return false;
        },

        confirmUser: async function(details) {
            return instance.emailPasswordAuth.confirmUser(details);
        },

        registerUser: async function (details) {
            return instance.emailPasswordAuth.registerUser(details);
        }
    }
})();