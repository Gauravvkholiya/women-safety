import { useEffect, useState } from "react";
import { auth, db } from "../app/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";

const Friends = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myDocId, setMyDocId] = useState<string>("");

  // ✅ Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // ✅ Fetch everything when user is ready
  useEffect(() => {
    if (currentUser) {
      fetchAll();
    }
  }, [currentUser]);

  const fetchAll = async () => {
    await fetchUsers();
    await fetchFriends();
    await fetchRequests();
  };

  // ✅ Fetch all users
  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const allUsers = snapshot.docs.map((d) => ({ ...d.data(), docId: d.id }));
    setUsers(allUsers);

    // Save my own document ID (Firestore doc ID, not UID)
    const myDoc = snapshot.docs.find((d) => d.data().uid === currentUser.uid);
    if (myDoc) setMyDocId(myDoc.id);
  };

  // ✅ Fetch friends list from my user document
  const fetchFriends = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const myDoc = snapshot.docs.find((d) => d.data().uid === currentUser.uid);
    const myData = myDoc?.data();

    const friendList = snapshot.docs
      .map((d) => ({ ...d.data(), docId: d.id }))
      .filter((u) => myData?.friends?.includes(u.uid));

    setFriends(friendList);
  };

  // ✅ Fetch sent + received requests
  const fetchRequests = async () => {
    const snapshot = await getDocs(collection(db, "friendRequests"));

    const sent = snapshot.docs
      .filter((d) => d.data().from === currentUser.uid && d.data().status === "pending")
      .map((d) => ({ ...d.data(), docId: d.id }));

    const received = snapshot.docs
      .filter((d) => d.data().to === currentUser.uid && d.data().status === "pending")
      .map((d) => ({ ...d.data(), docId: d.id }));

    setSentRequests(sent);
    setReceivedRequests(received);
  };

  // ✅ Send friend request
  const sendRequest = async (toUser: any) => {
    const docRef = await addDoc(collection(db, "friendRequests"), {
      from: currentUser.uid,
      to: toUser.uid,
      status: "pending",
    });

    setSentRequests((prev) => [
      ...prev,
      { from: currentUser.uid, to: toUser.uid, status: "pending", docId: docRef.id },
    ]);
  };

  // ✅ Accept incoming request → add each other as friends
  const acceptRequest = async (request: any) => {
    // Find both users' Firestore document IDs
    const snapshot = await getDocs(collection(db, "users"));

    const myDoc = snapshot.docs.find((d) => d.data().uid === currentUser.uid);
    const senderDoc = snapshot.docs.find((d) => d.data().uid === request.from);

    if (!myDoc || !senderDoc) return;

    // Add each other to friends array
    await updateDoc(doc(db, "users", myDoc.id), {
      friends: arrayUnion(request.from),
    });

    await updateDoc(doc(db, "users", senderDoc.id), {
      friends: arrayUnion(currentUser.uid),
    });

    // Delete the friend request doc
    await deleteDoc(doc(db, "friendRequests", request.docId));

    // Update local state
    const senderData = { ...senderDoc.data(), docId: senderDoc.id };
    setFriends((prev) => [...prev, senderData]);
    setReceivedRequests((prev) => prev.filter((r) => r.docId !== request.docId));
  };

  // ✅ Decline incoming request
  const declineRequest = async (request: any) => {
    await deleteDoc(doc(db, "friendRequests", request.docId));
    setReceivedRequests((prev) => prev.filter((r) => r.docId !== request.docId));
  };

  // ✅ Remove friend (both sides)
  const removeFriend = async (friendUid: string) => {
    const snapshot = await getDocs(collection(db, "users"));

    const myDoc = snapshot.docs.find((d) => d.data().uid === currentUser.uid);
    const friendDoc = snapshot.docs.find((d) => d.data().uid === friendUid);

    if (!myDoc || !friendDoc) return;

    await updateDoc(doc(db, "users", myDoc.id), {
      friends: arrayRemove(friendUid),
    });

    await updateDoc(doc(db, "users", friendDoc.id), {
      friends: arrayRemove(currentUser.uid),
    });

    setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
  };

  // 🔍 Helpers
  const isFriend = (uid: string) => friends.some((f) => f.uid === uid);
  const isSentRequest = (uid: string) => sentRequests.some((r) => r.to === uid);
  const isReceivedRequest = (uid: string) => receivedRequests.some((r) => r.from === uid);

  // Get the sender's user info for display
  const getSenderInfo = (fromUid: string) => users.find((u) => u.uid === fromUid);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <Navbar />

      <div className="max-w-4xl mx-auto mt-10 px-4 space-y-10">

        {/* ✅ INCOMING REQUESTS */}
        {receivedRequests.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">
              Friend Requests{" "}
              <span className="text-sm bg-purple-500 text-white rounded-full px-2 py-0.5 ml-1">
                {receivedRequests.length}
              </span>
            </h2>
            <div className="bg-white rounded-xl border divide-y">
              {receivedRequests.map((req) => {
                const sender = getSenderInfo(req.from);
                return (
                  <div key={req.docId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-sm font-bold text-purple-700">
                        {sender?.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <p className="text-sm">{sender?.email ?? req.from}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptRequest(req)}
                        className="bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-purple-600 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req)}
                        className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 👥 YOUR FRIENDS */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Friends</h2>
          {friends.length === 0 ? (
            <p className="text-gray-400 text-sm">No friends yet. Add some below!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.uid}
                  className="bg-white rounded-xl shadow p-4 flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-full bg-purple-200 flex items-center justify-center text-xl font-bold text-purple-700 mb-2">
                    {friend.email?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm mb-3 text-center truncate w-full text-center">
                    {friend.email}
                  </p>
                  <button
                    onClick={() => removeFriend(friend.uid)}
                    className="text-xs px-3 py-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition w-full"
                  >
                    Remove Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ⏳ PENDING (sent by me) */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Pending Requests Sent</h2>
          {sentRequests.length === 0 ? (
            <p className="text-gray-400 text-sm">No pending requests.</p>
          ) : (
            <div className="bg-white rounded-xl border divide-y">
              {sentRequests.map((req) => {
                const toUser = users.find((u) => u.uid === req.to);
                return (
                  <div key={req.docId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                        {toUser?.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <p className="text-sm">{toUser?.email ?? req.to}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ➕ FIND FRIENDS */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Find Friends</h2>
          <div className="bg-white rounded-xl border divide-y">
            {users
              .filter(
                (u) =>
                  u.uid !== currentUser?.uid &&
                  !isFriend(u.uid) &&
                  !isSentRequest(u.uid) &&
                  !isReceivedRequest(u.uid)
              )
              .map((user) => (
                <div key={user.uid} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-600">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <button
                    onClick={() => sendRequest(user)}
                    className="bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-purple-600 transition"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            {users.filter(
              (u) =>
                u.uid !== currentUser?.uid &&
                !isFriend(u.uid) &&
                !isSentRequest(u.uid) &&
                !isReceivedRequest(u.uid)
            ).length === 0 && (
              <p className="p-4 text-gray-400 text-sm">No new users to add.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Friends;
