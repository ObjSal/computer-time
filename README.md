# Computer Time

A simple website to help me track the time my children spend in the computer.

## Requierements
- Atlas Realm App ID
- Atlas Realm Login Key
- Change in `app.js`:
  - `MONGO.CLUSTER_NAME`
  - `MONGO.DATABASE_NAME`
  - `MONGO.COLLECTION_NAME`

## Project developed with:
1. HTML, JavaScript
2. [Mongo Realm Web SDK](https://www.mongodb.com/docs/realm/web/) (via CDN)
3. [Codespaces](https://github.com/codespaces)

## MongoDB Atlas Configuration
##### Data Services > [Database](https://www.mongodb.com/atlas/database)
1. Shared
2. Cloud Provider:
3. Region: Oregon (us-west-2)
4. Cluster Tier: M0 Sandbox (Shared RAM, 512 MB Storage)
5. MongoDB 6.0

##### App Services > [Device Sync](https://www.mongodb.com/atlas/app-services/device-sync)
1. Flexible
2. Development Mode: Off
3. Queryable Fields: _id, ownser_id, username

##### App Services > Authentication
1. Enable API Keys
2. Save private key (this will be used to login)

##### App Services > Schema
1. Add a collection
2. Add Schema
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
    "username": {
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

##### App Services > Rules
```
{
  "name": "user",
  "document_filters": {
    "write": {
        "owner_id": "%%user.id"
    },
    "read": {
        "owner_id": "%%user.id"
    }
  }
}
```

##### VSCode plugins:
- Live Server
- Markdown Preview Enhanced

