"use strict";

let app = null;

async function loginApiKey(apiKey) {
    // Create an API Key credential
    const credentials = Realm.Credentials.apiKey(apiKey);
  
    // Authenticate the user
    const user = await app.logIn(credentials);
  
    // `App.currentUser` updates to match the logged in user
    console.assert(user.id === app.currentUser.id);
  
    return user;
  }
  
  async function login() {
    var appId = document.getElementById("appId").value;
    app = new Realm.App({ id: appId });

    var key = document.getElementById("key").value;
    const user = await loginApiKey(key);
  }