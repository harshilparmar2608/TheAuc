"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, Team, Player } from "@/types";
import toast from "react-hot-toast";

function UnsoldChitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [chitList, setChitList] = useState<Player[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (!tournamentId) return;
    return onValue(ref(db, `tournaments/${tournamentId}`), snap => {
      const data = snap.val();
      if (data) {
        setTournament(data);
        const t: Record<string, Team> = data.teams || {};
        const p: Record<string, Player> = data.players || {};
        setTeams(t);
        if (!initialized.current && Object.keys(p).length > 0) {
          const unsold = Object.values(p).filter(x => x.status === "unsold");
          setChitList(unsold);
          initialized.current = true;
        }
      }
      setLoading(false);
    });
  }, [tournamentId]);

  useEffect(() => {
    if (!loading && initialized.current && chitList.length === 0) {
      router.replace(`/colors?tournament=${tournamentId}`);
    }
  }, [loading, chitList.length, tournamentId, router]);

  // Handle initializing Chit Queue
  useEffect(() => {
    if (!tournament || loading || !initialized.current || Object.keys(teams).length === 0) return;
    
    if (!tournament.chitQueue) {
      // Find teams that need players
      const incomplete = Object.values(teams).filter(t => t.menCount < tournament.menSlots || t.womenCount < tournament.womenSlots);
      const order = incomplete.sort(() => Math.random() - 0.5).map(t => t.id);
      
      if (order.length > 0) {
        update(ref(db), { [`tournaments/${tournamentId}/chitQueue`]: { order, currentIndex: 0 } });
      }
    }
  }, [tournament, teams, loading, tournamentId]);

  const teamList = Object.values(teams);
  const chitQueue = tournament?.chitQueue;
  const currentTeamId = chitQueue && chitQueue.order.length > 0 ? chitQueue.order[chitQueue.currentIndex] : null;

  const handlePickChit = async (player: Player) => {
    if (!currentTeamId) { toast.error("No team in turn queue!"); return; }
    if (revealed[player.playerId]) return;
    if (!tournament || !tournamentId || !chitQueue) return;
    const team = teams[currentTeamId];
    if (!team) return;

    const isMen = player.gender === "Men";
    const slotFull = isMen
      ? team.menCount >= tournament.menSlots
      : team.womenCount >= tournament.womenSlots;

    // Auto-override logic: increment the count that corresponds to the player's gender unless it's full.
    // If it's full, we increment the opposite count to maintain total slot capacity properly.
    const countKey = slotFull
      ? (isMen ? "womenCount" : "menCount") 
      : (isMen ? "menCount" : "womenCount");

    const currentCount = slotFull
      ? (isMen ? team.womenCount : team.menCount)
      : (isMen ? team.menCount : team.womenCount);

    setRevealed(r => ({ ...r, [player.playerId]: true }));
    const updates: Record<string, unknown> = {};
    updates[`tournaments/${tournamentId}/players/${player.playerId}/status`] = "sold";
    updates[`tournaments/${tournamentId}/players/${player.playerId}/soldTo`] = currentTeamId;
    updates[`tournaments/${tournamentId}/players/${player.playerId}/soldPrice`] = 0;
    updates[`tournaments/${tournamentId}/teams/${currentTeamId}/${countKey}`] = currentCount + 1;
    
    // Compute next turn index
    let nextIndex = (chitQueue.currentIndex + 1) % chitQueue.order.length;
    let loopCount = 0;
    
    while (loopCount < chitQueue.order.length) {
      const tId = chitQueue.order[nextIndex];
      const t = teams[tId];
      
      let tMen = t.menCount;
      let tWomen = t.womenCount;
      
      // Predict the updated counts for the team we JUST modified
      if (tId === currentTeamId) {
        if (countKey === "menCount") tMen++;
        else tWomen++;
      }
      
      // If this team is still incomplete, break and use this index
      if (tMen < tournament.menSlots || tWomen < tournament.womenSlots) {
        break;
      }
      
      nextIndex = (nextIndex + 1) % chitQueue.order.length;
      loopCount++;
    }
    
    updates[`tournaments/${tournamentId}/chitQueue/currentIndex`] = nextIndex;

    await update(ref(db), updates);
    setAssignments(a => ({ ...a, [player.playerId]: currentTeamId }));

    const note = slotFull ? " (forced override)" : "";
    toast.success(`${player.name} → ${team.name}!${note}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>;
  if (!tournament) return null;
  if (chitList.length === 0) return <div className="min-h-screen flex items-center justify-center text-white">Redirecting...</div>;

  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === chitList.length;

  return (
    <main className="min-h-screen p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#d4af37] tracking-widest uppercase drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            Chit Round
          </h1>
          <p className="text-[#b0b8d4] mt-2 text-sm">
            {chitList.length} unsold player{chitList.length !== 1 ? "s" : ""} · {assignedCount} assigned
          </p>
          <div className="mt-3 h-1.5 bg-white/10 rounded-full max-w-xs mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#d4af37] to-yellow-300 rounded-full transition-all duration-500"
              style={{ width: `${(assignedCount / chitList.length) * 100}%` }} />
          </div>
        </div>

        {/* Turn indicator */}
        <div className="glass rounded-xl p-6 mb-8 border border-[#d4af37]/30 shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col items-center">
          <p className="text-xs text-[#b0b8d4] mb-2 uppercase tracking-widest font-bold">Current Turn</p>
          {currentTeamId ? (
            <div className="text-3xl md:text-4xl font-black text-white text-center">
              {teams[currentTeamId]?.name}
            </div>
          ) : (
            <div className="text-2xl font-bold text-gray-500 italic">All teams complete!</div>
          )}
          
          {chitQueue && chitQueue.order.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-3 w-full">
              {chitQueue.order.map((tId, idx) => {
                const isCurrent = idx === chitQueue.currentIndex;
                const team = teams[tId];
                const isFull = team.menCount >= tournament.menSlots && team.womenCount >= tournament.womenSlots;
                
                return (
                  <div key={tId} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    isCurrent 
                      ? "border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37] scale-110 shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                      : isFull
                      ? "border-green-500/30 bg-green-500/10 text-green-400 opacity-50"
                      : "border-white/10 bg-black/20 text-[#b0b8d4]"
                  }`}>
                    {team.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chit grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {chitList.map((player, idx) => {
            const isRevealed = revealed[player.playerId];
            const assignedTeam = assignments[player.playerId] ? teams[assignments[player.playerId]] : null;

            return (
              <div key={player.playerId} className="flex flex-col gap-1.5">
                <div
                  onClick={() => !isRevealed && currentTeamId && handlePickChit(player)}
                  className={`aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center p-3 select-none transition-all duration-500 ${isRevealed
                    ? "border-[#d4af37]/60 bg-gradient-to-b from-[#d4af37]/10 to-transparent cursor-default"
                    : currentTeamId
                      ? "border-white/30 bg-black/40 hover:border-[#d4af37] hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] cursor-pointer"
                      : "border-white/10 bg-black/30 cursor-not-allowed opacity-60"
                    }`}>
                  {!isRevealed ? (
                    <>
                      <div className="text-[#b0b8d4] text-xs font-bold">Chit #{idx + 1}</div>
                      {currentTeamId && <div className="text-[#4a5568] text-[10px] mt-1 text-center">pick for {teams[currentTeamId]?.name}</div>}
                    </>
                  ) : (
                    <>
                      <div className={`text-3xl mb-2 ${player.gender === "Men" ? "text-blue-400" : "text-pink-400"}`}>
                        {player.gender === "Men" ? "♂" : "♀"}
                      </div>
                      <div className="font-black text-white text-center text-xs leading-tight">{player.name}</div>
                      <div className={`text-[9px] mt-1 px-2 py-0.5 rounded font-bold ${player.gender === "Men" ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"}`}>
                        {player.gender}
                      </div>
                      {assignedTeam && (
                        <div className="text-[#d4af37] text-[9px] font-bold mt-1.5 text-center">→ {assignedTeam.name}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          {(allAssigned || !currentTeamId) && (
            <button onClick={() => router.push(`/colors?tournament=${tournamentId}`)}
              className="bg-gradient-to-r from-[#d4af37] to-yellow-400 text-[#0a0e27] px-10 py-4 rounded-full font-black text-xl shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:shadow-[0_0_45px_rgba(212,175,55,0.9)] transition-all hover:scale-105 animate-fade-in">
              Assign Team Colors
            </button>
          )}
          <button onClick={() => router.push(`/colors?tournament=${tournamentId}`)}
            className="text-xs text-[#4a5568] hover:text-[#b0b8d4] transition border border-white/10 px-5 py-2 rounded-lg">
            Skip & Proceed to Colors →
          </button>
        </div>
      </div>
    </main>
  );
}

export default function UnsoldChitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>}>
      <UnsoldChitContent />
    </Suspense>
  );
}
