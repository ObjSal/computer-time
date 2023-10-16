# Computer Time

A simple site track my kid's computer time, tasks & rewards with bitcoin

## Requirements
- [Atlas Realm MongoDB account](https://realm.mongodb.com)
  - Enable Email Authentication
  - Use your own Realm App ID
- Use the [demo site](https://objsal.github.io/computer-time/) or host it yourself

## Configuration

### 1. Create a Cluster in MongoDB
Atlas > Data Services > Database > [Create]; name it _**mongodb-atlas**_.
If you want to change the name, change the value for `CLUSTER_NAME` in `app.js`.
Below is my configuration:

```
* Shared
* Cloud Provider:
* Region: Oregon (us-west-2)
* Cluster Tier: M0 Sandbox (Shared RAM, 512 MB Storage)
* MongoDB 6.0
```

### 2. Create a Database in the Cluster
Atlas > Data Services > Database > Cluster0 > Collection > [Create Database]; name it **_computer-time_**.
If you want to change the name, change the value for `DATABASE_NAME` in `app.js`.

### 3. Create a Real app
Atlas > App Services > [Create a New App]

### 4. Create collections
Atlas > App Services > App > Schema > Collections > Add a collection.
Make sure you create the collections within the **_computer-time_** database and create the below schemas:

**log**
```
{
  "title": "log",
  "properties": {
    "_id": {
      "bsonType": "objectId"
    },
    "timestamp": {
      "bsonType": "date"
    },
    "type": {
      "bsonType": "string"
    },
    "userAgent": {
      "bsonType": "string"
    },
    "owner_id": {
      "bsonType": "string"
    }
  }
}
```

**tasks**
```
{
  "properties": {
    "_id": {
      "bsonType": "objectId"
    },
    "timestamp": {
      "bsonType": "date"
    },
    "description": {
      "bsonType": "string"
    },
    "sats": {
      "bsonType": "int"
    },
    "qrcode": {
      "bsonType": "string"
    },
    "status": {
      "bsonType": "string"
    },
    "owner_id": {
      "bsonType": "string"
    }
  },
  "required": [
    "_id",
    "timestamp",
    "description",
    "sats",
    "qrcode",
    "status"
  ]
}
```
Make sure you name the first one **log** and the other one **tasks**. otherwise update you app.js.

## Setup collection rules
Atlas > App Services > App > Rules > Collections > mongodb-atlas > computer-time

Rules allow set appropriate permissions for reading, writing on data, I have the following rules to each of the collections created above

**log**
```
{
  "roles": [
    {
      "name": "admin",
      "apply_when": {
        "%%user.custom_data.isGlobalAdmin": true
      },
      "document_filters": {
        "write": true,
        "read": true
      },
      "read": true,
      "write": true,
      "insert": true,
      "delete": true,
      "search": true
    },
    {
      "name": "user",
      "apply_when": {},
      "document_filters": {
        "write": {
          "owner_id": "%%user.id"
        },
        "read": {
          "owner_id": "%%user.id"
        }
      },
      "read": true,
      "write": true,
      "insert": true,
      "delete": false,
      "search": true
    }
  ]
}
```

**tasks**
```
{
  "roles": [
    {
      "name": "Admin",
      "apply_when": {
        "%%user.custom_data.isGlobalAdmin": true
      },
      "document_filters": {
        "write": true,
        "read": true
      },
      "read": true,
      "write": true,
      "insert": true,
      "delete": true,
      "search": true
    },
    {
      "name": "readAllWriteOwn",
      "apply_when": {},
      "document_filters": {
        "write": {
          "owner_id": {
            "$in": [
              null,
              "%%user.id"
            ]
          }
        },
        "read": true
      },
      "read": true,
      "write": true,
      "insert": true,
      "delete": false,
      "search": true
    }
  ]
}
```

## 5. Setup App Users
Atlas > App Services > App > App Users > Authentication Providers; **Only** enable Email/Password.

Atlas > App Services > App > App Users > User Settings > Enable Custom User Data; use the following configuration:
```
Cluster Name: mongodb-atlas
Database Name: computer-time
Collection Name: user_data
User ID Field: owener_id 
```
I use the Custom User Data to store `username` and to set admin privileges using the `isGlobalAdmin` property 

### 6. Enable [Device Sync](https://www.mongodb.com/atlas/app-services/device-sync)
Atlas > App Services > App > Device Sync
1. Flexible
2. Development Mode: Off
3. Queryable Fields: _id, owner_id

### 7. Test your MongoDB configuration with the demo site
No compiling necessary, just launch the [demo site](https://objsal.github.io/computer-time/) and enter your App Id, email and password, and you should be all set.

### Tips
- Use the `appId` URL param to send your Realm App ID, i.e.: `index.html?appId=<blah-blah-blah>`

### Notes
- Atlas, MongoDB and Realm are not free, but they do offer free tiers.
- This is an experiment, don't use it for production applications. DYOR.
- A lot of the logic should exist in a proper backend environment.
- License: GNU GENERAL PUBLIC LICENSE

_Project developed with ♥ from AZ with HTML, JS and [Mongo Realm Web SDK](https://www.mongodb.com/docs/realm/web/)_
