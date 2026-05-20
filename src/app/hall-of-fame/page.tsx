"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Season } from "@/types";
import Link from "next/link";

export default function HallOfFamePage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seasonsRef = ref(db, "seasons");
    const unsub = onValue(seasonsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const seasonsList = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })) as Season[];
        // Only show completed seasons in Hall of Fame, sort by year descending
        const completed = seasonsList
          .filter(s => s.status === "completed")
          .sort((a, b) => b.year - a.year);
        setSeasons(completed);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen pb-20" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f1535 0%, #0a0e27 60%)" }}>
      
      {/* Header */}
      <div className="relative py-20 px-6 overflow-hidden flex flex-col items-center text-center">
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(212,175,55,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        
        <Link href="/" className="absolute top-8 left-8 text-[#b0b8d4] hover:text-white transition flex items-center gap-2 text-sm uppercase tracking-wider">
          <span>← Back to Home</span>
        </Link>

        <div className="text-6xl mb-6 filter drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">🏆</div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#d4af37] via-[#fff8dc] to-[#c9992a] mb-4">
          Hall of Fame
        </h1>
        <p className="text-[#b0b8d4] max-w-xl mx-auto text-lg">
          Honoring the champions, legends, and unforgettable moments of the Ganga Jamna Premier League.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-[#d4af37]/20 border-t-[#d4af37] animate-spin" />
          </div>
        ) : seasons.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[#b0b8d4] text-lg">The history books are currently being written...</p>
            <p className="text-sm text-white/40 mt-2">No completed seasons found.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {seasons.map((season, index) => (
              <div key={season.id} className="relative group">
                
                {/* Connecting line between seasons */}
                {index !== seasons.length - 1 && (
                  <div className="absolute left-1/2 -bottom-12 w-px h-12 bg-gradient-to-b from-[#d4af37]/50 to-transparent -translate-x-1/2 hidden md:block" />
                )}

                <div className="glass rounded-3xl p-1 border border-[#d4af37]/20 overflow-hidden transition-all duration-500 hover:border-[#d4af37]/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                  <div className="bg-black/40 rounded-[22px] p-6 md:p-10">
                    
                    {/* Season Header */}
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-10 border-b border-white/10 pb-8 text-center md:text-left">
                      <div>
                        <div className="text-[#d4af37] font-mono text-sm tracking-widest mb-2">SEASON {seasons.length - index}</div>
                        <h2 className="text-3xl md:text-5xl font-black text-white">{season.name}</h2>
                        <div className="text-[#b0b8d4] mt-2">{season.year}</div>
                      </div>
                      
                      <div className="mt-6 md:mt-0 flex flex-col items-center md:items-end">
                        <div className="text-xs text-[#b0b8d4] uppercase tracking-wider mb-2">Champions</div>
                        <div className="text-2xl md:text-4xl font-bold text-[#d4af37] flex items-center gap-3">
                          <span className="text-3xl">👑</span> {season.winner || "TBA"}
                        </div>
                        {season.runnerUp && (
                          <div className="text-sm text-[#b0b8d4] mt-2">
                            Runner-up: <span className="text-white font-semibold">{season.runnerUp}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      
                      {/* Man of Tournament */}
                      <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#d4af37]/5 rounded-bl-full pointer-events-none" />
                        <div className="text-2xl mb-3">⭐</div>
                        <div className="text-[10px] text-[#b0b8d4] uppercase tracking-widest font-bold mb-1">Man of the Tournament</div>
                        <div className="text-lg font-bold text-white">{season.manOfTheTournament || "-"}</div>
                      </div>

                      {/* Woman of Tournament */}
                      <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#d4af37]/5 rounded-bl-full pointer-events-none" />
                        <div className="text-2xl mb-3">🌟</div>
                        <div className="text-[10px] text-[#b0b8d4] uppercase tracking-widest font-bold mb-1">MVP (Women)</div>
                        <div className="text-lg font-bold text-white">{season.mvpWomen || "-"}</div>
                      </div>

                      {/* Top Batsman */}
                      <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#d4af37]/5 rounded-bl-full pointer-events-none" />
                        <div className="text-2xl mb-3">🏏</div>
                        <div className="text-[10px] text-[#b0b8d4] uppercase tracking-widest font-bold mb-1">Best Batsman</div>
                        <div className="text-lg font-bold text-white truncate" title={season.topScorer?.name}>{season.topScorer?.name || "-"}</div>
                        {season.topScorer?.value > 0 && (
                          <div className="text-[#d4af37] text-sm mt-1 font-mono">
                            {season.topScorer.value} Runs <span className="text-[#b0b8d4] text-xs">/ {season.topScorer.matches} Mat</span>
                          </div>
                        )}
                      </div>

                      {/* Top Bowler */}
                      <div className="bg-gradient-to-br from-white/5 to-transparent p-5 rounded-2xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#d4af37]/5 rounded-bl-full pointer-events-none" />
                        <div className="text-2xl mb-3">🎯</div>
                        <div className="text-[10px] text-[#b0b8d4] uppercase tracking-widest font-bold mb-1">Best Bowler</div>
                        <div className="text-lg font-bold text-white truncate" title={season.topWicketTaker?.name}>{season.topWicketTaker?.name || "-"}</div>
                        {season.topWicketTaker?.value > 0 && (
                          <div className="text-[#d4af37] text-sm mt-1 font-mono">
                            {season.topWicketTaker.value} Wkts <span className="text-[#b0b8d4] text-xs">/ {season.topWicketTaker.matches} Mat</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
