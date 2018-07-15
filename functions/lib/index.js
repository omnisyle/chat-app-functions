"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const auth = admin.auth();
function getUsers(uids) {
    return new Promise((resolve, reject) => {
        const requests = uids.map((uid) => auth.getUser(uid));
        Promise.all(requests)
            .then(values => {
            const results = values.map((value) => value);
            resolve(results);
        }).catch(function (error) {
            console.log("Error listing users:", error);
            reject(error);
        });
    });
}
exports.getMembersInfo = functions.https.onRequest((request, response) => {
    const idToken = request.body.token;
    const memberUids = request.body.memberUids;
    auth.verifyIdToken(idToken).then((decodedToken) => {
        getUsers(memberUids).then((users) => {
            const responseJson = {
                users: users
            };
            response.status(200);
            response.send(JSON.stringify(responseJson));
        }).catch(() => {
            response.status(422);
            response.send("Cannot get users information");
        });
    }).catch((error) => {
        console.log("Verify token error: ", error);
        response.status(401);
        response.send("Unauthorized");
    });
});
//# sourceMappingURL=index.js.map