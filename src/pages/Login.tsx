import React, { useState } from "react";
import { auth } from "../app/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = async (): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful");
      navigate("/home");;
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center px-4">
    
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-8 text-center">
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Login
      </h2>

      <div className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-300"
        />

        <button
          onClick={handleLogin}
          className="mt-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition"
        >
          Login
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Don’t have an account?{" "}
        <Link to="/" className="text-purple-600 hover:underline">
          Register
        </Link>
      </p>

    </div>
  </div>
);
};

export default Login;