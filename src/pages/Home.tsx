import { useEffect, useRef, useState } from "react";
import { auth, db } from "../app/firebase";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar";
import { doc, setDoc } from "firebase/firestore";
import AddFriend from "../components/AddFriend";
import {
  getConversationId,
  sendMessage,
  subscribeToMessages,
} from "../app/ChatService";

const Home = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [alertSending, setAlertSending] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [destination, setDestination] = useState("");
const [isTracking, setIsTracking] = useState(false);
const watchIdRef = useRef<number | null>(null);

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  // ── Fetch friends ──
  useEffect(() => {
    if (currentUser) fetchFriends();
  }, [currentUser]);

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Subscribe to messages when friend selected ──
  useEffect(() => {
    if (!currentUser || !selectedFriend) return;
    if (unsubRef.current) unsubRef.current();
    const convId = getConversationId(currentUser.uid, selectedFriend.uid);
    const unsub = subscribeToMessages(convId, (msgs) => setMessages(msgs));
    unsubRef.current = unsub;
    return () => unsub();
  }, [selectedFriend, currentUser]);

  const fetchFriends = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const myDoc = snapshot.docs.find((d) => d.data().uid === currentUser.uid);
    const myData = myDoc?.data();
    const list = snapshot.docs
      .map((d) => ({ ...d.data(), docId: d.id }))
      .filter((u) => myData?.friends?.includes(u.uid));
    setFriends(list);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedFriend) return;
    setSendingMsg(true);
    const convId = getConversationId(currentUser.uid, selectedFriend.uid);
    await sendMessage(convId, currentUser.uid, newMessage.trim());
    setNewMessage("");
    setSendingMsg(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ── SOS: get coords and blast to all friends ──
  const handleSOS = () => {
    if (friends.length === 0) {
      alert("You have no friends to alert yet!");
      return;
    }
    setAlertSending(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        const alertMsg = `🚨 SOS ALERT! I need help! My current location: ${mapsLink} (Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)})`;
        await Promise.all(
          friends.map((friend) => {
            const convId = getConversationId(currentUser.uid, friend.uid);
            return sendMessage(convId, currentUser.uid, alertMsg);
          })
        );
        setAlertSending(false);
        setAlertSuccess(true);
        setTimeout(() => setAlertSuccess(false), 4000);
      },
      (err) => {
        setAlertSending(false);
        alert(`Could not get location: ${err.message}. Please allow location access.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
//   const handleStartTracking = async () => {
//   if (!destination || friends.length === 0) return;

//   setIsTracking(true);

//   // Create tracking session ID
//   const trackingId = `${currentUser.uid}_${Date.now()}`;

//   // Send message to all friends
//   const trackingLink = `${window.location.origin}/track/${trackingId}`;

//   const message = `📍 I'm going to ${destination}\nTrack me live: ${trackingLink}`;

//   await Promise.all(
//     friends.map((friend) => {
//       const convId = getConversationId(currentUser.uid, friend.uid);
//       return sendMessage(convId, currentUser.uid, message);
//     })
//   );

//   // Start live tracking
//   const watchId = navigator.geolocation.watchPosition(
//     async (pos) => {
//       const { latitude, longitude } = pos.coords;

//       await setDoc(doc(db, "tracking", trackingId), {
//         uid: currentUser.uid,
//         lat: latitude,
//         lng: longitude,
//         updatedAt: new Date(),
//         destination,
//       });
//     },
//     (err) => console.error(err),
//     { enableHighAccuracy: true }
//   );

//   watchIdRef.current = watchId;
// };
const handleStartTracking = async () => {
  if (!destination || friends.length === 0) return;

  setIsTracking(true);

  const trackingId = `${currentUser.uid}_${Date.now()}`;
  console.log("Tracking ID:", trackingId);

  const trackingLink = `${window.location.origin}/track/${trackingId}`;

  const message = `📍 I'm going to ${destination}\nTrack me live: ${trackingLink}`;

  await Promise.all(
    friends.map((friend) => {
      const convId = getConversationId(currentUser.uid, friend.uid);
      return sendMessage(convId, currentUser.uid, message);
    })
  );

  const watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;

      console.log("LOCATION:", latitude, longitude);

      try {
        await setDoc(doc(db, "tracking", trackingId), {
          uid: currentUser.uid,
          lat: latitude,
          lng: longitude,
          updatedAt: new Date(),
          destination,
        });

        console.log("Tracking updated ✅");
      } catch (err) {
        console.error("Firestore error:", err);
      }
    },
    (err) => {
      console.error("Geo error:", err);
      alert("Allow location access!");
    },
    { enableHighAccuracy: true }
  );

  watchIdRef.current = watchId;
};

const handleStopTracking = () => {
  if (watchIdRef.current !== null) {
    navigator.geolocation.clearWatch(watchIdRef.current);
  }
  setIsTracking(false);
};

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex flex-col">
      <Navbar />

      {/* ── MAIN LAYOUT ── */}
      <div
        className="flex gap-5 max-w-6xl mx-auto w-full mt-6 px-4 pb-6"
        style={{ height: "calc(100vh - 90px)" }}
      >
        {/* ══ LEFT: Welcome + Add Friend + SOS ══ */}
        <div className="flex-1 flex flex-col gap-4 items-center pt-2 overflow-y-auto">
          {/* Welcome card */}
          <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md p-8 text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Astra</h2>
            <h4 className="text-2xl">Your personal safety companion (always aware, always ready).</h4>
            {/* <AddFriend /> */}
          </div>

          {/* SOS Alert Card */}
          <div className="w-full max-w-md bg-white border border-red-100 rounded-2xl shadow-md p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl">
                🆘
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Emergency Alert</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Instantly shares your live GPS location with all friends
                </p>
              </div>

              {/* SOS Button */}
              <button
                onClick={handleSOS}
                disabled={alertSending || alertSuccess}
                className={`
                  relative w-full py-3 rounded-xl font-semibold text-sm tracking-wide
                  transition-all duration-200 flex items-center justify-center gap-2
                  ${alertSuccess
                    ? "bg-green-500 text-white cursor-default"
                    : alertSending
                    ? "bg-red-400 text-white cursor-wait"
                    : "bg-red-500 hover:bg-red-600 active:scale-95 text-white shadow-md shadow-red-200"
                  }
                `}
              >
                {alertSending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Getting location…
                  </>
                ) : alertSuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Alert sent to {friends.length} friend{friends.length !== 1 ? "s" : ""}!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    🚨 Send SOS Alert
                  </>
                )}
                {/* Pulse ring when idle */}
                {!alertSending && !alertSuccess && (
                  <span className="absolute -inset-0.5 rounded-xl bg-red-400 opacity-30 animate-ping pointer-events-none" />
                )}
              </button>

              <p className="text-[11px] text-gray-400">
                Messages all {friends.length} friend{friends.length !== 1 ? "s" : ""} simultaneously
              </p>
            </div>
          </div>
          {/* Destination Tracking */}
<div className="w-full max-w-md bg-white border border-blue-100 rounded-2xl shadow-md p-6 text-center">
  <h3 className="text-base font-semibold text-gray-800 mb-2">
    Share Destination
  </h3>

  <input
    type="text"
    placeholder="Where are you going?"
    value={destination}
    onChange={(e) => setDestination(e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
  />

  <button
    onClick={handleStartTracking}
    disabled={!destination || isTracking}
    className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
  >
    {isTracking ? "Tracking..." : "Start Live Tracking"}
  </button>

  {isTracking && (
    <button
      onClick={handleStopTracking}
      className="w-full mt-2 py-2 bg-gray-300 rounded-lg"
    >
      Stop Tracking
    </button>
  )}
</div>
        </div>

        {/* ══ RIGHT: Friends list + Inline Chat (side-by-side) ══ */}
        <div
          className="shrink-0 flex gap-4"
          style={{
            width: selectedFriend ? "620px" : "280px",
            transition: "width 0.3s ease",
          }}
        >
          {/* ── Friends List ── */}
          <div className="w-[280px] shrink-0 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 shrink-0">
              <h2 className="text-base font-semibold text-white">Friends</h2>
              <p className="text-xs text-purple-100 mt-0.5">
                {friends.length} friend{friends.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {friends.length === 0 ? (
                <div className="p-6 text-center flex flex-col items-center gap-2 mt-4">
                  <div className="text-3xl">🤝</div>
                  <p className="text-sm text-gray-400">No friends yet. Add some!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.uid}
                    onClick={() => {
                      if (selectedFriend?.uid === friend.uid) {
                        setSelectedFriend(null);
                        setMessages([]);
                      } else {
                        setSelectedFriend(friend);
                        setMessages([]);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-purple-50 ${
                      selectedFriend?.uid === friend.uid
                        ? "bg-purple-50 border-l-4 border-purple-500"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {friend.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{friend.email}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        <span className="text-xs text-green-500">Online</span>
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 shrink-0 transition ${
                        selectedFriend?.uid === friend.uid ? "text-purple-500" : "text-gray-300"
                      }`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Inline Chat Panel ── */}
          {selectedFriend && (
            <div
              className="flex-1 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden"
              style={{ animation: "slideIn 0.25s ease-out" }}
            >
              {/* Chat Header */}
              <div className="px-5 py-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {selectedFriend.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{selectedFriend.email}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                    <span className="text-xs text-purple-100">Online</span>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedFriend(null); setMessages([]); }}
                  className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-4xl mb-2">👋</div>
                    <p className="text-sm text-gray-400">
                      Say hello to {selectedFriend.email?.split("@")[0]}!
                    </p>
                  </div>
                )}

                {messages.map((msg) => {
                  const isMe = msg.senderUid === currentUser.uid;
                  const isSOS = typeof msg.text === "string" && msg.text.startsWith("🚨 SOS ALERT");
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold text-white mr-1.5 mt-1 shrink-0">
                          {selectedFriend.email?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[78%]`}>
                        <div
                          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isSOS
                              ? "bg-red-50 border border-red-200 text-red-800 rounded-br-sm"
                              : isMe
                              ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
                              : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
                          }`}
                        >
                          {isSOS ? (
                            <span>
                              {msg.text.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) =>
                                part.startsWith("http") ? (
                                  <a
                                    key={i}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-red-600 font-medium"
                                  >
                                    📍 View on Maps
                                  </a>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )}
                            </span>
                          ) : (
                            msg.text
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t bg-white flex items-end gap-2 shrink-0">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
                  style={{ maxHeight: "100px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendingMsg}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {sendingMsg ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Home;
