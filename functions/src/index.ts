import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const auth: admin.auth.Auth = admin.auth();
const firestore: admin.firestore.Firestore = admin.firestore();

type Channel = {
  id: string,
  lastMessage?: {
    body: string,
    authorId: string,
    createdAt: any
  },
  members: {
    [key: string]: boolean
  },
  createdAt: any,
  updatedAt: any,
}

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

function unique(arr: any[]) : any[] {
  return arr.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}

export const getChannels = functions.https.onRequest((request, response) => {
  const idToken: string = request.body.token;

  auth.verifyIdToken(idToken).then((decodedToken) => {
    const currentUserUid: string = decodedToken.uid;
    const query: admin.firestore.Query = firestore
      .collection("channels")
      .where(`members.${ currentUserUid }`, "==", true);

    query.get().then((querySnapshot: admin.firestore.QuerySnapshot) => {

      const channelData = querySnapshot.docs.map((item) => {

      });
    });

  }).catch((error) => {
    console.log("Verify token error: ", error);
    response.status(401);
    response.send("Unauthorized");
  });
});
