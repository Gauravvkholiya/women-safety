import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

// Generate a consistent conversation ID between two users (sorted so A-B === B-A)
export const getConversationId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join("_");
};

// Send a message to a conversation
export const sendMessage = async (
  conversationId: string,
  senderUid: string,
  text: string
) => {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );
  await addDoc(messagesRef, {
    text,
    senderUid,
    createdAt: serverTimestamp(),
  });
};

// Subscribe to real-time messages in a conversation
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: any[]) => void
) => {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  const unsub = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(msgs);
  });

  return unsub; // call this to unsubscribe
};
