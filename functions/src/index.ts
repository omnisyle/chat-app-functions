import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const auth : admin.auth.Auth = admin.auth();

function getUsers(uids): Promise<admin.auth.UserRecord[]> {

  return new Promise<admin.auth.UserRecord[]>((resolve, reject) => {
    const requests = uids.map((uid) => auth.getUser(uid));

    Promise.all(requests)
      .then(values => {
        const results = values.map((value) => value as admin.auth.UserRecord);
        resolve(results);
      }).catch(function (error) {
        console.log("Error listing users:", error);
        reject(error);
      });
  });
}

export const getMembersInfo = functions.https.onRequest((request, response) => {
  const idToken: string = request.body.token;
  const memberUids: string[] = request.body.memberUids;

  auth.verifyIdToken(idToken).then((decodedToken) => {
    getUsers(memberUids).then((users: admin.auth.UserRecord[]) => {
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
