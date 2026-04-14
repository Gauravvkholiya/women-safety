import { auth } from "../app/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<typeof auth.currentUser>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white shadow-md">
  
  <h3
    className="text-lg font-semibold cursor-pointer"
    onClick={() => navigate("/home")}
  >
    MyApp
  </h3>

  <div className="flex items-center gap-3">
    {user ? (
      <>
        <span className="text-sm opacity-90 hidden sm:block">
          {user?.email}
        </span>

        <button
          onClick={() => navigate("/home")}
          className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition"
        >
          Home
        </button>

        <button
          onClick={() => navigate("/friends")}
          className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition"
        >
          Friends
        </button>
        <button
  onClick={() => navigate("/requests")}
  className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition"
>
  Requests
</button>
<button
  onClick={() => navigate("/chat")}
  className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition"
>
  Chat
</button>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm bg-red-500/80 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
        
      </>
    ) : (
      <>
        <button className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition">
          Login
        </button>

        <button className="px-3 py-1.5 text-sm bg-white/20 rounded-lg hover:bg-white/30 transition">
          Register
        </button>
      </>
    )}
  </div>
</nav>
  );
};

export default Navbar;