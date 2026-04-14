import { db } from "./firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export const sendFriendRequest = async (toUserId: string, fromUserId: string) => {
  await updateDoc(doc(db, "users", toUserId), {
    requests: arrayUnion(fromUserId)
  });
};