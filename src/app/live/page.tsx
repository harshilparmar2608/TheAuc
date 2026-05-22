"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, Team, Player, AuctionState } from "@/types";
import confetti from "canvas-confetti";

// ─── Player Name Scramble Reveal ─────────────────────────────────────────────
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&";

function ScrambleName({ name, trigger }: { name: string; trigger: string }) {
  const [displayed, setDisplayed] = useState(name);
  const frameRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!name) return;
    setDisplayed(name.split("").map(() => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]).join(""));
    let iteration = 0;
    const totalFrames = 20; // 1.1 seconds (20 * 55ms)
    if (frameRef.current) clearInterval(frameRef.current);
    frameRef.current = setInterval(() => {
      iteration++;
      setDisplayed(
        name.split("").map((char, i) => {
          if (char === " ") return " ";
          if (i < Math.floor((iteration / totalFrames) * name.length)) return char;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }).join("")
      );
      if (iteration >= totalFrames) {
        if (frameRef.current) clearInterval(frameRef.current);
        setDisplayed(name);
      }
    }, 55);
    return () => { if (frameRef.current) clearInterval(frameRef.current); };
  }, [trigger, name]);

  return <span className="font-mono tracking-widest">{displayed}</span>;
}

// ─── Countdown Overlay ────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number | null }) {
  if (count === null || count <= 0) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="text-[#b0b8d4] text-lg uppercase tracking-[0.4em] font-bold mb-6 animate-pulse">
        Auction Starting In
      </div>
      <div
        key={count}
        className="text-[200px] leading-none font-black text-transparent bg-clip-text"
        style={{
          backgroundImage: "linear-gradient(135deg, #d4af37 0%, #fff8dc 50%, #c9992a 100%)",
          filter: "drop-shadow(0 0 60px rgba(212,175,55,0.8))",
          animation: "countdownPop 1s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        {count}
      </div>
      <div className="mt-8 flex gap-2">
        {[1, 2, 3].map(n => (
          <div key={n} className="w-3 h-3 rounded-full transition-all duration-300"
            style={{ backgroundColor: n <= count ? "#d4af37" : "rgba(255,255,255,0.15)" }} />
        ))}
      </div>
      <style>{`
        @keyframes countdownPop {
          0%   { transform: scale(2.5); opacity: 0; }
          40%  { transform: scale(0.85); opacity: 1; }
          70%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Waiting Screen — shows rules before auction starts ──────────────────────
function WaitingScreen({ tournament }: { tournament: Tournament }) {
  const [dots, setDots] = useState(".");
  const [visibleRules, setVisibleRules] = useState(0);
  const rules = tournament.rules || [];

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 600);
    return () => clearInterval(t);
  }, []);

  // Stagger rules in one by one
  useEffect(() => {
    if (!rules.length) return;
    setVisibleRules(0);
    const timers: NodeJS.Timeout[] = [];
    rules.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleRules(i + 1), 700 + i * 550));
    });
    return () => timers.forEach(clearTimeout);
  }, [rules.length]);

  const allVisible = rules.length === 0 || visibleRules >= rules.length;

  return (
    <div className="min-h-screen bg-[#0a0e27] flex flex-col items-center justify-start pt-10 px-4 pb-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)" }} />
      </div>

      {/* Logo + name */}
      <div className="flex flex-col items-center mb-8 z-10">
        <div className="relative w-20 h-20 md:w-28 md:h-28 mb-4"
          style={{ filter: "drop-shadow(0 0 30px rgba(212,175,55,0.5))", animation: "floatLogo 3s ease-in-out infinite" }}>
          <Image src="/logo.png" alt="GJPL" fill sizes="112px" className="object-contain" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-yellow-200 tracking-widest uppercase text-center">
          {tournament.name}
        </h1>
        <div className="text-[#b0b8d4] tracking-widest uppercase text-sm mt-1">{tournament.year}</div>
      </div>

      {/* Rules section */}
      {rules.length > 0 && (
        <div className="w-full max-w-2xl z-10 mb-8">
          {/* Divider with label */}
          <div
            className="flex items-center gap-3 mb-6"
            style={{ opacity: visibleRules > 0 ? 1 : 0, transition: "opacity 0.8s ease" }}
          >
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4))" }} />
            <span className="text-[#d4af37] text-xs font-black tracking-[0.25em] uppercase px-3 py-1 rounded-full border border-[#d4af37]/30"
              style={{ background: "rgba(212,175,55,0.05)" }}>
              📋  Tournament Rules
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.4), transparent)" }} />
          </div>

          {/* Rule cards — slide in one by one */}
          <div className="space-y-3">
            {rules.map((rule, i) => (
              <div
                key={i}
                style={{
                  opacity: visibleRules > i ? 1 : 0,
                  transform: visibleRules > i ? "translateX(0) scale(1)" : "translateX(-30px) scale(0.97)",
                  transition: "opacity 0.5s ease, transform 0.55s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <div
                  className="flex items-start gap-4 rounded-2xl px-5 py-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)",
                    border: `1px solid rgba(212,175,55,${0.18 + i * 0.04})`,
                    boxShadow: visibleRules === i + 1
                      ? "0 0 30px rgba(212,175,55,0.14), inset 0 0 20px rgba(212,175,55,0.04)"
                      : "none",
                    transition: "box-shadow 0.6s ease",
                  }}
                >
                  {/* Badge */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5"
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))",
                      border: "1.5px solid rgba(212,175,55,0.5)",
                      color: "#d4af37",
                      boxShadow: visibleRules === i + 1
                        ? "0 0 18px rgba(212,175,55,0.6)"
                        : "0 0 5px rgba(212,175,55,0.15)",
                      transition: "box-shadow 0.5s ease",
                    }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-white/90 text-base md:text-lg leading-relaxed font-medium flex-1">{rule}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting indicator — fades in after all rules */}
      <div
        className="z-10 w-full max-w-sm"
        style={{
          opacity: allVisible ? 1 : 0,
          transform: allVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
        }}
      >
        <div className="glass rounded-2xl px-8 py-5 text-center border border-[#d4af37]/20 shadow-[0_0_30px_rgba(212,175,55,0.06)]">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d4af37]" />
            </span>
            <span className="text-[#d4af37] font-bold tracking-widest uppercase text-xs">Waiting for Host</span>
          </div>
          <p className="text-[#b0b8d4] text-sm">Auction will begin shortly{dots}</p>
          <p className="text-[#4a5568] text-[11px] mt-1">Stay on this page — updates automatically</p>
        </div>
      </div>

      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

// ─── Animated Team Card (From Colors Page) ──────────────────────────────────
const SPIN_NAMES = [
  "Warriors", "Titans", "Eagles", "Sharks", "Dragons",
  "Lions", "Panthers", "Cobras", "Bulls", "Phoenix",
  "Wolves", "Blazers", "Hawks", "Tigers", "Vipers",
];

function TeamRevealCard({
  team, color, revealState,
}: {
  team: Team; color: string; revealState: "hidden" | "spinning" | "revealed";
}) {
  const [spinName, setSpinName] = useState("???");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (revealState === "spinning") {
      intervalRef.current = setInterval(() => {
        setSpinName(SPIN_NAMES[Math.floor(Math.random() * SPIN_NAMES.length)]);
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [revealState]);

  if (revealState === "hidden") {
    return (
      <div className="relative rounded-2xl border-2 border-white/10 bg-black/30 p-5 flex flex-col items-center gap-2 opacity-30 transition-all duration-700">
        <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-white/10" />
        <div className="text-[#4a5568] font-bold text-sm">???</div>
      </div>
    );
  }

  if (revealState === "spinning") {
    return (
      <div
        className="relative rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all duration-300 animate-pulse"
        style={{ borderColor: `${color}80`, backgroundColor: `${color}12`, boxShadow: `0 0 30px ${color}50` }}
      >
        <div className="w-14 h-14 rounded-full border-4 border-white/30 animate-spin" style={{ backgroundColor: color, boxShadow: `0 0 25px ${color}` }} />
        <div className="font-black text-base text-white tracking-widest animate-pulse">{spinName}</div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all duration-700 animate-[scaleIn_0.5s_ease-out]"
      style={{ borderColor: `${color}90`, backgroundColor: `${color}15`, boxShadow: `0 0 40px ${color}40` }}
    >
      <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full rotate-12 shadow-lg animate-[bounceIn_0.4s_ease-out]">
        REVEALED!
      </div>
      <div className="w-14 h-14 rounded-full border-4 border-white/40 shadow-2xl" style={{ backgroundColor: color, boxShadow: `0 0 35px ${color}90` }} />
      <div className="font-black text-xl text-white tracking-wider text-center">{team.name}</div>
    </div>
  );
}

function LiveColorReveal({ tournament, teams }: { tournament: Tournament; teams: Team[] }) {
  const groupMap: Record<string, Team[]> = {};
  teams.forEach(t => {
    const g = t.group || "Group A";
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(t);
  });
  const groupKeys = Object.keys(groupMap).sort();

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-[#d4af37] uppercase tracking-widest drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">
          Group & Color Assignment
        </h2>
        <p className="text-[#b0b8d4] mt-2 tracking-wide">
          {tournament.colorReveal?.phase === "running" ? "Revealing groups live..." : "Groups have been finalized!"}
        </p>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
        {groupKeys.map(groupName => (
          <div key={groupName} className="flex flex-col gap-4">
            <h3 className="text-2xl font-black text-white text-center border-b border-white/10 pb-3 uppercase tracking-widest">
              {groupName}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {groupMap[groupName].map(team => (
                <TeamRevealCard
                  key={team.id}
                  team={team}
                  color={team.color || "#4a5568"}
                  revealState={tournament.colorReveal?.states?.[team.id] || "hidden"}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes scaleIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0) rotate(0deg); } 50% { transform: scale(1.2) rotate(20deg); } 100% { transform: scale(1) rotate(12deg); } }
      `}</style>
    </div>
  );
}

// ─── Main Live Content ────────────────────────────────────────────────────────
function LiveAuctionContent() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  const prevBid = useRef<number>(0);
  const prevPlayerId = useRef<string | null>(null);
  const prevPlayerIndex = useRef<number>(-1);
  const [bidPulse, setBidPulse] = useState(false);
  const [soldAnim, setSoldAnim] = useState(false);
  const [unsoldAnim, setUnsoldAnim] = useState(false);
  const [animPlayerId, setAnimPlayerId] = useState<string | null>(null);
  const [revealTrigger, setRevealTrigger] = useState("init");
  const [revealingPlayer, setRevealingPlayer] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    const tRef = ref(db, `tournaments/${tournamentId}`);
    const unsubscribe = onValue(tRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTournament(data);
        if (data.teams) setTeams(data.teams);
        if (data.players) setPlayers(data.players);
        const cd = data.countdown ?? null;
        setCountdown(cd);

        if (data.auction) {
          const newAuction = data.auction as AuctionState;
          if (newAuction.currentBid > prevBid.current) {
            setBidPulse(true);
            setTimeout(() => setBidPulse(false), 500);
          }
          prevBid.current = newAuction.currentBid;

          const allSorted = Object.values(data.players || {})
            .sort((a: any, b: any) => {
              if ((a.sortOrder ?? 9999) !== (b.sortOrder ?? 9999)) {
                return (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
              }
              return a.playerId.localeCompare(b.playerId);
            });
          const newPlayerId = (allSorted[newAuction.currentPlayerIndex] as any)?.playerId;

          if (prevPlayerId.current && prevPlayerId.current !== newPlayerId) {
            const justAuctionedId = prevPlayerId.current;
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

          if (newAuction.currentPlayerIndex !== prevPlayerIndex.current) {
            prevPlayerIndex.current = newAuction.currentPlayerIndex;
            setRevealTrigger(`player-${newAuction.currentPlayerIndex}-${Date.now()}`);
            setRevealingPlayer(true);
            setTimeout(() => setRevealingPlayer(false), 1200);
          }

          prevPlayerId.current = newPlayerId;
          setAuction(newAuction);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tournamentId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-[#d4af37]" />
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">Tournament not found</div>
  );

  // Show waiting screen until host starts
  if (tournament.status === "setup" || !auction) {
    return <WaitingScreen tournament={tournament} />;
  }

  const showCountdown = countdown !== null && countdown > 0;
  const playerList = Object.values(players);
  const allPlayersSorted = playerList.sort((a, b) => {
    if ((a.sortOrder ?? 9999) !== (b.sortOrder ?? 9999)) {
      return (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
    }
    return a.playerId.localeCompare(b.playerId);
  });
  const displayPlayerId = (soldAnim || unsoldAnim)
    ? animPlayerId
    : allPlayersSorted[auction.currentPlayerIndex]?.playerId;
  const currentPlayer = displayPlayerId ? players[displayPlayerId] : null;

  return (
    <div className="min-h-screen md:h-screen w-full bg-[#0a0e27] md:overflow-hidden flex flex-col font-sans text-white">
      {showCountdown && <CountdownOverlay count={countdown} />}

      {/* TOP BANNER */}
      <div className="h-auto md:h-[10%] border-b border-[#d4af37]/30 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-4 md:py-0 bg-black/40 gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <div className="relative w-[60px] h-[60px]">
            <Image src="/logo.png" alt="Logo" fill sizes="60px" className="object-contain" />
          </div>
        </div>
        <h1 className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-yellow-200 tracking-widest uppercase text-center">
          {tournament.name} {tournament.year}
        </h1>
        <div className="flex items-center gap-2 md:gap-3 bg-black/50 px-4 md:px-6 py-2 rounded-full border border-white/10 text-xs md:text-base">
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3333] opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ff3333]" />
          </span>
          <span className="font-bold tracking-widest">
            {auction.status === "completed" ? "CHIT ROUND" : "LIVE AUCTION"}
          </span>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 md:h-[70%] flex flex-col md:flex-row relative">
        {/* SOLD overlay */}
        {soldAnim && animPlayerId && (() => {
          const soldPlayer = players[animPlayerId];
          const soldTeam = soldPlayer?.soldTo ? teams[soldPlayer.soldTo] : null;
          return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="text-[100px] font-black text-[#d4af37] drop-shadow-[0_0_50px_rgba(212,175,55,1)] tracking-tighter uppercase animate-bounce leading-none">SOLD!</div>
              <div className="text-5xl font-black text-white mt-4 mb-2">{soldPlayer?.name ?? ""}</div>
              <div className="text-3xl text-[#b0b8d4] mt-2">
                to <span className="text-white font-bold">{soldTeam?.name ?? "—"}</span>{" "}for{" "}
                <span className={`font-bold ${(soldPlayer?.soldPrice ?? 0) > 0 ? "text-[#d4af37]" : "text-purple-400"}`}>
                  {(soldPlayer?.soldPrice ?? 0) > 0 ? `₹${soldPlayer!.soldPrice.toLocaleString()}` : "Chit Round"}
                </span>
              </div>
            </div>
          );
        })()}

        {/* UNSOLD overlay */}
        {unsoldAnim && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="text-[100px] font-black text-[#ea580c] drop-shadow-[0_0_50px_rgba(234,88,12,0.8)] tracking-tighter uppercase opacity-80">UNSOLD</div>
          </div>
        )}

        {/* Center */}
        <div className="w-full md:w-[65%] flex flex-col items-center justify-center p-4 md:p-8 relative min-h-[50vh] md:min-h-0">
          {currentPlayer ? (
            <div className="glass w-full max-w-4xl h-full rounded-3xl p-8 flex flex-col items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="text-center z-10 mt-6 flex-1 flex flex-col justify-center gap-4">
                {/* Gender badge */}
                <div className="transition-all duration-500"
                  style={{ opacity: revealingPlayer ? 0 : 1, transform: revealingPlayer ? "translateY(10px)" : "translateY(0)" }}>
                  <span className={`px-6 py-2 rounded-full text-xl font-bold uppercase tracking-wider ${
                    currentPlayer.gender === "Men"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                  }`}>{currentPlayer.gender}</span>
                </div>

                {/* Scramble reveal name */}
                <h2 className={`text-5xl md:text-6xl font-black tracking-wide transition-all duration-300 ${
                  revealingPlayer
                    ? "text-[#d4af37] scale-105 drop-shadow-[0_0_30px_rgba(212,175,55,0.8)]"
                    : "text-white drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                }`}>
                  <ScrambleName name={currentPlayer.name} trigger={revealTrigger} />
                </h2>

                {/* Sweep bar */}
                <div className="relative h-1 w-full max-w-xs mx-auto overflow-hidden rounded-full bg-white/10 mt-6">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#d4af37] to-yellow-300 rounded-full"
                    style={{
                      width: revealingPlayer ? "100%" : "0%",
                      transition: revealingPlayer ? "width 1100ms ease-out" : "none"
                    }}
                  />
                </div>
              </div>

              {/* Bid area */}
              <div className="w-full bg-black/60 border border-[#d4af37]/30 rounded-2xl p-6 flex flex-col items-center justify-center relative z-10 mt-auto">
                <div className="text-[#b0b8d4] uppercase tracking-widest text-sm mb-2 font-bold">Current Bid</div>
                <div className={`text-7xl font-black text-[#d4af37] tracking-tighter ${
                  bidPulse ? "scale-125 drop-shadow-[0_0_30px_rgba(212,175,55,1)]" : "drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                } transition-all duration-300`}>
                  ₹{auction.currentBid.toLocaleString()}
                </div>
                <div className="text-2xl mt-4 text-[#b0b8d4]">
                  {auction.currentBiddingTeam
                    ? <span>Bid by: <span className="text-white font-bold">{teams[auction.currentBiddingTeam]?.name}</span></span>
                    : "Waiting for bids..."}
                </div>
              </div>
            </div>
          ) : auction.status === "completed" ? (() => {
            if (
              tournament.colorAssignmentStatus === "assigned" &&
              (tournament.colorReveal?.phase === "running" || tournament.colorReveal?.phase === "done")
            ) {
              return <LiveColorReveal tournament={tournament} teams={Object.values(teams)} />;
            }

            const chitPlayers = Object.values(players).filter(p => p.status === "unsold" || (p.status === "sold" && p.soldPrice === 0));
            const assignedCount = chitPlayers.filter(p => p.status === "sold").length;
            return (
              <div className="w-full h-full flex flex-col p-4 overflow-hidden">
                <div className="text-center mb-4">
                  <div className="text-3xl font-black text-[#d4af37] tracking-widest uppercase drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]">Chit Round</div>
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
                            isRevealed ? "border-[#d4af37]/60 bg-[#d4af37]/10" : "border-white/20 bg-black/40"}`}>
                          {!isRevealed ? (
                            <div className="text-[#b0b8d4] text-[10px] font-bold">Chit #{idx + 1}</div>
                          ) : (
                            <>
                              <div className={`text-2xl mb-1 ${player.gender === "Men" ? "text-blue-400" : "text-pink-400"}`}>
                                {player.gender === "Men" ? "♂" : "♀"}
                              </div>
                              <div className="font-black text-white text-center text-[10px] leading-tight">{player.name}</div>
                              <div className={`text-[8px] mt-0.5 px-1.5 py-0.5 rounded font-bold ${player.gender === "Men" ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"}`}>{player.gender}</div>
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
            <div className="text-4xl text-[#b0b8d4] glass p-16 rounded-3xl animate-pulse">Paused</div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full md:w-[35%] bg-black/40 border-t md:border-t-0 md:border-l border-white/10 p-4 md:p-6 flex flex-col min-h-[40vh] md:min-h-0">
          <h3 className="text-2xl font-bold text-[#d4af37] mb-6 tracking-widest uppercase flex items-center justify-between">
            <span>Live Purse</span>
            <span className="text-sm font-normal text-white/50 bg-white/5 px-3 py-1 rounded">M / W Slots</span>
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {Object.values(teams).map(t => (
              <div key={t.id} className="bg-gradient-to-r from-black/60 to-transparent border-l-4 border-[#4a5568] p-4 flex justify-between items-center rounded-r-lg">
                <div>
                  <div className="font-bold text-lg flex items-center gap-2">
                    <span>{t.name}</span>
                    {t.group && <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded tracking-widest text-white/70">{t.group.replace("Group ", "")}</span>}
                  </div>
                  <div className="text-[#d4af37] font-mono text-xl">₹{t.remainingBudget.toLocaleString()}</div>
                </div>
                <div className="text-right text-sm text-[#b0b8d4] font-mono bg-white/5 px-3 py-2 rounded">
                  Men {t.menCount}/{tournament.menSlots} <br /> Women {t.womenCount}/{tournament.womenSlots}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM TICKER */}
      <div className="h-auto md:h-[20%] bg-black/80 border-t border-[#d4af37]/30 p-4 flex flex-col justify-center relative overflow-hidden mt-auto">
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
                  <div className={`font-bold text-sm mt-1 ${p.soldPrice > 0 ? "text-[#d4af37]" : "text-purple-400"}`}>{priceLabel}</div>
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
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-[#d4af37]" /></div>}>
      <LiveAuctionContent />
    </Suspense>
  );
}
