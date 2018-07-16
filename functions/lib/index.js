"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
admin.initializeApp();
const auth = admin.auth();
const firestore = admin.firestore();
const corsHandler = cors({ origin: true });
function getUsers(uids) {
    return new Promise((resolve, reject) => {
        const requests = uids.map((uid) => auth.getUser(uid));
        Promise.all(requests)
            .then((values) => {
            const results = values.map((value) => {
                return {
                    id: value.uid,
                    displayName: value.displayName,
                    email: value.email,
                    profileUrl: value.photoURL,
                };
            });
            resolve(results);
        }).catch(function (error) {
            console.log("Error listing users:", error);
            reject(error);
        });
    });
}
function unique(arr) {
    return arr.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });
}
function filterMemberIds(channels) {
    const allMemberIds = channels.reduce((results, channel) => {
        const channelMemberIds = Object.keys(channel.members) || [];
        results.concat(channelMemberIds);
        return results;
    }, []);
    return unique(allMemberIds);
}
function transformSnapshotToChannel(snapshot) {
    return snapshot.map((item) => {
        const docData = item.data();
        return {
            id: item.id,
            members: docData.members,
            createdAt: docData.createdAt,
            updatedAt: docData.updatedAt,
        };
    });
}
function getMembers(channels) {
    const memberIds = filterMemberIds(channels);
    const getUsersRequest = getUsers(memberIds);
    return Promise.all([channels, getUsersRequest]);
}
function queryChannelsByUserId(decodedToken) {
    const currentUserUid = decodedToken.uid;
    const query = firestore
        .collection("channels")
        .where(`members.${currentUserUid}`, "==", true);
    const queryRequest = query.get();
    const transformPromise = queryRequest.then((querySnapshot) => {
        const channelData = transformSnapshotToChannel(querySnapshot.docs);
        return channelData;
    });
    return transformPromise;
}
exports.getChannels = functions.https.onRequest((request, response) => {
    corsHandler(request, response, () => {
        const idToken = request.headers["Authorization"];
        console.log(idToken);
        auth.verifyIdToken(idToken)
            .then(queryChannelsByUserId)
            .then(getMembers)
            .then(([channels, members]) => {
            const res = {
                channels,
                members
            };
            response.status(200);
            response.send(JSON.stringify(res));
        }).catch((error) => {
            console.log(error);
            response.status(422);
            response.send("Cannot process request");
        });
    });
});
//# sourceMappingURL=index.js.map