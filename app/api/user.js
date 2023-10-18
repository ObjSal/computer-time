'use strict';

const UserAPI = (() => {

    async function saveUsername(username) {
        if (RealmWrapper.currentUsername() == null) {
            // Create the user's custom data document
            await RealmWrapper.users_collection.insertOne(
                {
                    owner_id: RealmWrapper.currentUserId(),
                    username: username
                },
            );
        } else {
            // Update the user's custom data document
            await RealmWrapper.users_collection.updateOne(
                { owner_id: RealmWrapper.currentUserId() },
                { $set: { username: username } }
            );
        }

        // Refresh the user's local customData property
        await RealmWrapper.refreshCustomData();
    }

    async function findUsers(filter, options) {
        return RealmWrapper.users_collection.find(filter, options);
    }

    async function findUser(filter) {
        return RealmWrapper.users_collection.findOne(filter);
    }

    return {
        saveUsername,
        findUsers,
        findUser
    }
})();