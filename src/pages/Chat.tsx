import { useEffect, useRef, useState } from "react";
import { auth, db } from "../app/firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";
import {
  getConversationId,
  sendMessage,
  subscribeToMessages,
} from "../app/ChatService";

const Chat = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // ✅ Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // ✅ Fetch friends when user ready
  useEffect(() => {
    if (currentUser) fetchFriends();
  }, [currentUser]);

  // ✅ Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Subscribe to conversation when a friend is selected
  useEffect(() => {
    if (!currentUser || !selectedFriend) return;

    // Cleanup previous listener
    if (unsubRef.current) unsubRef.current();

    const convId = getConversationId(currentUser.uid, selectedFriend.uid);
    const unsub = subscribeToMessages(convId, (msgs) => {
      setMessages(msgs);
    });

    unsubRef.current = unsub;
    return () => unsub();
  }, [selectedFriend, currentUser]);

  const fetchFriends = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const myDoc = snapshot.docs.find((d) => d.data().uid === currentUser.uid);
    const myData = myDoc?.data();

    const friendList = snapshot.docs
      .map((d) => ({ ...d.data(), docId: d.id }))
      .filter((u) => myData?.friends?.includes(u.uid));

    setFriends(friendList);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedFriend) return;
    setLoading(true);

    const convId = getConversationId(currentUser.uid, selectedFriend.uid);
    await sendMessage(convId, currentUser.uid, newMessage.trim());

    setNewMessage("");
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 max-w-5xl mx-auto w-full mt-6 px-4 pb-6 gap-4" style={{ height: "calc(100vh - 100px)" }}>

        {/* ── SIDEBAR: Friends List ── */}
        <aside className="w-72 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden shrink-0">
          <div className="px-5 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your friends</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {friends.length === 0 && (
              <div className="p-5 text-sm text-gray-400 text-center mt-4">
                No friends yet. Add some from the Friends page!
              </div>
            )}

            {friends.map((friend) => (
              <button
                key={friend.uid}
                onClick={() => {
                  setSelectedFriend(friend);
                  setMessages([]);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-purple-50 ${
                  selectedFriend?.uid === friend.uid
                    ? "bg-purple-50 border-l-4 border-purple-500"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-sm font-bold text-purple-700 shrink-0">
                  {friend.email?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {friend.email}
                  </p>
                  <p className="text-xs text-green-500">Friend</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── MAIN: Chat Window ── */}
        <main className="flex-1 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden">

          {!selectedFriend ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-4xl mb-4">
                💬
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                Select a friend to start chatting
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Your conversations will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-4 border-b flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-sm font-bold text-purple-700">
                  {selectedFriend.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {selectedFriend.email}
                  </p>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 mt-10">
                    No messages yet. Say hello! 👋
                  </p>
                )}

                {messages.map((msg) => {
                  const isMe = msg.senderUid === currentUser.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar for friend */}
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700 mr-2 mt-1 shrink-0">
                          {selectedFriend.email?.[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                        <div
                          className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? "bg-purple-500 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-xs text-gray-400 mt-1 px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t flex items-end gap-3 shrink-0">
                <textarea
                  rows={1}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send)"
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
                  style={{ maxHeight: "120px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Chat;
