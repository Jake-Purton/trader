// app/trader/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameExists, setUsernameExists] = useState<boolean | null>(false);
  const [message, setMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;

    async function checkUsername() {
      const trimmed = username.trim();
      if (!trimmed) {
        setUsernameExists(null);
        return;
      }

      try {
        const res = await fetch(`/api/auth/exists?username=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = (await res.json()) as { exists?: boolean };

        if (!isCancelled) {
          setUsernameExists(Boolean(data.exists));
        }
      } catch {
        if (!isCancelled) {
          setUsernameExists(null);
        }
      }
    }

    checkUsername();

    return () => {
      isCancelled = true;
    };
  }, [username]);

  const handleAuth = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setMessage("Username and password are required");
      return;
    }

    if (usernameExists === null) {
      setMessage("Checking username, please try again");
      return;
    }

    const mode: "login" | "signup" = usernameExists ? "login" : "signup";

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: trimmedUsername, password }),
    });

    const data = (await res.json()) as { error?: string };
    if (res.ok) {
      setMessage(
        mode === "login"
          ? `Success! Logged in as ${trimmedUsername}`
          : `Success! Created account for ${trimmedUsername}`
      );
      router.push("/dashboard")
    } else {
      setMessage(data.error ?? "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="bg-gray-900 p-8 rounded shadow-md w-full max-w-md border border-green-600">
        <h1 className="text-2xl font-bold mb-4 text-center text-green-500">Trader</h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full p-2 border border-green-600 rounded mb-4 bg-gray-800 text-white placeholder-gray-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 border border-green-600 rounded mb-4 bg-gray-800 text-white placeholder-gray-400"
        />

        {usernameExists === false && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full p-2 border border-green-600 rounded mb-4 bg-gray-800 text-white placeholder-gray-400"
          />
        )}

        <div className="flex justify-center">
          <button
            onClick={handleAuth}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full"
          >
            {usernameExists === null ? "Continue" : usernameExists ? "Log In" : "Sign Up"}
          </button>
        </div>

        {message && <p className="mt-4 text-center text-green-400">{message}</p>}
      </div>
    </div>
  );
}