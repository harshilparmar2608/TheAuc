"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, Team, Player, AuctionState } from "@/types";
import confetti from "canvas-confetti";

function LiveAuctionContent() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [loading, setLoading] = useState(true);

  const prevBid = useRef<number>(0);
  const prevPlayerId = useRef<string | null>(null);
  const [bidPulse, setBidPulse] = useState(false);
  const [soldAnim, setSoldAnim] = useState(false);
  const [unsoldAnim, setUnsoldAnim] = useState(false);
  const [animPlayerId, setAnimPlayerId] = useState<string | null>(null); // player shown during animation

  useEffect(() => {
    if (!tournamentId) return;

    const tRef = ref(db, `tournaments/${tournamentId}`);
    const unsubscribe = onValue(tRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTournament(data);
        if (data.teams) setTeams(data.teams);
        if (data.players) setPlayers(data.players);
        
        if (data.auction) {
          const newAuction = data.auction as AuctionState;
          
          // Trigger bid pulse
          if (newAuction.currentBid > prevBid.current) {
            setBidPulse(true);
            setTimeout(() => setBidPulse(false), 500);
          }
          prevBid.current = newAuction.currentBid;

          // Check if player changed — use sortOrder-sorted list (same as render)
          const allSorted = Object.values(data.players || {})
            .sort((a: any, b: any) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
          const newPlayerId = (allSorted[newAuction.currentPlayerIndex] as any)?.playerId;
          
          if (prevPlayerId.current && prevPlayerId.current !== newPlayerId) {
            const justAuctionedId = prevPlayerId.current; // capture BEFORE overwriting
            const prevP = (data.players || {})[justAuctionedId];
            if (prevP?.status === "sold") {
              setAnimPlayerId(justAuctionedId);
              setSoldAnim(true);
              confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
              setTimeout(() => setSoldAnim(false), 3500);
            } else if (prevP?.status === "unsold") {
              setAnimPlayerId(justAuctionedId);
              setUnsoldAnim(true);
              setTimeout(() => setUnsoldAnim(false), 3000);
            }
          }
          prevPlayerId.current = newPlayerId;

          setAuction(newAuction);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tournamentId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-[#d4af37]"></div></div>;
  if (!tournament || !auction) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Tournament not found</div>;

  const playerList = Object.values(players);
  const allPlayersSorted = playerList
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  
  // During animation: show the captured animPlayerId; otherwise show live current player
  const displayPlayerId = (soldAnim || unsoldAnim)
    ? animPlayerId
    : allPlayersSorted[auction.currentPlayerIndex]?.playerId;
  const currentPlayer = displayPlayerId ? players[displayPlayerId] : null;

  return (
    <div className="h-screen w-full bg-[#0a0e27] overflow-hidden flex flex-col font-sans text-white">
      {/* TOP BANNER */}
      <div className="h-[10%] border-b border-[#d4af37]/30 flex items-center justify-between px-8 bg-black/40">
        <div className="flex items-center gap-4">
          <div className="relative w-[60px] h-[60px]">
             <Image src="/logo.png" alt="Logo" fill sizes="60px" className="object-contain" />
          </div>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-yellow-200 tracking-widest uppercase">
          {tournament.name} {tournament.year}
        </h1>
        <div className="flex items-center gap-3 bg-black/50 px-6 py-2 rounded-full border border-white/10">
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3333] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ff3333]"></span>
          </span>
          <span className="font-bold tracking-widest">
            {auction.status === "completed" ? "CHIT ROUND" : "LIVE AUCTION"}
          </span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="h-[70%] flex relative">
        
        {/* SOLD / UNSOLD OVERLAYS */}
        {soldAnim && animPlayerId && (() => {
          const soldPlayer = players[animPlayerId];
          const soldTeam = soldPlayer?.soldTo ? teams[soldPlayer.soldTo] : null;
          return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="text-[100px] font-black text-[#d4af37] drop-shadow-[0_0_50px_rgba(212,175,55,1)] tracking-tighter uppercase animate-bounce leading-none">
                SOLD!
              </div>
              <div className="text-5xl font-black text-white mt-4 mb-2">
                {soldPlayer?.name ?? ""}
              </div>
              <div className="text-3xl text-[#b0b8d4] mt-2">
                to <span className="text-white font-bold">{soldTeam?.name ?? "—"}</span>
                {" "}for{" "}
                <span className={`font-bold ${(soldPlayer?.soldPrice ?? 0) > 0 ? "text-[#d4af37]" : "text-purple-400"}`}>
                  {(soldPlayer?.soldPrice ?? 0) > 0 ? `₹${soldPlayer!.soldPrice.toLocaleString()}` : "Chit Round"}
                </span>
              </div>
            </div>
          );
        })()}
        
        {unsoldAnim && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="text-[100px] font-black text-[#ea580c] drop-shadow-[0_0_50px_rgba(234,88,12,0.8)] tracking-tighter uppercase opacity-80">
              UNSOLD
            </div>
          </div>
        )}

        {/* Center Column */}
        <div className="w-[65%] flex flex-col items-center justify-center p-8 relative">
          {currentPlayer ? (
            <div className="glass w-full max-w-4xl h-full rounded-3xl p-8 flex flex-col items-center justify-between relative overflow-hidden">
              
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />


              
              <div className="text-center z-10 mt-6 flex-1 flex flex-col justify-center">
                <h2 className="text-5xl font-black mb-4 tracking-wide">{currentPlayer.name}</h2>
                <div>
                  <span className={`px-6 py-2 rounded-full text-xl font-bold uppercase tracking-wider ${currentPlayer.gender === 'Men' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'}`}>
                    {currentPlayer.gender}
                  </span>
                </div>
              </div>

              {/* Bid Area */}
              <div className="w-full bg-black/60 border border-[#d4af37]/30 rounded-2xl p-6 flex flex-col items-center justify-center relative z-10 mt-auto">
                <div className="text-[#b0b8d4] uppercase tracking-widest text-sm mb-2 font-bold">Current Bid</div>
                <div className={`text-7xl font-black text-[#d4af37] tracking-tighter ${bidPulse ? 'scale-125 drop-shadow-[0_0_30px_rgba(212,175,55,1)]' : 'drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]'} transition-all duration-300`}>
                  ₹{auction.currentBid.toLocaleString()}
                </div>
                <div className="text-2xl mt-4 text-[#b0b8d4]">
                  {auction.currentBiddingTeam ? (
                    <span>Bid by: <span className="text-white font-bold">{teams[auction.currentBiddingTeam]?.name}</span></span>
                  ) : (
                    "Waiting for bids..."
                  )}
                </div>
              </div>

            </div>
          ) : auction.status === "completed" ? (() => {
            // CHIT ROUND VIEW
            const chitPlayers = Object.values(players).filter(
              p => p.status === "unsold" || (p.status === "sold" && p.soldPrice === 0)
            );
            const assignedCount = chitPlayers.filter(p => p.status === "sold").length;
            return (
              <div className="w-full h-full flex flex-col p-4 overflow-hidden">
                <div className="text-center mb-4">
                  <div className="text-3xl font-black text-[#d4af37] tracking-widest uppercase drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">🎲 Chit Round</div>
                  <div className="text-sm text-[#b0b8d4] mt-1">{assignedCount}/{chitPlayers.length} chits revealed</div>
                  <div className="h-1 bg-white/10 rounded-full mt-2 max-w-[200px] mx-auto overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#d4af37] to-yellow-300 rounded-full transition-all duration-700"
                      style={{ width: chitPlayers.length ? `${(assignedCount / chitPlayers.length) * 100}%` : "0%" }} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {chitPlayers.map((player, idx) => {
                      const isRevealed = player.status === "sold";
                      const team = player.soldTo ? teams[player.soldTo] : null;
                      return (
                        <div key={player.playerId}
                          className={`aspect-[3/4] rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all duration-500 ${
                            isRevealed
                              ? "border-[#d4af37]/60 bg-[#d4af37]/10"
                              : "border-white/20 bg-black/40"
                          }`}>
                          {!isRevealed ? (
                            <>
                              <div className="text-3xl mb-1">📜</div>
                              <div className="text-[#b0b8d4] text-[10px] font-bold">Chit #{idx + 1}</div>
                            </>
                          ) : (
                            <>
                              <div className={`text-2xl mb-1 ${player.gender === "Men" ? "text-blue-400" : "text-pink-400"}`}>
                                {player.gender === "Men" ? "👨" : "👩"}
                              </div>
                              <div className="font-black text-white text-center text-[10px] leading-tight">{player.name}</div>
                              <div className={`text-[8px] mt-0.5 px-1.5 py-0.5 rounded font-bold ${
                                player.gender === "Men" ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"
                              }`}>{player.gender}</div>
                              {team && <div className="text-[#d4af37] text-[9px] font-bold mt-1 text-center">→ {team.name}</div>}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {chitPlayers.length === 0 && (
                      <div className="col-span-4 text-center text-[#b0b8d4] py-8">No unsold players. Chit round complete!</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="text-4xl text-[#b0b8d4] glass p-16 rounded-3xl animate-pulse">
              Paused
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-[35%] bg-black/40 border-l border-white/10 p-6 flex flex-col">
          <h3 className="text-2xl font-bold text-[#d4af37] mb-6 tracking-widest uppercase flex items-center justify-between">
            <span>Live Purse</span>
            <span className="text-sm font-normal text-white/50 bg-white/5 px-3 py-1 rounded">M / W Slots</span>
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {Object.values(teams).map(t => (
              <div key={t.id} className="bg-gradient-to-r from-black/60 to-transparent border-l-4 border-[#4a5568] p-4 flex justify-between items-center rounded-r-lg">
                <div>
                  <div className="font-bold text-lg">{t.name}</div>
                  <div className="text-[#d4af37] font-mono text-xl">₹{t.remainingBudget.toLocaleString()}</div>
                </div>
                <div className="text-right text-sm text-[#b0b8d4] font-mono bg-white/5 px-3 py-2 rounded">
                  👨 {t.menCount}/{tournament.menSlots} <br/> 👩 {t.womenCount}/{tournament.womenSlots}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM TICKER */}
      <div className="h-[20%] bg-black/80 border-t border-[#d4af37]/30 p-4 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 bg-[#d4af37] text-black text-xs font-bold px-4 py-1 rounded-br-lg z-10 tracking-widest uppercase">
          Recently Sold
        </div>
        
        <div className="flex gap-4 overflow-x-auto pt-4 px-2 whitespace-nowrap mask-edges scrollbar-hide">
          {[...(auction.soldPlayers || [])].reverse().map((playerId, i) => {
            const p = players[playerId];
            if (!p) return null;
            const teamName = p.soldTo ? (teams[p.soldTo]?.name ?? "—") : "—";
            const priceLabel = p.soldPrice > 0 ? `₹${p.soldPrice.toLocaleString()}` : "Chit Round";
            return (
              <div key={`${playerId}-${i}`} className="inline-flex glass shrink-0 items-center gap-3 p-3 rounded-xl min-w-[220px]">
                <div className="flex flex-col justify-center">
                  <div className="font-bold text-base leading-tight">{p.name}</div>
                  <div className="text-[#b0b8d4] text-xs mt-0.5">{teamName}</div>
                  <div className={`font-bold text-sm mt-1 ${p.soldPrice > 0 ? 'text-[#d4af37]' : 'text-purple-400'}`}>{priceLabel}</div>
                </div>
              </div>
            );
          })}
          {!(auction.soldPlayers?.length) && (
            <div className="text-[#4a5568] text-sm italic flex items-center">No players sold yet...</div>
          )}
        </div>
      </div>

      <style>{`
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function LiveAuction() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-[#d4af37]"></div></div>}>
      <LiveAuctionContent />
    </Suspense>
  );
}
