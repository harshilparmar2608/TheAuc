"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, push, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Team, Player, IncrementRule } from "@/types";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";


export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("gjpl_admin_auth") !== "true") {
      router.push("/admin");
    }
  }, [router]);

  // Step 1: Basics
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [budget, setBudget] = useState(10000);
  const [playerBasePrice, setPlayerBasePrice] = useState(500);
  const [logo, setLogo] = useState("/logo.png");

  // Increment rules — default: ₹2k below 20k, ₹3k above
  const [incrementRules, setIncrementRules] = useState<IncrementRule[]>([
    { upTo: 20000, increment: 2000 },
    { upTo: null,  increment: 3000 },
  ]);

  const addIncrementRule = () => {
    setIncrementRules(prev => {
      // Insert a new finite tier before the last open-ended rule
      const last = prev[prev.length - 1];
      const secondLast = prev[prev.length - 2];
      const newUpTo = secondLast?.upTo ? secondLast.upTo + 10000 : 30000;
      const newRules = [...prev.slice(0, -1), { upTo: newUpTo, increment: last.increment }, last];
      return newRules;
    });
  };

  const removeIncrementRule = (idx: number) => {
    if (incrementRules.length <= 1) return;
    const next = [...incrementRules];
    next.splice(idx, 1);
    // ensure last rule is always open-ended
    next[next.length - 1] = { ...next[next.length - 1], upTo: null };
    setIncrementRules(next);
  };

  const updateIncrementRule = (idx: number, field: keyof IncrementRule, value: number | null) => {
    const next = [...incrementRules];
    next[idx] = { ...next[idx], [field]: value };
    setIncrementRules(next);
  };

  // Step 2: Team Config
  const [menSlots, setMenSlots] = useState(5);
  const [womenSlots, setWomenSlots] = useState(3);
  const [teamCount, setTeamCount] = useState(6);

  // Step 3: Colors
  const [colors, setColors] = useState<string[]>([]);
  const [pickerColor, setPickerColor] = useState("#e63946");

  // Step 4: Teams
  const [teams, setTeams] = useState<Omit<Team, "id" | "color">[]>([]);
  const [currentTeamName, setCurrentTeamName] = useState("");
  const [currentCaptain, setCurrentCaptain] = useState("");

  // Step 5: Players
  const [players, setPlayers] = useState<Omit<Player, "playerId" | "status" | "currentBid" | "currentBiddingTeam" | "soldTo" | "soldPrice" | "basePrice">[]>([]);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [currentPlayerGender, setCurrentPlayerGender] = useState<"Men" | "Women">("Men");

  const addColor = (color: string) => {
    if (colors.length < teamCount && !colors.includes(color)) {
      setColors([...colors, color]);
    } else if (colors.length >= teamCount) {
      toast.error(`You only need ${teamCount} colors.`);
    }
  };

  const removeColor = (colorToRemove: string) => {
    setColors(colors.filter(c => c !== colorToRemove));
  };

  const handleAddTeam = () => {
    if (teams.length >= teamCount) {
      toast.error(`You have already added all ${teamCount} teams.`);
      return;
    }
    if (!currentTeamName || !currentCaptain) {
      toast.error("Please fill all team details.");
      return;
    }
    setTeams([...teams, { 
      name: currentTeamName, 
      captain: currentCaptain,
      budget: budget,
      remainingBudget: budget,
      menCount: 0,
      womenCount: 0
    }]);
    setCurrentTeamName("");
    setCurrentCaptain("");
  };

  const handleAddPlayer = () => {
    if (!currentPlayerName) {
      toast.error("Please provide player name.");
      return;
    }
    setPlayers([...players, {
      name: currentPlayerName,
      gender: currentPlayerGender,
      photo: "/placeholder-user.png"
    }]);
    setCurrentPlayerName("");
  };

  const handleCreateTournament = async () => {
    if (teams.length !== teamCount) {
      toast.error(`Please add exactly ${teamCount} teams.`);
      return;
    }
    if (colors.length !== teamCount) {
      toast.error(`Please select exactly ${teamCount} colors.`);
      return;
    }

    setLoading(true);
    try {
      const tournamentRef = push(ref(db, "tournaments"));
      const tournamentId = tournamentRef.key;

      const tournamentData = {
        name,
        year,
        status: "setup",
        budget,
        basePrice: playerBasePrice,
        incrementRules,
        menSlots,
        womenSlots,
        logo,
        colors,
        colorAssignmentStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await set(tournamentRef, tournamentData);

      // Add teams
      teams.forEach((t) => {
        const teamRef = push(ref(db, `tournaments/${tournamentId}/teams`));
        set(teamRef, {
          ...t,
          id: teamRef.key,
          color: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });

      // Add players
      players.forEach((p) => {
        const playerRef = push(ref(db, `tournaments/${tournamentId}/players`));
        set(playerRef, {
          ...p,
          playerId: playerRef.key,
          basePrice: playerBasePrice,
          status: "available",
          currentBid: playerBasePrice,
          currentBiddingTeam: null,
          soldTo: null,
          soldPrice: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });

      // Initialize Auction State
      const auctionRef = ref(db, `tournaments/${tournamentId}/auction`);
      await set(auctionRef, {
        status: "not_started",
        currentPlayerIndex: 0,
        currentBid: playerBasePrice,
        currentBiddingTeam: null,
        timerSeconds: 30,
        timerRunning: false,
        soldPlayers: [],
        unsoldPlayers: [],
        rtmStatus: "not_started",
        rtmCurrentTeamIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      toast.success("Tournament created successfully!");
      router.push(`/admin?tournament=${tournamentId}`);
    } catch (error) {
      console.error(error);
      toast.error("Error creating tournament");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 flex flex-col items-center pb-24">
      <div className="w-full max-w-4xl glass rounded-xl p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8 border-b border-[#d4af37]/30 pb-4">
          <h1 className="text-3xl font-bold text-[#d4af37]">Tournament Setup</h1>
          <span className="text-[#b0b8d4]">Step {step} of 6</span>
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Tournament Basics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Year</label>
                <input type="number" value={year || ""} onChange={e => setYear(parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Budget per Team</label>
                <input type="number" value={budget || ""} onChange={e => setBudget(parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Base Price per Player</label>
                <input type="number" value={playerBasePrice || ""} onChange={e => setPlayerBasePrice(parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
            </div>

            {/* ── Increment Rules ── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white">Bid Increment Rules</h3>
                  <p className="text-xs text-[#b0b8d4] mt-0.5">Each click on a team raises the bid by the rule below. The last rule has no upper limit.</p>
                </div>
                <button
                  onClick={addIncrementRule}
                  className="text-xs bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] px-3 py-1.5 rounded-lg hover:bg-[#d4af37]/30 font-bold transition"
                >
                  + Add Tier
                </button>
              </div>

              <div className="space-y-2">
                {incrementRules.map((rule, idx) => {
                  const isLast = idx === incrementRules.length - 1;
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-xs font-bold text-[#d4af37] shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex flex-wrap gap-3 flex-1 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#b0b8d4] whitespace-nowrap">Bid below ₹</span>
                          {isLast ? (
                            <span className="text-sm font-bold text-[#d4af37] w-28 text-center">∞ (no limit)</span>
                          ) : (
                            <input
                              type="number"
                              value={rule.upTo ?? ""}
                              onChange={e => updateIncrementRule(idx, "upTo", parseInt(e.target.value) || 0)}
                              className="w-28 bg-black/50 border border-[#d4af37]/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#d4af37] font-mono"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#b0b8d4] whitespace-nowrap">→ Increment ₹</span>
                          <input
                            type="number"
                            value={rule.increment}
                            onChange={e => updateIncrementRule(idx, "increment", parseInt(e.target.value) || 0)}
                            className="w-28 bg-black/50 border border-[#d4af37]/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#d4af37] font-mono"
                          />
                        </div>
                      </div>
                      {!isLast && incrementRules.length > 1 && (
                        <button
                          onClick={() => removeIncrementRule(idx)}
                          className="text-red-400 hover:text-red-300 text-lg leading-none shrink-0"
                          title="Remove tier"
                        >×</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Preview */}
              <div className="mt-3 p-3 bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-xl">
                <p className="text-xs text-[#d4af37] font-semibold mb-1">📊 Preview</p>
                <p className="text-xs text-[#b0b8d4]">
                  {incrementRules.map((r, i) => {
                    const prev = i === 0 ? playerBasePrice : (incrementRules[i-1].upTo ?? 0);
                    return r.upTo
                      ? `₹${prev.toLocaleString()}–₹${r.upTo.toLocaleString()} → +₹${r.increment.toLocaleString()}`
                      : `₹${prev.toLocaleString()}+ → +₹${r.increment.toLocaleString()}`;
                  }).join("  |  ")}
                </p>
              </div>
            </div>

            <button onClick={() => setStep(2)} className="mt-6 bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded font-bold hover:bg-yellow-400">Next</button>
          </div>
        )}

        {/* Step 2: Team Configuration */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Team Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Men Slots per Team</label>
                <input type="number" value={menSlots || ""} onChange={e => setMenSlots(parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Women Slots per Team</label>
                <input type="number" value={womenSlots || ""} onChange={e => setWomenSlots(parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div>
                <label className="block text-sm text-[#b0b8d4] mb-1">Total Teams</label>
                <input type="number" value={teamCount || ""} onChange={e => setTeamCount(parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(1)} className="border border-white/20 text-white px-6 py-2 rounded hover:bg-white/10">Back</button>
              <button onClick={() => setStep(3)} className="bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded font-bold hover:bg-yellow-400">Set Number of Teams</button>
            </div>
          </div>
        )}

        {/* Step 3: Colors Palette */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Step 3: Team Colors Palette ({colors.length}/{teamCount})</h2>
            <p className="text-[#b0b8d4] text-sm">Pick any colour using the colour wheel. Colors will be assigned randomly to teams AFTER the auction.</p>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 p-4 bg-black/30 rounded-xl border border-white/10">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[#b0b8d4]">Pick Colour</label>
                <div className="relative">
                  <input 
                    type="color" 
                    value={pickerColor} 
                    onChange={e => setPickerColor(e.target.value)}
                    className="w-20 h-20 rounded-xl cursor-pointer border-4 border-white/20 bg-transparent"
                    style={{ padding: '2px' }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[#b0b8d4]">Preview</label>
                <div className="w-20 h-20 rounded-xl border-4 border-white/20 shadow-lg" style={{ backgroundColor: pickerColor }} />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-sm text-[#b0b8d4]">Hex Value</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={pickerColor}
                    onChange={e => setPickerColor(e.target.value)}
                    className="bg-black/50 border border-[#d4af37]/50 rounded-lg px-3 py-2 text-white w-32 font-mono"
                  />
                  <button 
                    onClick={() => addColor(pickerColor)}
                    disabled={colors.length >= teamCount}
                    className="bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Add Colour
                  </button>
                </div>
              </div>
            </div>

            {/* Quick palette suggestions */}
            <div>
              <p className="text-xs text-[#b0b8d4] mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {["#e63946","#f4a261","#2a9d8f","#e9c46a","#264653","#8338ec","#06d6a0","#fb8500","#023047","#ffb703","#219ebc","#dc2f02"].map(c => (
                  <button 
                    key={c}
                    onClick={() => setPickerColor(c)}
                    className="w-8 h-8 rounded-lg border-2 border-white/20 hover:scale-110 hover:border-white/60 transition-all"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Selected colours */}
            {colors.length > 0 && (
              <div>
                <p className="text-sm text-[#b0b8d4] mb-3">Selected colours ({colors.length}/{teamCount}):</p>
                <div className="flex flex-wrap gap-3">
                  {colors.map(c => (
                    <div key={c} className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-full border border-white/10 group">
                      <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                      <span className="text-sm font-mono">{c}</span>
                      <button onClick={() => removeColor(c)} className="text-[#ff3333] hover:text-red-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(2)} className="border border-white/20 text-white px-6 py-2 rounded hover:bg-white/10">Back</button>
              <button onClick={() => setStep(4)} className="bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded font-bold hover:bg-yellow-400">Save color palette</button>
            </div>
          </div>
        )}

        {/* Step 4: Add Teams */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Step 4: Add Teams ({teams.length}/{teamCount})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Team Name" value={currentTeamName} onChange={e => setCurrentTeamName(e.target.value)} className="bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
              <input type="text" placeholder="Captain Name" value={currentCaptain} onChange={e => setCurrentCaptain(e.target.value)} className="bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]" />
            </div>
            <button onClick={handleAddTeam} className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37] px-4 py-2 rounded hover:bg-[#d4af37]/40 w-full md:w-auto">Add Team</button>

            {teams.length > 0 && (
              <table className="w-full mt-4 text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2">Name</th>
                    <th className="py-2">Captain</th>
                    <th className="py-2">Color</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2">{t.name}</td>
                      <td className="py-2">{t.captain}</td>
                      <td className="py-2 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#4a5568]" /> 
                        <span className="text-sm text-[#b0b8d4]">Pending</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(3)} className="border border-white/20 text-white px-6 py-2 rounded hover:bg-white/10">Back</button>
              <button onClick={() => setStep(5)} className="bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded font-bold hover:bg-yellow-400">Next Step</button>
            </div>
          </div>
        )}

        {/* Step 5: Add Players */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Step 5: Add Players ({players.length} added)</h2>
            
            {/* Manual Add */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-[#b0b8d4] mb-3 uppercase tracking-wider">Add Manually</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Player Name"
                  value={currentPlayerName}
                  onChange={e => setCurrentPlayerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                  className="flex-1 min-w-[200px] bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]"
                />
                <select
                  value={currentPlayerGender}
                  onChange={e => setCurrentPlayerGender(e.target.value as "Men" | "Women")}
                  className="bg-black/50 border border-[#d4af37]/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d4af37]"
                >
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                </select>
                <button
                  onClick={handleAddPlayer}
                  className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37] px-5 py-2 rounded-lg hover:bg-[#d4af37]/40 font-semibold transition"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Excel / CSV Import */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <h3 className="text-sm font-bold text-[#b0b8d4] mb-1 uppercase tracking-wider">Import from Excel / CSV</h3>
              <p className="text-xs text-[#b0b8d4] mb-3">
                Upload an <code className="bg-white/10 px-1 rounded">.xlsx</code> or <code className="bg-white/10 px-1 rounded">.csv</code> file.
                Required columns: <code className="bg-white/10 px-1 rounded">Name</code> and <code className="bg-white/10 px-1 rounded">Gender</code> (Men / Women).
                Column headers are case-insensitive.
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const normaliseGender = (raw: string): 'Men' | 'Women' => {
                    const v = (raw || '').trim().toLowerCase();
                    if (v === 'women' || v === 'female' || v === 'f' || v === 'w') return 'Women';
                    return 'Men';
                  };

                  const processWorkbook = (wb: XLSX.WorkBook) => {
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
                    if (!rows.length) { toast.error('Sheet is empty'); return; }

                    // Find Name & Gender keys case-insensitively
                    const keys = Object.keys(rows[0]);
                    const nameKey = keys.find(k => k.trim().toLowerCase() === 'name');
                    const genderKey = keys.find(k => k.trim().toLowerCase() === 'gender');
                    if (!nameKey) { toast.error('No "Name" column found'); return; }

                    const imported = rows
                      .map(row => ({
                        name: String(row[nameKey] || '').trim(),
                        gender: normaliseGender(genderKey ? String(row[genderKey]) : ''),
                        photo: ''
                      }))
                      .filter(p => p.name);

                    setPlayers(prev => [...prev, ...imported]);
                    toast.success(`Imported ${imported.length} players!`);
                    e.target.value = '';
                  };

                  const reader = new FileReader();
                  if (file.name.endsWith('.csv')) {
                    reader.onload = ev => {
                      const wb = XLSX.read(ev.target?.result as string, { type: 'string' });
                      processWorkbook(wb);
                    };
                    reader.readAsText(file);
                  } else {
                    reader.onload = ev => {
                      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
                      processWorkbook(wb);
                    };
                    reader.readAsArrayBuffer(file);
                  }
                }}
                className="w-full bg-black/50 border border-dashed border-[#d4af37]/40 rounded-lg px-4 py-3 text-[#b0b8d4] cursor-pointer hover:border-[#d4af37]/70 transition file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#d4af37] file:text-black file:font-bold file:text-sm"
              />
            </div>

            {/* Player list */}
            {players.length > 0 && (
              <div className="max-h-64 overflow-y-auto border border-white/10 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[#0a0e27]">
                    <tr className="border-b border-white/10">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Gender</th>
                      <th className="py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 px-3 text-[#b0b8d4]">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold">{p.name}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.gender === 'Men' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'}`}>
                            {p.gender}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => setPlayers(players.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded border border-red-400/30 hover:bg-red-400/10 transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-4 mt-2">
              <button onClick={() => setStep(4)} className="border border-white/20 text-white px-6 py-2 rounded hover:bg-white/10">Back</button>
              <button onClick={() => setStep(6)} className="bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded font-bold hover:bg-yellow-400">Review ({players.length} players)</button>
            </div>
          </div>
        )}

        {/* Step 6: Review & Start */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Step 6: Review & Start</h2>
            
            <div className="bg-black/30 p-6 rounded-lg border border-white/10 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[#b0b8d4]">Tournament:</span> {name} ({year})</div>
                <div><span className="text-[#b0b8d4]">Budget:</span> ₹{budget}</div>
                <div><span className="text-[#b0b8d4]">Base Price:</span> ₹{playerBasePrice}</div>
                <div><span className="text-[#b0b8d4]">Teams:</span> {teams.length}/{teamCount}</div>
                <div><span className="text-[#b0b8d4]">Players:</span> {players.length}</div>
              </div>
              <div>
                <span className="text-[#b0b8d4] text-sm block mb-2">Palette:</span>
                <div className="flex gap-2">
                  {colors.map(c => <div key={c} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />)}
                </div>
              </div>
              <div className="text-[#d4af37] text-sm italic mt-4">
                Note: Colors will be assigned randomly to each team after the auction completes.
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(5)} disabled={loading} className="border border-white/20 text-white px-6 py-2 rounded hover:bg-white/10 disabled:opacity-50">Back</button>
              <button onClick={handleCreateTournament} disabled={loading} className="flex-1 bg-[#d4af37] text-[#0a0e27] px-6 py-2 rounded font-bold hover:bg-yellow-400 disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                {loading ? "Creating..." : "Start Auction"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
