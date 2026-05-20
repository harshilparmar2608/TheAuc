export interface IncrementRule {
  upTo: number | null;   // null = "above all previous thresholds (no upper limit)"
  increment: number;     // amount added to bid when this tier applies
}

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
  rtmCurrentTeamIndex: number;
}
