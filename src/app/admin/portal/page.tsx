"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, set, push, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Season } from "@/types";
import Link from "next/link";

export default function PortalAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<Season[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null);
  
  // Form State
  const [year, setYear] = useState(new Date().getFullYear());
  const [name, setName] = useState("");
  const [winner, setWinner] = useState("");
  const [runnerUp, setRunnerUp] = useState("");
  const [manOfTheTournament, setManOfTheTournament] = useState("");
  const [topScorerName, setTopScorerName] = useState("");
  const [topScorerRuns, setTopScorerRuns] = useState(0);
  const [topScorerMatches, setTopScorerMatches] = useState(0);
  const [topWicketTakerName, setTopWicketTakerName] = useState("");
  const [topWicketTakerWickets, setTopWicketTakerWickets] = useState(0);
  const [topWicketTakerMatches, setTopWicketTakerMatches] = useState(0);
  const [mvpWomen, setMvpWomen] = useState("");
  const [bestBowler, setBestBowler] = useState("");
  const [totalMatches, setTotalMatches] = useState(0);
  const [status, setStatus] = useState<"completed" | "live" | "upcoming">("completed");

  useEffect(() => {
    if (sessionStorage.getItem("gjpl_admin_auth") !== "true") {
      router.push("/admin");
      return;
    }

    const seasonsRef = ref(db, "seasons");
    const unsub = onValue(seasonsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const seasonsList = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })) as Season[];
        setSeasons(seasonsList.sort((a, b) => b.year - a.year));
      } else {
        setSeasons([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const resetForm = () => {
    setYear(new Date().getFullYear());
    setName("");
    setWinner("");
    setRunnerUp("");
    setManOfTheTournament("");
    setTopScorerName("");
    setTopScorerRuns(0);
    setTopScorerMatches(0);
    setTopWicketTakerName("");
    setTopWicketTakerWickets(0);
    setTopWicketTakerMatches(0);
    setMvpWomen("");
    setBestBowler("");
    setTotalMatches(0);
    setStatus("completed");
    setEditSeasonId(null);
    setIsEditing(false);
  };

  const handleEdit = (s: Season) => {
    setYear(s.year);
    setName(s.name);
    setWinner(s.winner);
    setRunnerUp(s.runnerUp);
    setManOfTheTournament(s.manOfTheTournament);
    setTopScorerName(s.topScorer.name);
    setTopScorerRuns(s.topScorer.value);
    setTopScorerMatches(s.topScorer.matches);
    setTopWicketTakerName(s.topWicketTaker.name);
    setTopWicketTakerWickets(s.topWicketTaker.value);
    setTopWicketTakerMatches(s.topWicketTaker.matches);
    setMvpWomen(s.mvpWomen);
    setBestBowler(s.bestBowler);
    setTotalMatches(s.totalMatches);
    setStatus(s.status);
    setEditSeasonId(s.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this season data?")) {
      await remove(ref(db, `seasons/${id}`));
      toast.success("Season deleted.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !year) {
      toast.error("Name and Year are required.");
      return;
    }

    const seasonData = {
      year,
      name,
      winner,
      runnerUp,
      manOfTheTournament,
      topScorer: { name: topScorerName, value: topScorerRuns, matches: topScorerMatches },
      topWicketTaker: { name: topWicketTakerName, value: topWicketTakerWickets, matches: topWicketTakerMatches },
      mvpWomen,
      bestBowler,
      totalMatches,
      status
    };

    try {
      if (editSeasonId) {
        await set(ref(db, `seasons/${editSeasonId}`), seasonData);
        toast.success("Season updated successfully.");
      } else {
        const newRef = push(ref(db, "seasons"));
        await set(newRef, seasonData);
        toast.success("New season added successfully.");
      }
      resetForm();
    } catch (error) {
      toast.error("Error saving season.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#d4af37]">Loading...</div>;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#d4af37]">GJPL Portal Admin</h1>
          <p className="text-[#b0b8d4]">Manage seasons, historical data, and hall of fame.</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition">
          Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Section */}
        <div className="lg:col-span-1 glass p-6 rounded-xl h-fit">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">
            {isEditing ? "Edit Season" : "Add New Season"}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Name (e.g. GJPL 1)</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Year</label>
                <input required type="number" value={year || ""} onChange={e => setYear(parseInt(e.target.value)||0)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Winner</label>
                <input type="text" value={winner} onChange={e => setWinner(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Runner Up</label>
                <input type="text" value={runnerUp} onChange={e => setRunnerUp(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#b0b8d4] mb-1">Man of the Tournament</label>
              <input type="text" value={manOfTheTournament} onChange={e => setManOfTheTournament(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
            </div>

            <div>
              <label className="block text-xs text-[#b0b8d4] mb-1">Woman of the Tournament (MVP)</label>
              <input type="text" value={mvpWomen} onChange={e => setMvpWomen(e.target.value)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
            </div>

            <div className="border border-white/10 p-3 rounded-lg bg-black/20">
              <label className="block text-xs font-bold text-[#d4af37] mb-2">Top Scorer (Best Batsman)</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Name" value={topScorerName} onChange={e => setTopScorerName(e.target.value)} className="col-span-3 bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
                <input type="number" placeholder="Runs" value={topScorerRuns || ""} onChange={e => setTopScorerRuns(parseInt(e.target.value)||0)} className="bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
                <input type="number" placeholder="Matches" value={topScorerMatches || ""} onChange={e => setTopScorerMatches(parseInt(e.target.value)||0)} className="bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
            </div>

            <div className="border border-white/10 p-3 rounded-lg bg-black/20">
              <label className="block text-xs font-bold text-[#d4af37] mb-2">Top Wicket Taker (Best Bowler)</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Name" value={topWicketTakerName} onChange={e => setTopWicketTakerName(e.target.value)} className="col-span-3 bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
                <input type="number" placeholder="Wickets" value={topWicketTakerWickets || ""} onChange={e => setTopWicketTakerWickets(parseInt(e.target.value)||0)} className="bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
                <input type="number" placeholder="Matches" value={topWicketTakerMatches || ""} onChange={e => setTopWicketTakerMatches(parseInt(e.target.value)||0)} className="bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Total Matches</label>
                <input type="number" value={totalMatches || ""} onChange={e => setTotalMatches(parseInt(e.target.value)||0)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-black/50 border border-white/20 rounded p-2 text-sm text-white">
                  <option value="completed">Completed</option>
                  <option value="live">Live</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 bg-[#d4af37] text-black font-bold py-2 rounded hover:bg-yellow-400 transition">
                {isEditing ? "Update Season" : "Add Season"}
              </button>
              {isEditing && (
                <button type="button" onClick={resetForm} className="px-4 bg-white/10 text-white font-bold py-2 rounded hover:bg-white/20 transition">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">
            Recorded Seasons
          </h2>
          
          {seasons.length === 0 ? (
            <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10 text-[#b0b8d4]">
              No seasons added yet. Use the form to add historical data.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seasons.map(s => (
                <div key={s.id} className="glass p-5 rounded-xl border border-white/10 hover:border-[#d4af37]/30 transition relative group">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleEdit(s)} className="p-1.5 bg-[#d4af37]/20 text-[#d4af37] rounded hover:bg-[#d4af37]/40" title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40" title="Delete">
                      🗑️
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">🏆</div>
                    <div>
                      <h3 className="text-lg font-bold text-[#d4af37]">{s.name} <span className="text-sm font-normal text-white/50">({s.year})</span></h3>
                      <div className="text-xs text-[#b0b8d4] uppercase tracking-wider">{s.status}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-[#b0b8d4]">Winner:</span>
                      <span className="font-semibold text-white">{s.winner || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-[#b0b8d4]">Runner Up:</span>
                      <span className="text-white">{s.runnerUp || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-[#b0b8d4]">Man of Tournament:</span>
                      <span className="text-white">{s.manOfTheTournament || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-[#b0b8d4]">Woman of Tournament:</span>
                      <span className="text-white">{s.mvpWomen || "-"}</span>
                    </div>
                    
                    <div className="pt-2 grid grid-cols-2 gap-2">
                      <div className="bg-black/30 p-2 rounded border border-white/5 text-center">
                        <div className="text-[10px] text-[#d4af37] uppercase tracking-wider mb-1">Top Scorer</div>
                        <div className="font-semibold">{s.topScorer?.name || "-"}</div>
                        <div className="text-xs text-[#b0b8d4]">{s.topScorer?.value || 0} runs</div>
                      </div>
                      <div className="bg-black/30 p-2 rounded border border-white/5 text-center">
                        <div className="text-[10px] text-[#d4af37] uppercase tracking-wider mb-1">Top Bowler</div>
                        <div className="font-semibold">{s.topWicketTaker?.name || "-"}</div>
                        <div className="text-xs text-[#b0b8d4]">{s.topWicketTaker?.value || 0} wickets</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
