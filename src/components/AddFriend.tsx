import { useState } from "react";

const AddFriend = () => {
  const [email, setEmail] = useState("");

  const handleAddFriend = () => {
    if (!email) return alert("Enter email");

    // later you will connect firestore here
    console.log("Friend added:", email);

    alert("Friend request sent (mock)");
    setEmail("");
  };

  return (
    <div className="flex gap-2 justify-center">
  <input
    type="text"
    placeholder="Enter email"
    className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
  />

  <button className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition">
    Add
  </button>
</div>
  );
};

export default AddFriend;