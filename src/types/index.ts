export interface IncrementRule {
  upTo: number | null;   // null = "above all previous thresholds (no upper limit)"
  increment: number;     // amount added to bid when this tier applies
}

export type Role = "super-admin" | "admin" | "guest" | "none";

export type AdminUser = {
  id: string;
  username: string;
  password?: string; // used when updating/setting; don't return to client unless checking
  role: "super-admin" | "admin";
  createdAt: number;
};

export interface Tournament {
  id: string;
  name: string;
  year: number;
  status: "setup" | "running" | "completed";
  budget: number;
  menSlots: number;
  womenSlots: number;
  logo: string;
  colors?: string[];
  colorAssignmentStatus: "pending" | "assigned";
  groupCount?: number;
  basePrice: number;
  incrementRules?: IncrementRule[];   // tiered bid increment config
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  name: string;
  captain: string;
  color: string | null;
  group?: string;
  budget: number;
  remainingBudget: number;
  menCount: number;
  womenCount: number;
}

export interface Player {
  playerId: string;
  name: string;
  photo: string;
  gender: "Men" | "Women";
  basePrice: number;
  status: "available" | "sold" | "unsold" | "rtm";
  currentBid: number;
  currentBiddingTeam: string | null;
  soldTo: string | null;
  soldPrice: number;
  sortOrder?: number;
}

export interface AuctionState {
  status: "not_started" | "live" | "paused" | "completed";
  currentPlayerIndex: number;
  currentBid: number;
  currentBiddingTeam: string | null;
  timerSeconds: number;
  timerRunning: boolean;
  soldPlayers: string[];
  unsoldPlayers: string[];
  rtmStatus: "not_started" | "live" | "completed";
}

// --- Portal Data Models ---

export interface SeasonTopPlayer {
  name: string;
  value: number; // runs or wickets
  matches: number;
}

export interface Season {
  id: string; // e.g., "gjpl_1"
  year: number;
  name: string; // e.g., "GJPL 1"
  winner: string;
  winnerCaptain?: string;
  runnerUp: string;
  runnerUpCaptain?: string;
  manOfTheTournament: string;
  topScorer: SeasonTopPlayer;
  topWicketTaker: SeasonTopPlayer;
  mvpWomen: string;
  bestBowler: string;
  totalMatches: number;
  status: "completed" | "live" | "upcoming";
}

// Will be expanded in future phases for ball-by-ball
export interface Match {
  id: string;
  seasonId: string;
  team1: string;
  team2: string;
  date: number; // timestamp
  venue: string;
  result: {
    winner: string;
    margin: number;
    marginType: "runs" | "wickets";
  };
  toss: {
    winner: string;
    decision: "bat" | "field";
  };
  awards: {
    mom: string;
    wow: string;
  };
  status: "upcoming" | "live" | "completed";
}
