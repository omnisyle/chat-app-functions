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

type Member = {
  id: string,
  displayName: string,
  email: string,
  profileUrl?: string,
}

type GetChannelsResponse = {
  channels: Channel[],
  members: Member[],
}

type UserUid = string;

function getUsers(uids: string[]): Promise<Member[]> {

  return new Promise<Member[]>((resolve, reject) => {
    const requests = uids.map((uid) => auth.getUser(uid));

    Promise.all(requests)
      .then((values: admin.auth.UserRecord[])=> {
        const results = values.map((value: admin.auth.UserRecord) => {
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

function unique(arr: any[]) : any[] {
  return arr.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}

function filterMemberIds(currentUserUid: string, channels: Channel[]) : UserUid[]{
  const allMemberIds = channels.reduce((results: string[], channel: Channel) : string[] => {
    const channelMemberIds = Object.keys(channel.members) || [];
    results.concat(channelMemberIds);
    return results;
  }, []);

  return unique(allMemberIds);
}

function transformSnapshotToChannel(snapshot: admin.firestore.DocumentSnapshot[]) : Channel[] {

  return snapshot.map((item: admin.firestore.DocumentSnapshot) => {
    const docData = item.data();
    return {
      id: item.id,
      members: docData.members,
      createdAt: docData.createdAt,
      updatedAt: docData.updatedAt,
    };
  });
}

function getMembers([currentUserUid, channels]): Promise<[Channel[], Member[]]> {
  const memberIds = filterMemberIds(currentUserUid, channels);
  const getUsersRequest: Promise<Member[]> = getUsers(memberIds);
  return Promise.all([channels, getUsersRequest]);
}

function queryChannelsByUserId(decodedToken: admin.auth.DecodedIdToken) : Promise<[UserUid, Channel[]]> {
  const currentUserUid: UserUid = decodedToken.uid;
  const query: admin.firestore.Query = firestore
    .collection("channels")
    .where(`members.${ currentUserUid }`, "==", true);

  const queryRequest: Promise<admin.firestore.QuerySnapshot> = query.get();

  const transformPromise: Promise<Channel[]> = queryRequest.then(
    (querySnapshot: admin.firestore.QuerySnapshot) => {

      const channelData: Channel[] = transformSnapshotToChannel(querySnapshot.docs);
      return channelData;
    });

  return Promise.all([currentUserUid, transformPromise]);
}

export const getChannels = functions.https.onRequest((request, response) => {
  const idToken: string = request.body.token;

  auth.verifyIdToken(idToken)
    .then(queryChannelsByUserId)
    .then(getMembers)
    .then(([channels, members]) => {
      const res : GetChannelsResponse = {
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
