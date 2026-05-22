"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, Team, Player } from "@/types";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

// ─── Animated Team Card ─────────────────────────────────────────────────────

const SPIN_NAMES = [
  "Warriors", "Titans", "Eagles", "Sharks", "Dragons",
  "Lions", "Panthers", "Cobras", "Bulls", "Phoenix",
  "Wolves", "Blazers", "Hawks", "Tigers", "Vipers",
];

function TeamRevealCard({
  team,
  color,
  revealState,
}: {
  team: Team;
  color: string;
  revealState: "hidden" | "spinning" | "revealed";
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
        <div className="text-[10px] text-[#4a5568]">Not yet revealed</div>
      </div>
    );
  }

  if (revealState === "spinning") {
    return (
      <div
        className="relative rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all duration-300 animate-pulse"
        style={{
          borderColor: `${color}80`,
          backgroundColor: `${color}12`,
          boxShadow: `0 0 30px ${color}50`,
        }}
      >
        {/* Spinning color orb */}
        <div
          className="w-14 h-14 rounded-full border-4 border-white/30 animate-spin"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 25px ${color}`,
          }}
        />
        <div className="font-black text-base text-white tracking-widest animate-pulse">
          {spinName}
        </div>
        <div className="text-[10px] text-[#b0b8d4] animate-pulse">Revealing...</div>
      </div>
    );
  }

  // revealed
  return (
    <div
      className="relative rounded-2xl border-2 p-5 flex flex-col items-center gap-2 transition-all duration-700 animate-[scaleIn_0.5s_ease-out]"
      style={{
        borderColor: `${color}90`,
        backgroundColor: `${color}15`,
        boxShadow: `0 0 40px ${color}40`,
      }}
    >
      {/* Stamp effect */}
      <div
        className="absolute -top-3 -right-3 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full rotate-12 shadow-lg animate-[bounceIn_0.4s_ease-out]"
      >
        REVEALED!
      </div>
      <div
        className="w-14 h-14 rounded-full border-4 border-white/40 shadow-2xl"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 35px ${color}90`,
        }}
      />
      <div className="font-black text-base text-white text-center leading-tight">{team.name}</div>
      <div className="text-xs text-[#b0b8d4] text-center">{team.captain}</div>
      <div
        className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
        style={{ borderColor: `${color}60`, color, backgroundColor: `${color}15` }}
      >
        {color}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ColorAssignmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [displayColors, setDisplayColors] = useState<Record<string, string>>({});
  const [manualColors, setManualColors] = useState<Record<string, string>>({});

  // ─── Reveal state ───────────────────────────────────────────────────────────
  const [revealPhase, setRevealPhase] = useState<"idle" | "running" | "done">("idle");
  // Map of teamId → revealState
  const [revealStates, setRevealStates] = useState<Record<string, "hidden" | "spinning" | "revealed">>({});
  const revealTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!tournamentId) return;
    return onValue(ref(db, `tournaments/${tournamentId}`), snapshot => {
      const data = snapshot.val();
      if (data) {
        setTournament(data);
        if (data.players) setPlayers(data.players);
        if (data.teams) {
          const arr = Object.keys(data.teams).map(key => ({ id: key, ...data.teams[key] })) as Team[];
          setTeams(arr);
          if (!assigning) {
            const init: Record<string, string> = {};
            const manual: Record<string, string> = {};
            arr.forEach(t => { init[t.id] = t.color || "#4a5568"; manual[t.id] = t.color || "#4a5568"; });
            setDisplayColors(init);
            setManualColors(manual);
          }
        }
      }
      setLoading(false);
    });
  }, [tournamentId, assigning]);

  // ─── Color assignment (pre-reveal) ─────────────────────────────────────────
  const handleAssignColors = async () => {
    if (!tournament || !tournament.colors || teams.length !== tournament.colors.length) {
      toast.error("Color palette doesn't match team count."); return;
    }
    setAssigning(true);
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      const r: Record<string, string> = {};
      teams.forEach(t => { r[t.id] = tournament.colors![Math.floor(Math.random() * tournament.colors!.length)]; });
      setDisplayColors(r);
      if (ticks > 20) { clearInterval(interval); finalizeAssignment(); }
    }, 100);
  };

  const finalizeAssignment = async () => {
    if (!tournamentId || !tournament || !tournament.colors) return;
    const shuffled = [...tournament.colors].sort(() => Math.random() - 0.5);
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const groupNames = Array.from({ length: tournament.groupCount || 1 }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);

    const updates: Record<string, unknown> = {};
    const final: Record<string, string> = {};

    const groupAssignments: Record<string, string> = {};
    if (tournament.groupCount && tournament.groupCount > 1) {
      shuffledTeams.forEach((team, idx) => {
        groupAssignments[team.id] = groupNames[idx % tournament.groupCount!];
      });
    }

    teams.forEach((team, idx) => {
      updates[`tournaments/${tournamentId}/teams/${team.id}/color`] = shuffled[idx];
      if (groupAssignments[team.id]) {
        updates[`tournaments/${tournamentId}/teams/${team.id}/group`] = groupAssignments[team.id];
      }
      final[team.id] = shuffled[idx];
    });
    updates[`tournaments/${tournamentId}/colorAssignmentStatus`] = "assigned";
    try {
      await update(ref(db), updates);
      setDisplayColors(final);
      setManualColors(final);
      toast.success("Colors assigned randomly!");
    } catch { toast.error("Failed to assign colors."); }
    finally { setAssigning(false); }
  };

  const handleSaveManualColors = async () => {
    if (!tournamentId) return;
    const updates: Record<string, unknown> = {};

    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const groupNames = Array.from({ length: tournament?.groupCount || 1 }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
    const groupAssignments: Record<string, string> = {};

    if (tournament?.groupCount && tournament.groupCount > 1) {
      shuffledTeams.forEach((team, idx) => {
        groupAssignments[team.id] = team.group || groupNames[idx % tournament.groupCount!];
      });
    }

    teams.forEach(t => {
      updates[`tournaments/${tournamentId}/teams/${t.id}/color`] = manualColors[t.id];
      if (groupAssignments[t.id]) {
        updates[`tournaments/${tournamentId}/teams/${t.id}/group`] = groupAssignments[t.id];
      }
    });
    updates[`tournaments/${tournamentId}/colorAssignmentStatus`] = "assigned";
    try {
      await update(ref(db), updates);
      setDisplayColors({ ...manualColors });
      toast.success("Colors saved!");
    } catch { toast.error("Failed to save colors."); }
  };

  // ─── Reveal sequence ────────────────────────────────────────────────────────
  const startReveal = useCallback(() => {
    if (!teams.length || !tournamentId) return;
    setRevealPhase("running");
    update(ref(db, `tournaments/${tournamentId}/colorReveal`), { phase: "running" });

    // Build interleaved group order: A, B, A, B, ...
    const groupMap: Record<string, Team[]> = {};
    teams.forEach(t => {
      const g = t.group || "Group A";
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push(t);
    });
    const groupKeys = Object.keys(groupMap).sort();

    const orderedTeams: Team[] = [];
    const maxLen = Math.max(...groupKeys.map(k => groupMap[k].length));
    for (let i = 0; i < maxLen; i++) {
      groupKeys.forEach(k => {
        if (groupMap[k][i]) orderedTeams.push(groupMap[k][i]);
      });
    }

    // Init all as hidden
    const initStates: Record<string, "hidden" | "spinning" | "revealed"> = {};
    teams.forEach(t => { initStates[t.id] = "hidden"; });
    setRevealStates(initStates);
    update(ref(db, `tournaments/${tournamentId}/colorReveal`), { states: initStates, phase: "running" });

    // Clear any old timeouts
    revealTimeouts.current.forEach(clearTimeout);
    revealTimeouts.current = [];

    const SPIN_DURATION = 1800; // ms spinning before lock
    const BETWEEN_REVEALS = 2200; // ms between starting each team reveal

    orderedTeams.forEach((team, i) => {
      // Start spinning
      const spinT = setTimeout(() => {
        setRevealStates(prev => {
          const next = { ...prev, [team.id]: "spinning" as const };
          update(ref(db, `tournaments/${tournamentId}/colorReveal`), { states: next });
          return next;
        });
      }, i * BETWEEN_REVEALS);

      // Lock in (revealed)
      const revealT = setTimeout(() => {
        setRevealStates(prev => {
          const next = { ...prev, [team.id]: "revealed" as const };
          update(ref(db, `tournaments/${tournamentId}/colorReveal`), { states: next });
          return next;
        });
      }, i * BETWEEN_REVEALS + SPIN_DURATION);

      revealTimeouts.current.push(spinT, revealT);
    });

    // Mark phase done after all reveals
    const doneT = setTimeout(() => {
      setRevealPhase("done");
      update(ref(db, `tournaments/${tournamentId}/colorReveal`), { phase: "done" });
    }, orderedTeams.length * BETWEEN_REVEALS + SPIN_DURATION + 500);
    revealTimeouts.current.push(doneT);
  }, [teams, tournamentId]);

  const skipReveal = () => {
    if (!tournamentId) return;
    revealTimeouts.current.forEach(clearTimeout);
    revealTimeouts.current = [];
    const allRevealed: Record<string, "hidden" | "spinning" | "revealed"> = {};
    teams.forEach(t => { allRevealed[t.id] = "revealed"; });
    setRevealStates(allRevealed);
    setRevealPhase("done");
    update(ref(db, `tournaments/${tournamentId}/colorReveal`), { states: allRevealed, phase: "done" });
  };

  // ─── Excel Download ─────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    if (!tournament) return;
    const wb = XLSX.utils.book_new();
    const rows: Record<string, string>[] = [];
    teams.forEach(team => {
      const teamPlayers = Object.values(players).filter(p => p.soldTo === team.id);
      rows.push({
        "Team": team.name,
        "Captain": team.captain,
        "Color": team.color || displayColors[team.id] || "-",
        "Group": team.group || "-",
        "Player Name": "",
        "Gender": "",
        "Price / Note": "",
      });
      teamPlayers.forEach(p => {
        rows.push({
          "Team": "",
          "Captain": "",
          "Color": "",
          "Group": "",
          "Player Name": p.name,
          "Gender": p.gender,
          "Price / Note": p.soldPrice > 0 ? `₹${p.soldPrice.toLocaleString()}` : "Chit Round",
        });
      });
      rows.push({ "Team": "", "Captain": "", "Color": "", "Group": "", "Player Name": "", "Gender": "", "Price / Note": "" });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Teams & Players");
    XLSX.writeFile(wb, `${tournament.name}_${tournament.year}_teams.xlsx`);
    toast.success("Excel downloaded!");
  };

  const handleFinish = async () => {
    if (!tournamentId) return;
    await update(ref(db, `tournaments/${tournamentId}`), { status: "completed" });
    router.push("/");
  };

  // ─── Loading / Not Found ────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" />
    </div>
  );
  if (!tournament) return <div className="p-8 text-center">Tournament not found</div>;

  const isAssigned = tournament.colorAssignmentStatus === "assigned";

  // ─── GROUP REVEAL VIEW (post-assignment) ────────────────────────────────────
  if (isAssigned) {
    // Build group map from current team data
    const groupMap: Record<string, Team[]> = {};
    teams.forEach(t => {
      const g = t.group || "All Teams";
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push(t);
    });
    const groupKeys = Object.keys(groupMap).sort();
    const hasGroups = groupKeys.length > 1;

    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-10">
        {/* Page Title */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="text-xs text-[#d4af37] uppercase tracking-[0.3em] font-bold mb-2">
            {tournament.name} {tournament.year}
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_0_30px_rgba(212,175,55,0.4)] tracking-tight">
            Team <span className="text-[#d4af37]">Groups</span>
          </h1>
          <p className="text-[#b0b8d4] mt-3 text-sm">
            {hasGroups ? `${groupKeys.length} groups · ${teams.length} teams` : `${teams.length} teams`}
          </p>
        </div>

        {/* Pre-reveal: show group placeholders + Start button */}
        {revealPhase === "idle" && (
          <div className="w-full max-w-5xl animate-fade-in">
            {/* Group name labels */}
            <div className={`grid gap-6 mb-10 ${hasGroups ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              {groupKeys.map((groupName, gi) => (
                <div
                  key={groupName}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center"
                  style={{
                    animationDelay: `${gi * 200}ms`,
                    animation: "fadeSlideUp 0.6s ease-out both",
                  }}
                >
                  <div
                    className="text-4xl font-black tracking-widest uppercase mb-2"
                    style={{
                      background: "linear-gradient(135deg, #d4af37, #fff)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {groupName}
                  </div>
                  <div className="text-[#b0b8d4] text-sm">{groupMap[groupName].length} teams</div>
                  <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                    {groupMap[groupName].map(() => (
                      <div
                        key={Math.random()}
                        className="h-10 rounded-xl bg-white/5 border border-white/10 animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startReveal}
                className="bg-gradient-to-r from-[#d4af37] to-yellow-400 text-[#0a0e27] px-12 py-5 rounded-full font-black text-2xl shadow-[0_0_40px_rgba(212,175,55,0.6)] hover:shadow-[0_0_60px_rgba(212,175,55,0.9)] transition-all hover:scale-105"
              >
                🎉 Start Reveal
              </button>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                <button
                  onClick={handleSaveManualColors}
                  className="border border-[#d4af37]/50 text-[#d4af37] px-5 py-2 rounded-full text-sm font-bold hover:bg-[#d4af37]/10 transition"
                >
                  Update Colors
                </button>
              </div>
            </div>

            {/* Manual color pickers (still accessible) */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl mx-auto">
              {teams.map(team => (
                <div key={team.id} className="bg-black/40 p-4 rounded-xl border border-white/10 flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-full border-4 border-white/20 shadow-xl"
                    style={{ backgroundColor: displayColors[team.id] || "#4a5568", boxShadow: `0 0 20px ${displayColors[team.id] || "#4a5568"}60` }}
                  />
                  <span className="font-bold text-sm text-center">{team.name}</span>
                  <span className="text-xs text-[#b0b8d4]">{team.captain}</span>
                  {team.group && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-bold tracking-widest">{team.group}</span>}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={manualColors[team.id] || "#4a5568"}
                      onChange={e => {
                        const c = e.target.value;
                        setManualColors(m => ({ ...m, [team.id]: c }));
                        setDisplayColors(d => ({ ...d, [team.id]: c }));
                      }}
                      className="w-7 h-7 rounded cursor-pointer border border-white/20 bg-transparent p-0.5"
                    />
                    <span className="text-[10px] font-mono text-[#b0b8d4]">{manualColors[team.id] || "#4a5568"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* During reveal */}
        {(revealPhase === "running" || revealPhase === "done") && (
          <div className="w-full max-w-5xl animate-fade-in">

            {/* Skip button (during running) */}
            {revealPhase === "running" && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={skipReveal}
                  className="text-xs border border-white/20 text-[#b0b8d4] px-5 py-2 rounded-full hover:border-white/40 hover:text-white transition"
                >
                  Skip Reveal →
                </button>
              </div>
            )}

            {/* Reveal cards grouped */}
            {hasGroups ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {groupKeys.map((groupName, gi) => {
                  const groupTeams = groupMap[groupName];
                  const groupColor = groupTeams.find(t => t.color)?.color || "#d4af37";
                  return (
                    <div key={groupName}>
                      {/* Group Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-1.5 h-10 rounded-full"
                          style={{ backgroundColor: groupColor, boxShadow: `0 0 12px ${groupColor}` }}
                        />
                        <div
                          className="text-3xl font-black tracking-widest uppercase"
                          style={{
                            background: "linear-gradient(135deg, #d4af37, #fff8dc)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          {groupName}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {groupTeams.map(team => (
                          <TeamRevealCard
                            key={team.id}
                            team={team}
                            color={displayColors[team.id] || team.color || "#4a5568"}
                            revealState={revealStates[team.id] || "hidden"}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Single group — just show all teams
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {teams.map(team => (
                  <TeamRevealCard
                    key={team.id}
                    team={team}
                    color={displayColors[team.id] || team.color || "#4a5568"}
                    revealState={revealStates[team.id] || "hidden"}
                  />
                ))}
              </div>
            )}

            {/* ── Final summary + action buttons after reveal done ── */}
            {revealPhase === "done" && (
              <div className="mt-12 animate-fade-in">
                {/* Divider */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
                  <span className="text-[#d4af37] text-sm font-bold tracking-widest uppercase">All Teams Revealed</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
                </div>

                {/* Final full group summary */}
                {hasGroups && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {groupKeys.map(groupName => {
                      const groupTeams = groupMap[groupName];
                      return (
                        <div key={groupName} className="glass rounded-2xl p-5 border border-white/10">
                          <h2 className="text-xl font-black text-[#d4af37] mb-4 tracking-widest uppercase">{groupName}</h2>
                          <div className="flex flex-col gap-2">
                            {groupTeams.map(team => {
                              const col = displayColors[team.id] || team.color || "#4a5568";
                              return (
                                <div
                                  key={team.id}
                                  className="flex items-center gap-3 p-3 rounded-xl border"
                                  style={{ borderColor: `${col}40`, backgroundColor: `${col}10` }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-full border-2 border-white/20 shrink-0"
                                    style={{ backgroundColor: col, boxShadow: `0 0 15px ${col}80` }}
                                  />
                                  <div>
                                    <div className="font-black text-white text-sm">{team.name}</div>
                                    <div className="text-[#b0b8d4] text-xs">{team.captain}</div>
                                  </div>
                                  <div className="ml-auto text-[10px] font-mono text-[#b0b8d4]">{col}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={handleDownloadExcel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full font-bold shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all"
                  >
                    📥 Download Excel
                  </button>
                  <button
                    onClick={handleFinish}
                    className="bg-gradient-to-r from-[#d4af37] to-yellow-400 text-[#0a0e27] px-8 py-3 rounded-full font-black text-lg shadow-[0_0_25px_rgba(212,175,55,0.5)] hover:shadow-[0_0_40px_rgba(212,175,55,0.8)] transition-all"
                  >
                    Finish Tournament 🏆
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    );
  }

  // ─── PRE-ASSIGNMENT VIEW ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl glass rounded-xl p-10 text-center animate-fade-in">
        <h1 className="text-4xl font-black text-[#d4af37] mb-2 tracking-widest uppercase">Team Colors</h1>
        <p className="text-[#b0b8d4] mb-10 text-sm">Assign colors randomly, or pick manually using the color wheel for each team.</p>

        {/* Team color grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          {teams.map(team => (
            <div key={team.id} className="bg-black/40 p-5 rounded-xl border border-white/10 flex flex-col items-center gap-3">
              <div
                className={`w-20 h-20 rounded-full border-4 border-white/20 shadow-2xl transition-all duration-300 ${assigning ? "scale-110" : ""}`}
                style={{ backgroundColor: displayColors[team.id] || "#4a5568", boxShadow: `0 0 30px ${displayColors[team.id] || "#4a5568"}80` }}
              />
              <h3 className="font-bold text-base">{team.name}</h3>
              <div className="text-xs text-[#b0b8d4] flex flex-col items-center gap-1">
                <span>{team.captain}</span>
                {team.group && (
                  <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-widest uppercase mt-1">
                    {team.group}
                  </span>
                )}
              </div>
              {/* Manual color wheel */}
              <div className="flex items-center gap-2 mt-1">
                <label className="text-[10px] text-[#b0b8d4] uppercase tracking-wider">Pick</label>
                <input
                  type="color"
                  value={manualColors[team.id] || "#4a5568"}
                  onChange={e => {
                    const c = e.target.value;
                    setManualColors(m => ({ ...m, [team.id]: c }));
                    setDisplayColors(d => ({ ...d, [team.id]: c }));
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/20 bg-transparent p-0.5"
                  title={`Pick color for ${team.name}`}
                />
                <span className="text-[10px] font-mono text-[#b0b8d4]">{manualColors[team.id] || "#4a5568"}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={handleAssignColors} disabled={assigning}
              className="bg-[#d4af37] text-black px-8 py-3 rounded-full font-black text-lg hover:bg-yellow-400 transition transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(212,175,55,0.5)]">
              {assigning ? "Spinning..." : "Assign Randomly"}
            </button>
            <button onClick={handleSaveManualColors}
              className="border-2 border-[#d4af37] text-[#d4af37] px-8 py-3 rounded-full font-black text-lg hover:bg-[#d4af37]/10 transition">
              Save Manual Colors
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ColorAssignment() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>}>
      <ColorAssignmentContent />
    </Suspense>
  );
}
