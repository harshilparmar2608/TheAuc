"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, Team, Player } from "@/types";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

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
    const updates: Record<string, unknown> = {};
    const final: Record<string, string> = {};
    teams.forEach((team, idx) => {
      updates[`tournaments/${tournamentId}/teams/${team.id}/color`] = shuffled[idx];
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
    teams.forEach(t => { updates[`tournaments/${tournamentId}/teams/${t.id}/color`] = manualColors[t.id]; });
    updates[`tournaments/${tournamentId}/colorAssignmentStatus`] = "assigned";
    try {
      await update(ref(db), updates);
      setDisplayColors({ ...manualColors });
      toast.success("Colors saved!");
    } catch { toast.error("Failed to save colors."); }
  };

  const handleDownloadExcel = () => {
    if (!tournament) return;
    const wb = XLSX.utils.book_new();
    const rows: Record<string, string>[] = [];
    teams.forEach(team => {
      const teamPlayers = Object.values(players).filter(p => p.soldTo === team.id);
      rows.push({ "Team": team.name, "Captain": team.captain, "Player Name": "", "Gender": "", "Price / Note": "" });
      teamPlayers.forEach(p => {
        rows.push({ "Team": "", "Captain": "", "Player Name": p.name, "Gender": p.gender, "Price / Note": p.soldPrice > 0 ? `₹${p.soldPrice.toLocaleString()}` : "Chit Round" });
      });
      rows.push({ "Team": "", "Captain": "", "Player Name": "", "Gender": "", "Price / Note": "" });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Teams & Players");
    XLSX.writeFile(wb, `${tournament.name}_${tournament.year}_teams.xlsx`);
    toast.success("Excel downloaded!");
  };

  const handleFinish = async () => {
    if (!tournamentId) return;
    await update(ref(db, `tournaments/${tournamentId}`), { status: "completed" });
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>;
  if (!tournament) return <div className="p-8 text-center">Tournament not found</div>;

  const isAssigned = tournament.colorAssignmentStatus === "assigned";

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
              <div className="text-xs text-[#b0b8d4]">{team.captain}</div>
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
          {!isAssigned ? (
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
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={handleSaveManualColors}
                className="border-2 border-[#d4af37] text-[#d4af37] px-6 py-2 rounded-full font-bold hover:bg-[#d4af37]/10 transition text-sm">
                Update Colors
              </button>
              <button onClick={handleDownloadExcel}
                className="bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-500 transition shadow-[0_0_20px_rgba(22,163,74,0.5)]">
                Download Excel
              </button>
              <button onClick={handleFinish}
                className="bg-[#d4af37] text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition shadow-[0_0_20px_rgba(212,175,55,0.5)]">
                Finish Tournament
              </button>
            </div>
          )}
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
