"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament } from "@/types";
import { Trophy, Play, Settings } from "lucide-react";

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const tournamentsRef = ref(db, "tournaments");
    const unsubscribe = onValue(tournamentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedTournaments = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        // Sort by newest first
        parsedTournaments.sort((a, b) => b.createdAt - a.createdAt);
        setTournaments(parsedTournaments);
      } else {
        setTournaments([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen p-8 flex flex-col items-center">
      <div className="mb-12 mt-8 text-center animate-fade-in">
        <div className="relative w-[200px] h-[200px] mx-auto mb-6">
          <Image
            src="/logo.png"
            alt="GJPL Logo"
            fill
            sizes="(max-width: 768px) 100vw, 200px"
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-yellow-200 drop-shadow-lg">
          GJPL Cricket Premier League
        </h1>
        <p className="mt-4 text-[#b0b8d4] text-lg max-w-2xl mx-auto">
          Professional tournament management system with live auction capabilities
        </p>
      </div>

      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Trophy className="text-[#d4af37]" />
            Tournaments
          </h2>
          <button
            onClick={() => router.push("/admin")}
            className="bg-transparent border border-[#d4af37] text-[#d4af37] px-6 py-2 rounded hover:bg-[#d4af37] hover:text-[#0a0e27] transition-all duration-300 font-semibold shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)]"
          >
            + Create New Tournament
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]"></div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center text-[#b0b8d4]">
            <p className="mb-4 text-xl">No tournaments found.</p>
            <p>Create a new tournament to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="glass rounded-xl p-6 transition-transform duration-300 hover:-translate-y-2 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {t.name}
                    </h3>
                    <span className="text-sm bg-[#d4af37]/20 text-[#d4af37] px-2 py-1 rounded">
                      {t.year}
                    </span>
                  </div>
                  {t.status === "running" && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3333] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff3333]"></span>
                    </span>
                  )}
                </div>

                <div className="flex-grow space-y-2 mb-6 text-[#b0b8d4] text-sm">
                  <p>Budget/Team: ₹{t.budget.toLocaleString()}</p>
                  <p>Status: <span className="capitalize">{t.status}</span></p>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <button
                    onClick={() => router.push(`/admin?tournament=${t.id}`)}
                    className="w-full bg-[#d4af37] text-[#0a0e27] py-2 rounded font-bold hover:bg-yellow-400 transition flex items-center justify-center gap-2"
                  >
                    <Settings size={18} />
                    Host Auction
                  </button>
                  <button
                    onClick={() => router.push(`/live?tournament=${t.id}`)}
                    className="w-full bg-transparent border border-white/20 text-white py-2 rounded font-bold hover:bg-white/10 transition flex items-center justify-center gap-2"
                  >
                    <Play size={18} />
                    Watch Live
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
