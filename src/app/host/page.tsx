"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, Team, Player, AuctionState, IncrementRule } from "@/types";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

function HostPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartConfirmPhrase, setRestartConfirmPhrase] = useState("");
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [editTab, setEditTab] = useState<"settings" | "teams" | "players" | "rules">("settings");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [editTournament, setEditTournament] = useState<any>({});
  const [editTeams, setEditTeams] = useState<Record<string, any>>({});
  const [editPlayers, setEditPlayers] = useState<Record<string, any>>({});
  const [editRules, setEditRules] = useState<IncrementRule[]>([]);

  // ── Helper: resolve which increment applies to the current bid ──
  const getIncrement = (bid: number, rules?: IncrementRule[]): number => {
    const r = rules ?? tournament?.incrementRules;
    if (!r || r.length === 0) return tournament?.basePrice || 1000;
    const sorted = [...r].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
    for (const rule of sorted) {
      if (rule.upTo === null || bid < rule.upTo) return rule.increment;
    }
    return sorted[sorted.length - 1].increment;
  };

  const { role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (role === "guest" || role === "none")) {
      router.push(`/`);
      return;
    }
    if (authLoading || role === "guest" || role === "none" || !tournamentId) return;

    const unsubscribe = onValue(ref(db, `tournaments/${tournamentId}`), (snap) => {
      const data = snap.val();
      if (data) {
        setTournament(data);
        if (data.teams) setTeams(data.teams);
        if (data.players) setPlayers(data.players);
        if (data.auction) setAuction(data.auction);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tournamentId, router, role, authLoading]);

  // Server-side timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (auction?.timerRunning && auction.timerSeconds > 0 && tournamentId) {
      interval = setInterval(() => {
        update(ref(db, `tournaments/${tournamentId}/auction`), {
          timerSeconds: Math.max(0, auction.timerSeconds - 1),
          timerRunning: auction.timerSeconds - 1 > 0,
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [auction?.timerRunning, auction?.timerSeconds, tournamentId]);

  if (authLoading || role === "guest" || role === "none") return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>;
  if (!tournament) return <div className="p-8 text-center text-white">Tournament not found</div>;

  const playerList = Object.values(players);
  // Sort ALL players by their shuffled order — do NOT filter by status.
  // Filtering caused the list to shrink as players were sold, making
  // currentPlayerIndex run past the end far too early.
  const allPlayersSorted = playerList
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  const currentPlayer = auction && auction.currentPlayerIndex < allPlayersSorted.length
    ? allPlayersSorted[auction.currentPlayerIndex]
    : null;
  const currentPlayerId = currentPlayer?.playerId;

  // --- AUCTION CONTROLS ---

  const handleStartAuction = async () => {
    if (!tournamentId) return;

    // Shuffle all available players by assigning a random sortOrder
    const availableNow = Object.values(players).filter(p => p.status === "available");
    const shuffled = [...availableNow].sort(() => Math.random() - 0.5);
    const shuffleUpdates: Record<string, unknown> = {};
    shuffled.forEach((p, idx) => {
      shuffleUpdates[`tournaments/${tournamentId}/players/${p.playerId}/sortOrder`] = idx;
    });
    await update(ref(db), shuffleUpdates);

    await update(ref(db, `tournaments/${tournamentId}`), { status: "running" });
    const startingBid = shuffled[0]?.basePrice || tournament.basePrice || 0;
    await update(ref(db, `tournaments/${tournamentId}/auction`), {
      status: "paused",
      currentPlayerIndex: 0,
      currentBid: startingBid,
      currentBiddingTeam: null,
      timerSeconds: 30,
      timerRunning: false,
    });
    toast.success("Auction started! Players shuffled randomly ");
  };

  const handleEndAuction = async () => {
    if (!tournamentId) return;
    await update(ref(db, `tournaments/${tournamentId}`), { status: "completed" });
    await update(ref(db, `tournaments/${tournamentId}/auction`), { status: "completed", timerRunning: false });
    toast.success("Auction ended!");
    const hasUnsold = Object.values(players).some(p => p.status === "unsold");
    router.push(hasUnsold ? `/unsold?tournament=${tournamentId}` : `/colors?tournament=${tournamentId}`);
  };

  const handleRestartAuction = async () => {
    if (!tournamentId) return;

    const updates: Record<string, unknown> = {};
    updates[`tournaments/${tournamentId}/status`] = "running";
    
    Object.values(players).forEach(p => {
      updates[`tournaments/${tournamentId}/players/${p.playerId}/status`] = "available";
      updates[`tournaments/${tournamentId}/players/${p.playerId}/soldTo`] = null;
      updates[`tournaments/${tournamentId}/players/${p.playerId}/soldPrice`] = 0;
      updates[`tournaments/${tournamentId}/players/${p.playerId}/currentBid`] = p.basePrice || tournament?.basePrice || 0;
      updates[`tournaments/${tournamentId}/players/${p.playerId}/currentBiddingTeam`] = null;
    });

    Object.values(teams).forEach(t => {
      updates[`tournaments/${tournamentId}/teams/${t.id}/remainingBudget`] = t.budget;
      updates[`tournaments/${tournamentId}/teams/${t.id}/menCount`] = 0;
      updates[`tournaments/${tournamentId}/teams/${t.id}/womenCount`] = 0;
    });

    updates[`tournaments/${tournamentId}/auction/status`] = "paused";
    updates[`tournaments/${tournamentId}/auction/currentPlayerIndex`] = 0;
    updates[`tournaments/${tournamentId}/auction/currentBid`] = tournament?.basePrice || 0;
    updates[`tournaments/${tournamentId}/auction/currentBiddingTeam`] = null;
    updates[`tournaments/${tournamentId}/auction/soldPlayers`] = [];
    updates[`tournaments/${tournamentId}/auction/unsoldPlayers`] = [];
    updates[`tournaments/${tournamentId}/auction/timerSeconds`] = 30;
    updates[`tournaments/${tournamentId}/auction/timerRunning`] = false;

    // Reshuffle players again
    const availableNow = Object.values(players);
    const shuffled = [...availableNow].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, idx) => {
      updates[`tournaments/${tournamentId}/players/${p.playerId}/sortOrder`] = idx;
    });

    await update(ref(db), updates);
    toast.success("Auction restarted! Players reshuffled randomly ");
    setShowRestartModal(false);
    setRestartConfirmPhrase("");
  };

  const saveTournamentSettings = async () => {
    if (!tournamentId) return;
    try {
      await update(ref(db, `tournaments/${tournamentId}`), {
        name: editTournament.name || tournament.name,
        year: editTournament.year || tournament.year,
        basePrice: editTournament.basePrice ?? tournament.basePrice,
        budget: editTournament.budget ?? tournament.budget,
      });
      toast.success("Settings saved!");
    } catch (e) { toast.error("Error saving settings"); }
  };

  const saveTeamSettings = async (teamId: string) => {
    if (!tournamentId) return;
    const t = editTeams[teamId];
    if (!t) return;
    try {
      await update(ref(db, `tournaments/${tournamentId}/teams/${teamId}`), {
        name: t.name,
        remainingBudget: t.remainingBudget,
      });
      toast.success("Team saved!");
    } catch (e) { toast.error("Error saving team"); }
  };

  const savePlayerSettings = async (playerId: string) => {
    if (!tournamentId) return;
    const p = editPlayers[playerId];
    if (!p) return;
    try {
      await update(ref(db, `tournaments/${tournamentId}/players/${playerId}`), {
        status: p.status,
        soldPrice: p.soldPrice,
        soldTo: p.status === 'sold' ? p.soldTo : null,
      });
      toast.success("Player saved!");
    } catch (e) { toast.error("Error saving player"); }
  };

  const openEditMode = () => {
    setEditTournament({
      name: tournament.name,
      year: tournament.year,
      basePrice: tournament.basePrice || 0,
      budget: tournament.budget || 0,
    });
    setEditRules(tournament.incrementRules ? [...tournament.incrementRules] : [
      { upTo: 20000, increment: 2000 },
      { upTo: null, increment: 3000 },
    ]);
    
    const tData: Record<string, any> = {};
    Object.values(teams).forEach(t => tData[t.id] = { name: t.name, remainingBudget: t.remainingBudget });
    setEditTeams(tData);

    const pData: Record<string, any> = {};
    Object.values(players).forEach(p => pData[p.playerId] = { status: p.status, soldPrice: p.soldPrice || 0, soldTo: p.soldTo || "" });
    setEditPlayers(pData);

    setShowEditMode(true);
  };

  const saveIncrementRules = async () => {
    if (!tournamentId) return;
    try {
      await update(ref(db, `tournaments/${tournamentId}`), { incrementRules: editRules });
      toast.success("Increment rules saved!");
    } catch { toast.error("Error saving rules"); }
  };

  const addEditRule = () => {
    setEditRules(prev => {
      const last = prev[prev.length - 1];
      const secondLast = prev[prev.length - 2];
      const newUpTo = secondLast?.upTo ? secondLast.upTo + 10000 : 30000;
      return [...prev.slice(0, -1), { upTo: newUpTo, increment: last?.increment ?? 1000 }, { upTo: null, increment: last?.increment ?? 1000 }];
    });
  };

  const removeEditRule = (idx: number) => {
    if (editRules.length <= 1) return;
    const next = [...editRules];
    next.splice(idx, 1);
    next[next.length - 1] = { ...next[next.length - 1], upTo: null };
    setEditRules(next);
  };

  const updateEditRule = (idx: number, field: keyof IncrementRule, value: number | null) => {
    const next = [...editRules];
    next[idx] = { ...next[idx], [field]: value };
    setEditRules(next);
  };

  // Set bid amount only (no team required)
  const setBidAmount = async (amount: number) => {
    if (!tournamentId || !auction) return;
    const newBid = Math.max(tournament.basePrice || 0, amount);
    await update(ref(db, `tournaments/${tournamentId}/auction`), {
      currentBid: newBid,
      currentBiddingTeam: null,
      status: "live",
    });
  };

  // Click a team = that team takes the current bid + auto-increment for next bidder
  const assignTeam = async (teamId: string) => {
    if (!tournamentId || !auction || !currentPlayer) return;
    const team = teams[teamId];

    // Determine new bid
    let newBid: number;
    if (!auction.currentBiddingTeam) {
      // First bidder — enter at base price
      newBid = currentPlayer.basePrice || tournament.basePrice || 0;
    } else {
      // Outbid — increment from current
      newBid = (auction.currentBid || 0) + getIncrement(auction.currentBid || 0);
    }

    if (team.remainingBudget < newBid) {
      toast.error(`${team.name} only has ₹${team.remainingBudget.toLocaleString()} — cannot afford ₹${newBid.toLocaleString()}!`);
      return;
    }
    const isMenPlayer = currentPlayer.gender === "Men";
    if (isMenPlayer && team.menCount >= tournament.menSlots) {
      toast.error(`${team.name} has reached max Men slots!`); return;
    }
    if (!isMenPlayer && team.womenCount >= tournament.womenSlots) {
      toast.error(`${team.name} has reached max Women slots!`); return;
    }

    await update(ref(db, `tournaments/${tournamentId}/auction`), {
      currentBid: newBid,
      currentBiddingTeam: teamId,
      status: "live",
    });
  };

  const handleSold = async () => {
    if (!auction || !currentPlayer || !currentPlayerId || !tournamentId) return;
    if (!auction.currentBiddingTeam) { toast.error("Select the bidding team first!"); return; }
    if (auction.currentBid <= 0) { toast.error("Bid must be greater than 0!"); return; }

    const soldPrice = auction.currentBid;
    const soldTeamId = auction.currentBiddingTeam;
    const team = teams[soldTeamId];
    if (!team) return;

    if (team.remainingBudget < soldPrice) {
      toast.error(`${team.name} only has ₹${team.remainingBudget.toLocaleString()} left!`);
      return;
    }

    const isMen = currentPlayer.gender === "Men";
    if (isMen && team.menCount >= tournament.menSlots) {
      toast.error(`${team.name} has reached max Men slots!`); return;
    }
    if (!isMen && team.womenCount >= tournament.womenSlots) {
      toast.error(`${team.name} has reached max Women slots!`); return;
    }

    // Compute updated counts for this team
    const newMenCount = isMen ? team.menCount + 1 : team.menCount;
    const newWomenCount = !isMen ? team.womenCount + 1 : team.womenCount;

    const updates: Record<string, unknown> = {};
    updates[`tournaments/${tournamentId}/players/${currentPlayerId}/status`] = "sold";
    updates[`tournaments/${tournamentId}/players/${currentPlayerId}/soldTo`] = soldTeamId;
    updates[`tournaments/${tournamentId}/players/${currentPlayerId}/soldPrice`] = soldPrice;
    updates[`tournaments/${tournamentId}/players/${currentPlayerId}/currentBid`] = soldPrice;
    updates[`tournaments/${tournamentId}/teams/${soldTeamId}/remainingBudget`] = team.remainingBudget - soldPrice;
    updates[`tournaments/${tournamentId}/teams/${soldTeamId}/${isMen ? "menCount" : "womenCount"}`] = isMen ? newMenCount : newWomenCount;
    const newSold = [...(auction.soldPlayers || []), currentPlayerId];
    const nextPlayer = allPlayersSorted[auction.currentPlayerIndex + 1];
    const nextBid = nextPlayer?.basePrice || tournament.basePrice || 0;

    updates[`tournaments/${tournamentId}/auction/soldPlayers`] = newSold;
    updates[`tournaments/${tournamentId}/auction/currentBid`] = nextBid;
    updates[`tournaments/${tournamentId}/auction/currentBiddingTeam`] = null;
    updates[`tournaments/${tournamentId}/auction/status`] = "paused";
    updates[`tournaments/${tournamentId}/auction/timerSeconds`] = 30;
    updates[`tournaments/${tournamentId}/auction/timerRunning`] = false;
    updates[`tournaments/${tournamentId}/auction/currentPlayerIndex`] = auction.currentPlayerIndex + 1;

    await update(ref(db), updates);
    toast.success(`${currentPlayer.name} SOLD to ${team.name} for ₹${soldPrice.toLocaleString()}!`);

    // ── Check if ALL teams now have full slots ──
    const allFull = Object.values(teams).every(t => {
      const m = t.id === soldTeamId ? newMenCount : t.menCount;
      const w = t.id === soldTeamId ? newWomenCount : t.womenCount;
      return m >= tournament.menSlots && w >= tournament.womenSlots;
    });

    if (allFull) {
      toast.success(" All teams complete! Ending auction...", { duration: 3000 });

      // Mark every remaining available player as unsold
      const remaining = Object.values(players).filter(
        p => p.status === "available" && p.playerId !== currentPlayerId
      );
      const endUpdates: Record<string, unknown> = {};
      const newUnsoldIds = [...(auction.unsoldPlayers || [])];
      remaining.forEach(p => {
        endUpdates[`tournaments/${tournamentId}/players/${p.playerId}/status`] = "unsold";
        newUnsoldIds.push(p.playerId);
      });
      endUpdates[`tournaments/${tournamentId}/auction/unsoldPlayers`] = newUnsoldIds;
      endUpdates[`tournaments/${tournamentId}/auction/status`] = "completed";
      endUpdates[`tournaments/${tournamentId}/auction/timerRunning`] = false;
      endUpdates[`tournaments/${tournamentId}/status`] = "completed";
      if (Object.keys(endUpdates).length > 0) await update(ref(db), endUpdates);

      setTimeout(() => {
        router.push(
          remaining.length > 0
            ? `/unsold?tournament=${tournamentId}`
            : `/colors?tournament=${tournamentId}`
        );
      }, 2500);
    }
  };


  const handleUnsold = async () => {
    if (!auction || !currentPlayer || !currentPlayerId || !tournamentId) return;
    const updates: Record<string, unknown> = {};
    updates[`tournaments/${tournamentId}/players/${currentPlayerId}/status`] = "unsold";
    const nextPlayer = allPlayersSorted[auction.currentPlayerIndex + 1];
    const nextBid = nextPlayer?.basePrice || tournament.basePrice || 0;

    const newUnsold = [...(auction.unsoldPlayers || []), currentPlayerId];
    updates[`tournaments/${tournamentId}/auction/unsoldPlayers`] = newUnsold;
    updates[`tournaments/${tournamentId}/auction/currentBid`] = nextBid;
    updates[`tournaments/${tournamentId}/auction/currentBiddingTeam`] = null;
    updates[`tournaments/${tournamentId}/auction/status`] = "paused";
    updates[`tournaments/${tournamentId}/auction/timerSeconds`] = 30;
    updates[`tournaments/${tournamentId}/auction/timerRunning`] = false;
    updates[`tournaments/${tournamentId}/auction/currentPlayerIndex`] = auction.currentPlayerIndex + 1;
    await update(ref(db), updates);
    toast(`${currentPlayer.name} marked Unsold.`);
  };

  const setTimer = (running: boolean, seconds?: number) => {
    if (!tournamentId) return;
    const d: Record<string, unknown> = { timerRunning: running };
    if (seconds !== undefined) d.timerSeconds = seconds;
    update(ref(db, `tournaments/${tournamentId}/auction`), d);
  };

  const teamList = Object.values(teams);
  const soldCount = (auction?.soldPlayers || []).length;
  const unsoldCount = (auction?.unsoldPlayers || []).length;

  // Not started yet
  if (!auction || tournament.status === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass rounded-2xl p-12 text-center max-w-lg w-full">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Image src="/logo.png" alt="GJPL" fill sizes="96px" className="object-contain" />
          </div>
          <h1 className="text-3xl font-black text-[#d4af37] mb-2">{tournament.name}</h1>
          <p className="text-[#b0b8d4] mb-8">{teamList.length} teams · {playerList.length} players</p>
          <button
            onClick={handleStartAuction}
            className="w-full bg-gradient-to-r from-[#d4af37] to-yellow-500 text-[#0a0e27] py-4 rounded-xl font-black text-xl shadow-[0_0_30px_rgba(212,175,55,0.5)] hover:shadow-[0_0_50px_rgba(212,175,55,0.8)] transition-all"
          >
            Begin Auction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-4 animate-fade-in">

      {/* LEFT COLUMN */}
      <div className="w-full lg:w-[58%] flex flex-col gap-4">

        {/* Header */}
        <div className="glass rounded-xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10"><Image src="/logo.png" alt="GJPL" fill sizes="40px" className="object-contain" /></div>
            <div>
              <div className="font-bold text-[#d4af37]">{tournament.name}</div>
              <div className="text-xs text-[#b0b8d4]">Sold: {soldCount} · Unsold: {unsoldCount} · Remaining: {allPlayersSorted.length - auction.currentPlayerIndex}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowEditPasswordModal(true)} 
              className="text-xs border border-blue-500/50 text-blue-400 px-3 py-1 rounded hover:bg-blue-500/10"
            >
              Edit Auction
            </button>
            <button 
              onClick={() => setShowRestartModal(true)} 
              className="text-xs border border-orange-500/50 text-orange-400 px-3 py-1 rounded hover:bg-orange-500/10"
            >
              Restart Auction
            </button>
            {!confirmEnd ? (
              <button onClick={() => setConfirmEnd(true)} className="text-xs border border-red-500/50 text-red-400 px-3 py-1 rounded hover:bg-red-500/10">End Auction</button>
            ) : (
              <>
                <button onClick={handleEndAuction} className="text-xs bg-red-600 text-white px-3 py-1 rounded font-bold">Confirm End</button>
                <button onClick={() => setConfirmEnd(false)} className="text-xs border border-white/20 text-white px-3 py-1 rounded">Cancel</button>
              </>
            )}
          </div>
        </div>

        {/* Gender pending stats */}
        {(() => {
          const pending = allPlayersSorted.slice(auction.currentPlayerIndex);
          const pendingMen = pending.filter(p => p.gender === "Men").length;
          const pendingWomen = pending.filter(p => p.gender === "Women").length;
          return (
            <div className="glass rounded-xl px-6 py-3 flex items-center justify-around gap-4 text-center">
              <div>
                <div className="text-xs text-[#b0b8d4] uppercase tracking-wider mb-1">Men Pending</div>
                <div className="text-2xl font-black text-blue-400">{pendingMen}</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-xs text-[#b0b8d4] uppercase tracking-wider mb-1">Women Pending</div>
                <div className="text-2xl font-black text-pink-400">{pendingWomen}</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-xs text-[#b0b8d4] uppercase tracking-wider mb-1">Total Left</div>
                <div className="text-2xl font-black text-[#d4af37]">{pendingMen + pendingWomen}</div>
              </div>
            </div>
          );
        })()}

        {/* Current Player */}
        <div className="glass rounded-xl p-6 flex gap-6 items-center">
          {currentPlayer ? (
            <>
              <div className="flex-1 min-w-0">
                <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${currentPlayer.gender === "Men" ? "bg-blue-500/20 text-blue-300" : "bg-pink-500/20 text-pink-300"}`}>
                  {currentPlayer.gender}
                </div>
                <h2 className="text-2xl font-black truncate">{currentPlayer.name}</h2>
                <div className="text-[#b0b8d4] text-sm">Player #{auction.currentPlayerIndex + 1} of {allPlayersSorted.length}</div>
              </div>
              {auction.status === "live" && (
                <div className="shrink-0 bg-[#ff3333] text-white px-3 py-1 rounded-full font-bold animate-pulse text-xs">LIVE</div>
              )}
            </>
          ) : (
            <div className="w-full text-center py-6 text-[#b0b8d4]">
              
              <div className="text-lg font-bold text-white mb-1">All players done!</div>
              <div className="text-sm text-[#b0b8d4] mb-5">
                {Object.values(players).some(p => p.status === "unsold")
                  ? "Auction complete. Unsold players will go to the Chit Round."
                  : "Auction complete. Proceed to assign team colors."}
              </div>
              <button
                onClick={handleEndAuction}
                className="bg-gradient-to-r from-[#d4af37] to-yellow-400 text-[#0a0e27] px-8 py-3 rounded-xl font-black text-lg shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:shadow-[0_0_40px_rgba(212,175,55,0.8)] transition-all"
              >
                {Object.values(players).some(p => p.status === "unsold") ? " Begin Chit Round" : "Assign Team Colors"}
              </button>
            </div>
          )}
        </div>

        {/* Bid Display & Auto-Increment */}
        <div className="glass rounded-xl p-6">
          <div className="text-center mb-4">
            <div className="text-5xl font-black text-[#d4af37] drop-shadow-[0_0_20px_rgba(212,175,55,0.6)] tracking-wider">
              ₹{(auction.currentBid || 0).toLocaleString()}
            </div>
            <div className="text-[#b0b8d4] mt-1">
              {auction.currentBiddingTeam
                ? <span className="text-green-400 font-semibold">▶ {teams[auction.currentBiddingTeam]?.name} is bidding</span>
                : <span>No team bidding yet — click a team to start</span>}
            </div>
            {auction.currentBiddingTeam && (
              <div className="mt-2 text-xs text-[#b0b8d4]">
                Next bid would be{" "}
                <span className="text-[#d4af37] font-bold">
                  ₹{((auction.currentBid || 0) + getIncrement(auction.currentBid || 0)).toLocaleString()}
                </span>
                {" "}(+₹{getIncrement(auction.currentBid || 0).toLocaleString()})
              </div>
            )}
          </div>

          {/* Increment Tier Info */}
          <div className="mt-3 p-3 bg-black/30 rounded-xl border border-white/10">
            <p className="text-[10px] text-[#b0b8d4] uppercase tracking-wider font-semibold mb-2">Active Increment Rules</p>
            <div className="flex flex-wrap gap-2">
              {(tournament.incrementRules ?? [{ upTo: null, increment: tournament.basePrice || 1000 }]).map((r, i, arr) => {
                const currentBid = auction.currentBid || 0;
                const isActive = r.upTo === null ? currentBid >= (arr[i-1]?.upTo ?? 0) : currentBid < r.upTo;
                return (
                  <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition ${
                    isActive
                      ? "bg-[#d4af37]/15 border-[#d4af37]/60 text-[#d4af37] font-bold"
                      : "bg-black/20 border-white/10 text-[#b0b8d4]"
                  }`}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] inline-block"/>}
                    {r.upTo ? `< ₹${r.upTo.toLocaleString()}` : `₹${(arr[i-1]?.upTo ?? 0).toLocaleString()}+`}
                    <span className="opacity-60">→</span>
                    +₹{r.increment.toLocaleString()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Team Cards — click to bid (auto-increments) */}
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#b0b8d4] mb-3 uppercase tracking-wider font-semibold">
            Click team to bid · Auto-increments by ₹{getIncrement(auction.currentBid || 0).toLocaleString()}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {teamList.map(team => {
              const isActive = auction.currentBiddingTeam === team.id;
              const nextBid = !auction.currentBiddingTeam
                ? (currentPlayer?.basePrice || tournament.basePrice || 0)
                : (auction.currentBid || 0) + getIncrement(auction.currentBid || 0);
              const canAfford = team.remainingBudget >= nextBid;
              const isMenPlayer = currentPlayer?.gender === "Men";
              const slotFull = currentPlayer
                ? (isMenPlayer ? team.menCount >= tournament.menSlots : team.womenCount >= tournament.womenSlots)
                : false;
              const isDisabled = !currentPlayer || !canAfford || slotFull;
              return (
                <button
                  key={team.id}
                  onClick={() => assignTeam(team.id)}
                  disabled={isDisabled}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? "border-[#d4af37] bg-[#d4af37]/15 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                      : slotFull
                      ? "border-red-500/30 bg-red-500/5 opacity-40 cursor-not-allowed"
                      : canAfford
                      ? "border-white/20 bg-black/30 hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5"
                      : "border-white/10 bg-black/20 opacity-40 cursor-not-allowed"
                  }`}
                >
                  {isActive && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#d4af37] animate-ping" />}
                  {slotFull && <div className="absolute top-2 right-2 text-[9px] text-red-400 font-bold">FULL</div>}
                  {!isActive && !slotFull && canAfford && (
                    <div className="absolute top-1.5 right-2 text-[9px] text-[#b0b8d4]">
                      ₹{nextBid.toLocaleString()}
                    </div>
                  )}
                  <div className="font-bold text-sm truncate mt-1 flex items-center gap-1">
                    <span>{team.name}</span>
                    {team.group && <span className="text-[9px] px-1 py-0.5 bg-white/10 rounded tracking-widest text-white/70">{team.group.replace("Group ", "")}</span>}
                  </div>
                  <div className="text-[#d4af37] font-mono text-xs mt-0.5">₹{team.remainingBudget.toLocaleString()}</div>
                  <div className="text-[#b0b8d4] text-[10px]">{team.menCount}M / {team.womenCount}W</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SOLD / UNSOLD / Timer */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleSold}
            disabled={!currentPlayer || !auction.currentBiddingTeam}
            className="col-span-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-lg shadow-[0_0_15px_rgba(22,163,74,0.4)] transition"
          >
            SOLD
          </button>
          <button
            onClick={handleUnsold}
            disabled={!currentPlayer}
            className="col-span-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-lg shadow-[0_0_15px_rgba(234,88,12,0.4)] transition"
          >
            UNSOLD
          </button>
          <div className="glass rounded-xl p-3 flex flex-col items-center justify-center">
            <div className="text-2xl font-mono font-bold">
              00:{(auction.timerSeconds || 0).toString().padStart(2, "0")}
            </div>
            <div className="flex gap-1 mt-1">
              <button onClick={() => setTimer(true)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded">▶</button>
              <button onClick={() => setTimer(false)} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-0.5 rounded">⏸</button>
              <button onClick={() => setTimer(false, 30)} className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded">↺</button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-full lg:w-[42%] flex flex-col gap-4">

        {/* Live Purse */}
        <div className="glass rounded-xl p-5 flex-1">
          <h3 className="text-lg font-bold text-[#d4af37] mb-3">Live Purse</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[#b0b8d4] border-b border-white/10">
                <th className="py-2">Team</th>
                <th className="py-2 text-right">Budget Left</th>
                <th className="py-2 text-center">M/W</th>
              </tr>
            </thead>
            <tbody>
              {teamList.map(t => (
                <tr key={t.id} className={`border-b border-white/5 transition-colors ${auction.currentBiddingTeam === t.id ? "bg-[#d4af37]/10" : ""}`}>
                  <td className="py-2 font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#4a5568]" />
                    {t.name}
                    {auction.currentBiddingTeam === t.id && <span className="text-[#d4af37] text-xs">●</span>}
                  </td>
                  <td className="py-2 text-right font-mono text-[#d4af37]">₹{t.remainingBudget.toLocaleString()}</td>
                  <td className="py-2 text-center text-xs text-[#b0b8d4]">{t.menCount}/{tournament.menSlots} | {t.womenCount}/{tournament.womenSlots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Up Next — hidden to keep order secret */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#b0b8d4] mb-3 uppercase tracking-wider">Up Next</h3>
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-[#4a5568]">
            
            <div className="text-sm font-semibold">Secret</div>
            <div className="text-xs text-center max-w-[180px]">Player order is randomised and hidden</div>
          </div>
        </div>

        {/* Recently Sold */}
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-bold text-[#b0b8d4] mb-3 uppercase tracking-wider">Recently Sold</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {[...(auction.soldPlayers || [])].reverse().slice(0, 8).map(pid => {
              const p = players[pid];
              if (!p) return null;
              return (
                <div key={pid} className="flex items-center justify-between bg-black/30 px-3 py-1.5 rounded-lg text-sm">
                  <span className="font-semibold truncate">{p.name}</span>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-[#d4af37] font-mono text-xs">₹{(p.soldPrice || 0).toLocaleString()}</div>
                    <div className="text-[#b0b8d4] text-[10px]">{p.soldTo ? teams[p.soldTo]?.name : ""}</div>
                  </div>
                </div>
              );
            })}
            {!(auction.soldPlayers?.length) && <div className="text-xs text-[#4a5568] italic text-center py-2">No players sold yet</div>}
          </div>
        </div>
      </div>

      {showRestartModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-xl p-8 max-w-md w-full border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
            <h2 className="text-2xl font-black text-orange-400 mb-2">Restart Auction?</h2>
            <p className="text-[#b0b8d4] text-sm mb-6">This will reset all bids, team budgets, and player statuses. Type "RESTART" to confirm.</p>
            <input 
              type="text" 
              placeholder="Type RESTART"
              value={restartConfirmPhrase}
              onChange={e => setRestartConfirmPhrase(e.target.value)}
              className="w-full bg-black/50 border border-orange-500/50 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-orange-400"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowRestartModal(false); setRestartConfirmPhrase(""); }}
                className="flex-1 border border-white/20 text-white py-3 rounded-lg font-bold hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (restartConfirmPhrase !== "RESTART") {
                    toast.error("Please type RESTART to confirm.");
                    return;
                  }
                  handleRestartAuction();
                }}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)] transition"
              >
                Confirm Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-xl p-8 max-w-md w-full border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <h2 className="text-2xl font-black text-blue-400 mb-2">Enter Edit Mode</h2>
            <p className="text-[#b0b8d4] text-sm mb-6">You are about to edit tournament data directly.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowEditPasswordModal(false)}
                className="flex-1 border border-white/20 text-white py-3 rounded-lg font-bold hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowEditPasswordModal(false);
                  openEditMode();
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] transition"
              >
                Enter Edit Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditMode && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-4 md:p-8 overflow-hidden animate-fade-in">
          <div className="glass rounded-2xl flex flex-col w-full max-w-5xl mx-auto h-full border border-[#d4af37]/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-black text-[#d4af37]">Edit Mode</h2>
              <button onClick={() => setShowEditMode(false)} className="text-[#b0b8d4] hover:text-white bg-white/5 px-4 py-2 rounded-lg font-bold">Close</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/20 px-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <button onClick={() => setEditTab("settings")} className={`px-6 py-4 font-bold border-b-2 transition ${editTab === "settings" ? "border-[#d4af37] text-[#d4af37]" : "border-transparent text-[#b0b8d4] hover:text-white"}`}>Tournament Settings</button>
              <button onClick={() => setEditTab("teams")} className={`px-6 py-4 font-bold border-b-2 transition ${editTab === "teams" ? "border-[#d4af37] text-[#d4af37]" : "border-transparent text-[#b0b8d4] hover:text-white"}`}>Teams</button>
              <button onClick={() => setEditTab("players")} className={`px-6 py-4 font-bold border-b-2 transition ${editTab === "players" ? "border-[#d4af37] text-[#d4af37]" : "border-transparent text-[#b0b8d4] hover:text-white"}`}>Players</button>
              <button onClick={() => setEditTab("rules")} className={`px-6 py-4 font-bold border-b-2 transition ${editTab === "rules" ? "border-[#d4af37] text-[#d4af37]" : "border-transparent text-[#b0b8d4] hover:text-white"}`}>Bid Rules</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              
              {editTab === "settings" && (
                <div className="max-w-xl mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-[#b0b8d4] mb-2">Tournament Name</label>
                    <input type="text" value={editTournament.name || ""} onChange={e => setEditTournament({...editTournament, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[#b0b8d4] mb-2">Year</label>
                      <input type="number" value={editTournament.year || ""} onChange={e => setEditTournament({...editTournament, year: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#b0b8d4] mb-2">Base Price (₹)</label>
                      <input type="number" value={editTournament.basePrice || ""} onChange={e => setEditTournament({...editTournament, basePrice: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#b0b8d4] mb-2">Default Team Budget (₹)</label>
                    <input type="number" value={editTournament.budget || ""} onChange={e => setEditTournament({...editTournament, budget: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none" />
                  </div>
                  <button onClick={saveTournamentSettings} className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-lg hover:bg-yellow-400 shadow-[0_0_15px_rgba(212,175,55,0.3)]">Save Settings</button>
                </div>
              )}

              {editTab === "teams" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(teams).map(t => (
                    <div key={t.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-[#b0b8d4]">Team Name</label>
                        <input type="text" value={editTeams[t.id]?.name || ""} onChange={e => setEditTeams({...editTeams, [t.id]: {...editTeams[t.id], name: e.target.value}})} className="w-full bg-black/60 border border-white/10 rounded p-2 text-sm text-white focus:border-[#d4af37] outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-[#b0b8d4]">Remaining Budget (₹)</label>
                        <input type="number" value={editTeams[t.id]?.remainingBudget || 0} onChange={e => setEditTeams({...editTeams, [t.id]: {...editTeams[t.id], remainingBudget: parseInt(e.target.value) || 0}})} className="w-full bg-black/60 border border-white/10 rounded p-2 text-sm text-white focus:border-[#d4af37] outline-none font-mono" />
                      </div>
                      <button onClick={() => saveTeamSettings(t.id)} className="w-full bg-white/10 text-white font-bold py-2 rounded text-sm hover:bg-[#d4af37] hover:text-black transition">Save Team</button>
                    </div>
                  ))}
                </div>
              )}

              {editTab === "players" && (
                <div className="flex flex-col h-full gap-4">
                  <input 
                    type="text" 
                    placeholder="Search players by name..." 
                    value={searchPlayer}
                    onChange={e => setSearchPlayer(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-lg p-3 text-white focus:border-[#d4af37] outline-none shrink-0"
                  />
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {Object.values(players)
                      .filter(p => p.name.toLowerCase().includes(searchPlayer.toLowerCase()))
                      .map(p => (
                      <div key={p.playerId} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex-1 min-w-0 w-full text-center md:text-left">
                          <div className="font-bold truncate">{p.name}</div>
                          <div className="text-xs text-[#b0b8d4]">{p.gender}</div>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 items-end justify-center w-full md:w-auto">
                          <div className="w-[100px]">
                            <label className="text-[10px] text-[#b0b8d4]">Status</label>
                            <select 
                              value={editPlayers[p.playerId]?.status || "available"} 
                              onChange={e => setEditPlayers({...editPlayers, [p.playerId]: {...editPlayers[p.playerId], status: e.target.value}})}
                              className="w-full bg-black/60 border border-white/10 rounded p-1.5 text-xs text-white outline-none"
                            >
                              <option value="available">Available</option>
                              <option value="sold">Sold</option>
                              <option value="unsold">Unsold</option>
                            </select>
                          </div>

                          {editPlayers[p.playerId]?.status === "sold" && (
                            <>
                              <div className="w-[120px]">
                                <label className="text-[10px] text-[#b0b8d4]">Sold To</label>
                                <select 
                                  value={editPlayers[p.playerId]?.soldTo || ""} 
                                  onChange={e => setEditPlayers({...editPlayers, [p.playerId]: {...editPlayers[p.playerId], soldTo: e.target.value}})}
                                  className="w-full bg-black/60 border border-white/10 rounded p-1.5 text-xs text-white outline-none"
                                >
                                  <option value="">Select Team</option>
                                  {Object.values(teams).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                              </div>
                              <div className="w-[100px]">
                                <label className="text-[10px] text-[#b0b8d4]">Price (₹)</label>
                                <input 
                                  type="number" 
                                  value={editPlayers[p.playerId]?.soldPrice || 0} 
                                  onChange={e => setEditPlayers({...editPlayers, [p.playerId]: {...editPlayers[p.playerId], soldPrice: parseInt(e.target.value) || 0}})}
                                  className="w-full bg-black/60 border border-white/10 rounded p-1.5 text-xs text-white outline-none font-mono"
                                />
                              </div>
                            </>
                          )}
                          
                          <button onClick={() => savePlayerSettings(p.playerId)} className="bg-white/10 text-white font-bold px-4 py-1.5 rounded text-xs hover:bg-[#d4af37] hover:text-black transition">Save</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {editTab === "rules" && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">Bid Increment Rules</h3>
                      <p className="text-xs text-[#b0b8d4] mt-1">Each click on a team button raises the bid by the matching tier's increment.</p>
                    </div>
                    <button onClick={addEditRule} className="text-xs bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] px-3 py-1.5 rounded-lg hover:bg-[#d4af37]/30 font-bold">+ Add Tier</button>
                  </div>

                  <div className="space-y-2">
                    {editRules.map((rule, idx) => {
                      const isLast = idx === editRules.length - 1;
                      return (
                        <div key={idx} className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                          <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-xs font-bold text-[#d4af37] shrink-0">{idx+1}</div>
                          <div className="flex flex-wrap gap-3 flex-1 items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#b0b8d4] whitespace-nowrap">Bid below ₹</span>
                              {isLast ? (
                                <span className="text-sm font-bold text-[#d4af37] w-28 text-center">∞ (no limit)</span>
                              ) : (
                                <input type="number" value={rule.upTo ?? ""}
                                  onChange={e => updateEditRule(idx, "upTo", parseInt(e.target.value) || 0)}
                                  className="w-28 bg-black/50 border border-[#d4af37]/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#d4af37] font-mono" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#b0b8d4] whitespace-nowrap">→ Increment ₹</span>
                              <input type="number" value={rule.increment}
                                onChange={e => updateEditRule(idx, "increment", parseInt(e.target.value) || 0)}
                                className="w-28 bg-black/50 border border-[#d4af37]/40 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#d4af37] font-mono" />
                            </div>
                          </div>
                          {!isLast && editRules.length > 1 && (
                            <button onClick={() => removeEditRule(idx)} className="text-red-400 hover:text-red-300 text-lg leading-none shrink-0">×</button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-xl">
                    <p className="text-xs text-[#d4af37] font-semibold mb-1">Current Preview</p>
                    <p className="text-xs text-[#b0b8d4]">
                      {editRules.map((r, i) => {
                        const prev = i === 0 ? (tournament?.basePrice || 0) : (editRules[i-1].upTo ?? 0);
                        return r.upTo
                          ? `₹${prev.toLocaleString()}–₹${r.upTo.toLocaleString()} → +₹${r.increment.toLocaleString()}`
                          : `₹${prev.toLocaleString()}+ → +₹${r.increment.toLocaleString()}`;
                      }).join("  |  ")}
                    </p>
                  </div>

                  <button onClick={saveIncrementRules} className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-lg hover:bg-yellow-400 shadow-[0_0_15px_rgba(212,175,55,0.3)]">Save Increment Rules</button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function HostPanel() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" /></div>}>
      <HostPanelContent />
    </Suspense>
  );
}
