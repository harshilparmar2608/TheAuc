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
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  // genderOverride: set of playerIds where host manually overrode gender check
  const [genderOverride, setGenderOverride] = useState<Record<string, boolean>>({});
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

  const teamList = Object.values(teams);

  // Check if ALL remaining unassigned players of a gender are less than what's needed
  const getGenderStats = () => {
    const unassignedPlayers = chitList.filter(p => !revealed[p.playerId]);
    const remainingMen = unassignedPlayers.filter(p => p.gender === "Men").length;
    const remainingWomen = unassignedPlayers.filter(p => p.gender === "Women").length;

    // Pending slots across all teams
    let pendingMenSlots = 0;
    let pendingWomenSlots = 0;
    if (tournament) {
      teamList.forEach(team => {
        pendingMenSlots += Math.max(0, tournament.menSlots - team.menCount);
        pendingWomenSlots += Math.max(0, tournament.womenSlots - team.womenCount);
      });
    }

    return { remainingMen, remainingWomen, pendingMenSlots, pendingWomenSlots };
  };

  const handlePickChit = async (player: Player, forceOverride = false) => {
    if (!selectedTeamId) { toast.error("Select a team first!"); return; }
    if (revealed[player.playerId]) return;
    if (!tournament || !tournamentId) return;
    const team = teams[selectedTeamId];
    if (!team) return;

    const isMen = player.gender === "Men";
    const slotFull = isMen
      ? team.menCount >= tournament.menSlots
      : team.womenCount >= tournament.womenSlots;

    if (slotFull && !forceOverride && !genderOverride[player.playerId]) {
      toast.error(`${team.name} has no ${player.gender} slots left! Use the Override button below to allow this pick.`);
      return;
    }

    // If override: put player in the opposite slot count
    const countKey = slotFull && forceOverride
      ? (isMen ? "womenCount" : "menCount")   // put them in the other gender's count
      : (isMen ? "menCount" : "womenCount");

    const currentCount = slotFull && forceOverride
      ? (isMen ? team.womenCount : team.menCount)
      : (isMen ? team.menCount : team.womenCount);

    setRevealed(r => ({ ...r, [player.playerId]: true }));
    const updates: Record<string, unknown> = {};
    updates[`tournaments/${tournamentId}/players/${player.playerId}/status`] = "sold";
    updates[`tournaments/${tournamentId}/players/${player.playerId}/soldTo`] = selectedTeamId;
    updates[`tournaments/${tournamentId}/players/${player.playerId}/soldPrice`] = 0;
    updates[`tournaments/${tournamentId}/teams/${selectedTeamId}/${countKey}`] = currentCount + 1;
    await update(ref(db), updates);
    setAssignments(a => ({ ...a, [player.playerId]: selectedTeamId }));

    const note = slotFull && forceOverride ? " (gender override)" : "";
    toast.success(`${player.name} → ${team.name}!${note}`);
  };

  const toggleOverride = (playerId: string) => {
    setGenderOverride(g => ({ ...g, [playerId]: !g[playerId] }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>;
  if (!tournament) return null;
  if (chitList.length === 0) return <div className="min-h-screen flex items-center justify-center text-white">Redirecting...</div>;

  const assignedCount = Object.keys(assignments).length;
  const allAssigned = assignedCount === chitList.length;
  const { remainingMen, remainingWomen, pendingMenSlots, pendingWomenSlots } = getGenderStats();
  const menShortfall = remainingMen < pendingMenSlots;
  const womenShortfall = remainingWomen < pendingWomenSlots;
  const showOverrideHint = menShortfall || womenShortfall;

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

          {/* Gender imbalance warning */}
          {showOverrideHint && (
            <div className="mt-4 mx-auto max-w-lg bg-orange-500/10 border border-orange-500/40 rounded-xl px-4 py-3 text-sm text-orange-300">
              <span className="font-bold">⚠ Gender imbalance detected!</span>
              {menShortfall && <span className="block text-xs mt-0.5">Only {remainingMen} male player{remainingMen !== 1 ? "s" : ""} left for {pendingMenSlots} pending Men slots.</span>}
              {womenShortfall && <span className="block text-xs mt-0.5">Only {remainingWomen} female player{remainingWomen !== 1 ? "s" : ""} left for {pendingWomenSlots} pending Women slots.</span>}
              <span className="block text-xs mt-1 text-orange-200/70">Use the <strong>Override</strong> button on a chit card to allow picking opposite gender.</span>
            </div>
          )}
        </div>

        {/* Team selector */}
        <div className="glass rounded-xl p-4 mb-6">
          <p className="text-xs text-[#b0b8d4] mb-3 uppercase tracking-wider font-semibold">Select which team is picking →</p>
          <div className="flex flex-wrap gap-2">
            {teamList.map(team => {
              const hasSlots = team.menCount < tournament.menSlots || team.womenCount < tournament.womenSlots;
              const isSelected = selectedTeamId === team.id;
              return (
                <button key={team.id} onClick={() => setSelectedTeamId(team.id)} disabled={!hasSlots}
                  className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${isSelected ? "border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.3)]" : hasSlots ? "border-white/20 hover:border-[#d4af37]/50 text-white" : "border-white/10 text-[#4a5568] opacity-40 cursor-not-allowed"}`}>
                  {team.name}
                  <span className="ml-2 text-[10px] opacity-60 font-mono">{team.menCount}M {team.womenCount}W</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chit grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {chitList.map((player, idx) => {
            const isRevealed = revealed[player.playerId];
            const assignedTeam = assignments[player.playerId] ? teams[assignments[player.playerId]] : null;
            const team = teams[selectedTeamId];
            const isMen = player.gender === "Men";
            const slotFull = team
              ? (isMen ? team.menCount >= tournament.menSlots : team.womenCount >= tournament.womenSlots)
              : false;
            const isOverridden = genderOverride[player.playerId];

            return (
              <div key={player.playerId} className="flex flex-col gap-1.5">
                <div
                  onClick={() => !isRevealed && handlePickChit(player, isOverridden)}
                  className={`aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center p-3 select-none transition-all duration-500 ${isRevealed
                    ? "border-[#d4af37]/60 bg-gradient-to-b from-[#d4af37]/10 to-transparent cursor-default"
                    : selectedTeamId
                      ? slotFull && !isOverridden
                        ? "border-red-500/40 bg-red-500/5 hover:border-red-400 cursor-pointer opacity-70"
                        : "border-white/30 bg-black/40 hover:border-[#d4af37] hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] cursor-pointer"
                      : "border-white/10 bg-black/30 cursor-not-allowed opacity-60"
                    }`}>
                  {!isRevealed ? (
                    <>
                      <div className="text-[#b0b8d4] text-xs font-bold">Chit #{idx + 1}</div>
                      {selectedTeamId && <div className="text-[#4a5568] text-[10px] mt-1">click to open</div>}
                      {slotFull && !isOverridden && selectedTeamId && (
                        <div className="text-red-400 text-[9px] mt-1 font-bold text-center">SLOT FULL</div>
                      )}
                      {isOverridden && (
                        <div className="text-orange-400 text-[9px] mt-1 font-bold text-center">⚡ OVERRIDE ON</div>
                      )}
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

                {/* Override toggle button — only show when not revealed, a team is selected, and slot is full */}
                {!isRevealed && selectedTeamId && slotFull && (
                  <button
                    onClick={() => toggleOverride(player.playerId)}
                    className={`w-full text-[10px] font-bold py-1 rounded-lg border transition-all ${
                      isOverridden
                        ? "bg-orange-500/20 border-orange-500/60 text-orange-300 hover:bg-orange-500/30"
                        : "bg-white/5 border-white/20 text-[#b0b8d4] hover:border-orange-400/50 hover:text-orange-400"
                    }`}
                  >
                    {isOverridden ? "⚡ Override ON" : "Override"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          {allAssigned && (
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
