import { useEffect, useState } from "react";
import { auth, db } from "../app/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";

const Requests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ Get logged-in user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // ✅ Fetch incoming requests
  const fetchRequests = async () => {
    if (!currentUser) return;

    const snapshot = await getDocs(collection(db, "friendRequests"));

    const incoming = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (req: any) =>
          req.to === currentUser.uid && req.status === "pending"
      );

    setRequests(incoming);
  };

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
  }, [currentUser]);

  // ✅ Accept request
  const acceptRequest = async (req: any) => {
  try {
    // update request status
    await updateDoc(doc(db, "friendRequests", req.id), {
      status: "accepted",
    });

    // ✅ add to BOTH users
    await updateDoc(doc(db, "users", currentUser.uid), {
      friends: arrayUnion(req.from),
    });

    await updateDoc(doc(db, "users", req.from), {
      friends: arrayUnion(currentUser.uid),
    });

    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  } catch (err) {
    console.error(err);
  }
};

  // ❌ Reject request
  const rejectRequest = async (req: any) => {
    try {
      await updateDoc(doc(db, "friendRequests", req.id), {
        status: "rejected",
      });

      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <Navbar />

      <div className="max-w-2xl mx-auto mt-10 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Friend Requests
        </h2>

        <div className="bg-white rounded-2xl shadow-md border border-gray-200 divide-y">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex justify-between items-center p-4"
            >
              <p className="text-gray-900">
                User ID: {req.from}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => acceptRequest(req)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg"
                >
                  Accept
                </button>

                <button
                  onClick={() => rejectRequest(req)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <p className="text-center text-gray-500 p-4">
              No requests
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Requests;