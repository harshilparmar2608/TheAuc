"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function AdminContent() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use the password from environment or fallback to 'admin'
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin";

    if (password === adminPassword) {
      // Store auth state (using sessionStorage for simplicity)
      sessionStorage.setItem("gjpl_admin_auth", "true");
      
      if (tournamentId) {
        router.push(`/host?tournament=${tournamentId}`);
      } else {
        router.push("/setup");
      }
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-xl p-8 max-w-md w-full animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="relative w-[120px] h-[120px]">
            <Image
              src="/logo.png"
              alt="GJPL Logo"
              fill
              sizes="120px"
              className="object-contain"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-[#d4af37] mb-8 uppercase tracking-widest">
          Host Access
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              placeholder="Enter Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-3 text-white placeholder-[#b0b8d4] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[#ff3333] text-sm text-center animate-pulse">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-[#d4af37] text-[#0a0e27] font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)]"
          >
            ENTER
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]"></div></div>}>
      <AdminContent />
    </Suspense>
  );
}
