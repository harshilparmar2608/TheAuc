"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trophy, Target, Image as ImageIcon, LogOut, ShieldAlert, User, Key, Swords, Sparkles, Zap } from "lucide-react";
import { ref, onValue, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament, AdminUser } from "@/types";
import { useAuth } from "@/hooks/useAuth";

/* ─── tiny hook: is element in viewport? ─── */
function useInView(threshold = 0.15) {
  const domRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = domRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { domRef, visible };
}

/* ─── Animated section wrapper ─── */
function RevealSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { domRef, visible } = useInView();
  return (
    <div
      ref={domRef}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Floating cricket ball particle ─── */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 6, height: 6,
        background: "radial-gradient(circle, #d4af37 0%, #a07c10 100%)",
        boxShadow: "0 0 8px 2px rgba(212,175,55,0.5)",
        ...style,
      }}
    />
  );
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /* intro animation */
  const [introPhase, setIntroPhase] = useState<"logo" | "tagline" | "done">("logo");
  const [showIntro, setShowIntro] = useState(true);

  const { role, username, login, logout, loading: authLoading } = useAuth();
  
  /* modal state */
  const [modal, setModal] = useState<null | { action: "host" | "live"; tournament: Tournament } | "gatekeeper-login">(null);
  const [loginUser, setLoginUser] = useState("");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwShake, setPwShake] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Password change state
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);

  /* particles */
  const particles = Array.from({ length: 18 }, (_, i) => i);

  /* fetch tournaments */
  useEffect(() => {
    const tournamentsRef = ref(db, "tournaments");
    const unsubscribe = onValue(tournamentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        parsed.sort((a, b) => b.createdAt - a.createdAt);
        setTournaments(parsed);
      } else {
        setTournaments([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /* intro sequence */
  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase("tagline"), 1200);
    const t2 = setTimeout(() => setIntroPhase("done"), 3200);
    const t3 = setTimeout(() => setShowIntro(false), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* handle action button click */
  const handleAction = (action: "host" | "live", t: Tournament) => {
    if (action === "live") {
      router.push(`/live?tournament=${t.id}`);
    } else if (action === "host") {
      router.push(`/host?tournament=${t.id}`);
    }
  };

  const handlePasswordSubmit = async () => {
    setIsLoggingIn(true);
    setPwError(false);
    try {
      const masterUser = "Harshil2205";
      const masterPass = "8347572608";
      
      if (loginUser === masterUser && password === masterPass) {
        login("super-admin", loginUser);
        setModal(null);
        setIsLoggingIn(false);
        return;
      }
      
      const adminsRef = ref(db, "admins");
      const snapshot = await get(adminsRef);
      if (snapshot.exists()) {
        const adminsData = snapshot.val();
        const found = Object.values(adminsData).find(
          (a: any) => a.username === loginUser && a.password === password
        ) as AdminUser | undefined;
        
        if (found) {
          login(found.role, found.username);
          setModal(null);
          setIsLoggingIn(false);
          return;
        }
      }
      
      setPwError(true);
      setPwShake(true);
      setTimeout(() => setPwShake(false), 500);
    } catch (e) {
      console.error(e);
      setPwError(true);
    }
    setIsLoggingIn(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordValue || newPasswordValue.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }
    
    setIsChangingPw(true);
    try {
      const adminsRef = ref(db, "admins");
      const snapshot = await get(adminsRef);
      if (snapshot.exists()) {
        const adminsData = snapshot.val();
        const adminEntry = Object.entries(adminsData).find(
          ([_, a]: [string, any]) => a.username === username
        );
        
        if (adminEntry) {
          const [id] = adminEntry;
          await update(ref(db, `admins/${id}`), { password: newPasswordValue });
          toast.success("Password changed successfully!");
          setModal(null);
          setNewPasswordValue("");
        } else {
          toast.error("User not found in database.");
        }
      }
    } catch (e) {
      toast.error("Failed to change password.");
    }
    setIsChangingPw(false);
  };

  return (
    <>
      {/* ══════════════ INTRO SCREEN ══════════════ */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "radial-gradient(ellipse at 50% 40%, #0f1535 0%, #0a0e27 70%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: showIntro ? "all" : "none",
          opacity: showIntro ? (introPhase === "done" ? 0 : 1) : 0,
          transition: "opacity 1s ease",
        }}
      >
        {/* particle ring */}
        {particles.map((i) => (
          <Particle
            key={i}
            style={{
              top: `${50 + 38 * Math.sin((i / particles.length) * 2 * Math.PI)}%`,
              left: `${50 + 20 * Math.cos((i / particles.length) * 2 * Math.PI)}%`,
              opacity: introPhase === "logo" ? 0 : 1,
              transform: introPhase === "logo" ? "scale(0)" : "scale(1)",
              transition: `opacity 0.6s ease ${i * 40}ms, transform 0.6s ease ${i * 40}ms`,
            }}
          />
        ))}

        {/* logo */}
        <div style={{
          position: "relative", width: 160, height: 160,
          opacity: 1,
          transform: introPhase === "logo" ? "scale(0.4) rotate(-15deg)" : "scale(1) rotate(0deg)",
          transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: "drop-shadow(0 0 40px rgba(212,175,55,0.7))",
        }}>
          <Image src="/logo.png" alt="GJPL" fill sizes="160px" className="object-contain" priority />
        </div>

        {/* title */}
        <div style={{
          marginTop: 32, textAlign: "center",
          opacity: introPhase === "logo" ? 0 : 1,
          transform: introPhase === "logo" ? "translateY(20px)" : "translateY(0)",
          transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
        }}>
          <div style={{
            fontSize: "clamp(2rem, 6vw, 4rem)", fontWeight: 900, letterSpacing: "0.15em",
            background: "linear-gradient(135deg, #d4af37 0%, #fff8dc 50%, #d4af37 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            GJPL
          </div>
          <div style={{
            fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)", color: "#b0b8d4",
            letterSpacing: "0.3em", textTransform: "uppercase", marginTop: 4,
          }}>
            Ganga Jamna Premier League
          </div>
          <div style={{
            marginTop: 20,
            opacity: introPhase === "tagline" || introPhase === "done" ? 1 : 0,
            transform: introPhase === "tagline" || introPhase === "done" ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s",
            fontSize: "clamp(0.8rem, 2vw, 1rem)", color: "#d4af37",
            fontStyle: "italic", letterSpacing: "0.05em",
          }}>
            The Most Awaited Event of the Year
          </div>
        </div>

        {/* tap to skip */}
        <button
          onClick={() => setShowIntro(false)}
          style={{
            position: "absolute", bottom: 32, right: 32,
            fontSize: "0.75rem", color: "#4a5568", background: "none", border: "none",
            cursor: "pointer", letterSpacing: "0.1em",
            opacity: introPhase !== "logo" ? 1 : 0, transition: "opacity 0.5s ease",
          }}
        >
          skip intro ›
        </button>
      </div>

      {authLoading ? (
        <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d4af37]" />
        </div>
      ) : role === "none" ? (
        /* ══════════════ GATEKEEPER ══════════════ */
        <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f1535 0%, #0a0e27 60%)" }}>
          
          <div className="z-10 text-center mb-12">
            <div className="relative w-32 h-32 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]">
              <Image src="/logo.png" alt="GJPL" fill className="object-contain" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-yellow-200 tracking-widest uppercase">
              Welcome to GJPL
            </h1>
            <p className="text-[#b0b8d4] mt-3 tracking-widest uppercase text-sm">Choose how you want to enter</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-10">
            {/* Guest Button */}
            <button 
              onClick={() => login("guest")}
              className="group relative overflow-hidden glass p-8 rounded-2xl border border-white/10 hover:border-[#d4af37]/50 transition-all duration-300 text-left hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <h2 className="text-2xl font-bold text-white mb-2">Continue as Guest</h2>
              <p className="text-[#b0b8d4] text-sm leading-relaxed">
                View the Hall of Fame, browse the gallery, and watch live auctions in real-time. No login required.
              </p>
            </button>

            {/* Admin Button */}
            <button 
              onClick={() => { setModal("gatekeeper-login"); setLoginUser(""); setPassword(""); setPwError(false); }}
              className="group relative overflow-hidden glass p-8 rounded-2xl border border-white/10 hover:border-[#d4af37]/50 transition-all duration-300 text-left hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[#d4af37] mb-4"><ShieldAlert size={36} /></div>
              <h2 className="text-2xl font-bold text-white mb-2">Login as Admin</h2>
              <p className="text-[#b0b8d4] text-sm leading-relaxed">
                Host auctions, setup tournaments, and manage gallery photos. Requires authorized credentials.
              </p>
            </button>
          </div>
        </main>
      ) : (
        /* ══════════════ MAIN PAGE ══════════════ */
        <main className="min-h-screen overflow-x-hidden relative" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f1535 0%, #0a0e27 60%)" }}>
          
          {/* TOP NAV / LOGOUT */}
          <div className="absolute top-6 right-6 z-50 flex items-center gap-4 bg-black/30 backdrop-blur px-4 py-2 rounded-full border border-white/10">
            {role !== "guest" && (
              <>
                <span className="text-[#d4af37] text-sm font-bold tracking-wider">
                  Admin: {username}
                </span>
                {role === "admin" && (
                  <button onClick={() => setModal("change-password")} className="flex items-center gap-2 text-[#b0b8d4] hover:text-[#d4af37] transition-colors text-sm font-semibold ml-2 border-l border-white/20 pl-4">
                    <Key size={16} /> Change Password
                  </button>
                )}
              </>
            )}
            <button onClick={logout} className="flex items-center gap-2 text-[#b0b8d4] hover:text-white transition-colors text-sm font-semibold">
              <LogOut size={16} /> Logout
            </button>
          </div>

          {/* ── HERO SECTION ── */}
        <section style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden", padding: "80px 24px 40px",
        }}>
          {/* Background glow orbs */}
          <div style={{
            position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
            width: 600, height: 400,
            background: "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "10%", left: "10%",
            width: 300, height: 300,
            background: "radial-gradient(ellipse, rgba(255,51,51,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "20%", right: "8%",
            width: 250, height: 250,
            background: "radial-gradient(ellipse, rgba(99,179,237,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Animated cricket stumps decoration */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
            background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)",
          }} />

          {/* Logo */}
          <div style={{
            position: "relative", width: 180, height: 180,
            filter: "drop-shadow(0 0 50px rgba(212,175,55,0.5))",
            animation: "float 4s ease-in-out infinite",
          }}>
            <Image src="/logo.png" alt="GJPL" fill sizes="180px" className="object-contain" priority />
          </div>

          {/* Hero text */}
          <div style={{ textAlign: "center", marginTop: 28, maxWidth: 700 }}>
            <div style={{
              fontSize: "clamp(3rem, 10vw, 6rem)", fontWeight: 900, lineHeight: 1,
              letterSpacing: "0.12em",
              background: "linear-gradient(135deg, #d4af37 0%, #fff8dc 45%, #c9992a 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(212,175,55,0.4))",
            }}>
              GJPL
            </div>
            <div style={{
              fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)", color: "#b0b8d4",
              letterSpacing: "0.35em", textTransform: "uppercase", marginTop: 6,
              fontWeight: 600,
            }}>
              Ganga Jamna Premier League
            </div>

            {/* Tagline */}
            <div style={{
              marginTop: 24, padding: "12px 28px",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: 40,
              background: "rgba(212,175,55,0.06)",
              backdropFilter: "blur(10px)",
              display: "inline-block",
            }}>
              <span style={{ color: "#d4af37", fontStyle: "italic", fontSize: "clamp(0.85rem, 2vw, 1.05rem)" }}>
                The Most Awaited Cricket Event of the Year
              </span>
            </div>

            {/* Stats row */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 32, marginTop: 40,
              flexWrap: "wrap",
            }}>
              {([
                { Icon: Swords, label: "Fierce Rivalries", val: "Legendary" },
                { Icon: Sparkles, label: "Unforgettable Moments", val: "Every Season" },
                { Icon: Zap, label: "Chaos & Celebrations", val: "Non-Stop" },
              ] as const).map((s) => (
                <div key={s.label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <s.Icon size={28} strokeWidth={1.5} color="#d4af37" />
                  <div style={{ fontWeight: 800, color: "#d4af37", fontSize: "1.1rem" }}>{s.val}</div>
                  <div style={{ color: "#b0b8d4", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Scroll hint */}
            <div style={{ marginTop: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#4a5568", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>Scroll to explore</span>
              <div style={{ animation: "bounce 2s ease-in-out infinite" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 12l6 6 6-6" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ── PORTAL LINKS ── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 20px" }}>
          <RevealSection delay={0}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d4af37", marginBottom: 8 }}>
                Explore GJPL
              </h2>
              <p style={{ color: "#b0b8d4", fontSize: "0.9rem" }}>
                Dive into the history, live action, and memories.
              </p>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16
            }}>
              <Link href="/hall-of-fame" className="group" style={{ textDecoration: "none" }}>
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 12, padding: "20px", textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.1)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.5)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.2)";
                  }}
                >
                  <div className="flex justify-center mb-4 text-[#d4af37]"><Trophy size={36} strokeWidth={1.5} /></div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>Hall of Fame</div>
                  <div style={{ color: "#b0b8d4", fontSize: "0.8rem", marginTop: 4 }}>Past Winners & Stats</div>
                </div>
              </Link>


              <Link href="/gallery" className="group" style={{ textDecoration: "none" }}>
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 12, padding: "20px", textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.1)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.5)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.2)";
                  }}
                >
                  <div className="flex justify-center mb-4 text-[#d4af37]"><ImageIcon size={36} strokeWidth={1.5} /></div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>Gallery</div>
                  <div style={{ color: "#b0b8d4", fontSize: "0.8rem", marginTop: 4 }}>Memories & Photos</div>
                </div>
              </Link>
            </div>
          </RevealSection>
        </section>

        {/* ── DIVIDER ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 700, margin: "0 auto", padding: "0 24px", opacity: 0.5 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4))" }} />
          <div className="text-[#d4af37]"><Trophy size={16} strokeWidth={2} /></div>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(212,175,55,0.4), transparent)" }} />
        </div>

        {/* ── TOURNAMENTS SECTION ── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 100px" }}>
          <RevealSection delay={0}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{
                display: "inline-block",
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 8, padding: "4px 16px", fontSize: "0.75rem",
                color: "#d4af37", letterSpacing: "0.2em", textTransform: "uppercase",
                marginBottom: 12,
              }}>
                Select Your Tournament
              </div>
              <h2 style={{
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 900, color: "#fff",
                margin: 0, lineHeight: 1.2,
              }}>
                Choose & Enter
              </h2>
              <p style={{ color: "#b0b8d4", marginTop: 10, fontSize: "0.95rem" }}>
                Are you a Host or here to watch the live auction?
              </p>
            </div>
          </RevealSection>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "3px solid rgba(212,175,55,0.2)",
                borderTop: "3px solid #d4af37",
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
          ) : tournaments.length === 0 ? (
            <RevealSection delay={0}>
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 20, padding: "60px 24px", textAlign: "center",
              }}>
                
                <div style={{ color: "#b0b8d4", fontSize: "1.1rem", marginBottom: 8 }}>No tournaments yet.</div>
                <div style={{ color: "#4a5568", fontSize: "0.875rem" }}>Ask the admin to set up a tournament.</div>
              </div>
            </RevealSection>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {tournaments.map((t, idx) => (
                <RevealSection key={t.id} delay={idx * 80}>
                  <TournamentCard tournament={t} onAction={handleAction} role={role} />
                </RevealSection>
              ))}
            </div>
          )}
        </section>

          {/* ── FOOTER ── */}
          <div style={{
            borderTop: "1px solid rgba(212,175,55,0.15)", padding: "24px",
            textAlign: "center", color: "#4a5568", fontSize: "0.8rem",
          }}>
            <span style={{ color: "#d4af37", fontWeight: 700 }}>GJPL</span> · Ganga Jamna Premier League · Built with ❤️
            {(role === "super-admin" || role === "admin") && (
              <div className="mt-4">
                <Link href="/admin/portal" className="text-[#d4af37] hover:underline uppercase tracking-wider font-bold text-xs">
                  Access Admin Portal
                </Link>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ══════════════ LOGIN MODAL ══════════════ */}
      {modal === "gatekeeper-login" && (
        <div
          id="host-modal-overlay"
          onClick={(e) => { if ((e.target as HTMLElement).id === "host-modal-overlay") { setModal(null); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{
            background: "linear-gradient(135deg, #0f1535 0%, #0a0e27 100%)",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 20, padding: "40px 32px", maxWidth: 420, width: "100%",
            boxShadow: "0 0 60px rgba(212,175,55,0.15)",
            animation: `${pwShake ? "shake" : "slideUp"} 0.4s ease`,
          }}>
            {/* lock icon */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(212,175,55,0.1)", border: "2px solid rgba(212,175,55,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", color: "#d4af37"
              }}><User size={32} /></div>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: "1.5rem", color: "#d4af37" }}>
                Admin Login
              </h2>
            </div>

            {/* username input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Username"
                value={loginUser}
                onChange={(e) => { setLoginUser(e.target.value); setPwError(false); }}
                style={{
                  width: "100%", padding: "14px 18px",
                  background: "rgba(0,0,0,0.5)",
                  border: `1.5px solid ${pwError ? "#ff3333" : "rgba(212,175,55,0.4)"}`,
                  borderRadius: 10, color: "#fff", fontSize: "1rem",
                  outline: "none", letterSpacing: "0.05em",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* password input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
                style={{
                  width: "100%", padding: "14px 18px",
                  background: "rgba(0,0,0,0.5)",
                  border: `1.5px solid ${pwError ? "#ff3333" : "rgba(212,175,55,0.4)"}`,
                  borderRadius: 10, color: "#fff", fontSize: "1rem",
                  outline: "none", letterSpacing: "0.1em",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {pwError && (
              <div style={{ color: "#ff3333", fontSize: "0.8rem", marginBottom: 12, textAlign: "center" }}>
                Incorrect username or password.
              </div>
            )}

            <button
              onClick={handlePasswordSubmit}
              disabled={isLoggingIn}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #d4af37 0%, #c9992a 100%)",
                border: "none", borderRadius: 10, color: "#0a0e27",
                fontWeight: 900, fontSize: "1rem", cursor: "pointer",
                boxShadow: "0 0 20px rgba(212,175,55,0.4)",
                transition: "transform 0.1s, box-shadow 0.2s",
                marginBottom: 10,
                opacity: isLoggingIn ? 0.7 : 1
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px rgba(212,175,55,0.7)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(212,175,55,0.4)"; }}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </button>

            <button
              onClick={() => setModal(null)}
              style={{
                width: "100%", padding: "12px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, color: "#b0b8d4", fontWeight: 600,
                fontSize: "0.9rem", cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ CHANGE PASSWORD MODAL ══════════════ */}
      {modal === "change-password" && (
        <div
          id="change-pw-modal-overlay"
          onClick={(e) => { if ((e.target as HTMLElement).id === "change-pw-modal-overlay") { setModal(null); } }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div className="glass p-8 rounded-2xl w-full max-w-md border border-[#d4af37]/30 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
            <h2 className="text-2xl font-black text-[#d4af37] mb-2 flex items-center gap-2">
              <Key size={24} /> Change Password
            </h2>
            <p className="text-[#b0b8d4] text-sm mb-6">Update your temporary admin password.</p>
            
            <form onSubmit={handleChangePassword}>
              <div className="mb-6">
                <label className="block text-xs text-[#b0b8d4] mb-2 font-semibold">New Password</label>
                <input
                  autoFocus
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-black/50 border border-white/20 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none transition-colors"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setModal(null); setNewPasswordValue(""); }}
                  className="flex-1 py-3 px-4 border border-white/10 text-white rounded-lg hover:bg-white/5 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPw}
                  className="flex-1 py-3 px-4 bg-[#d4af37] text-black rounded-lg hover:bg-yellow-400 transition font-bold disabled:opacity-50"
                >
                  {isChangingPw ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ KEYFRAMES ══════════════ */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(8px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-8px); }
          40%,80% { transform: translateX(8px); }
        }
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(212,175,55,0); }
        }
      `}</style>
    </>
  );
}

/* ─── Tournament Card ─── */
function TournamentCard({
  tournament: t,
  onAction,
  role,
}: {
  tournament: Tournament;
  onAction: (action: "host" | "live", t: Tournament) => void;
  role: string;
}) {
  const isLive = t.status === "running";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "rgba(212,175,55,0.06)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(212,175,55,0.45)" : "rgba(212,175,55,0.2)"}`,
        borderRadius: 18,
        padding: "28px 28px",
        backdropFilter: "blur(10px)",
        transition: "all 0.35s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 40px rgba(212,175,55,0.1)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>

        {/* Left: info */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1, minWidth: 220 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem",
            flexShrink: 0,
          }}>
            
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>{t.name}</h3>
              {isLive && (
                <span style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,51,51,0.15)", border: "1px solid rgba(255,51,51,0.4)",
                  borderRadius: 20, padding: "2px 10px", fontSize: "0.7rem",
                  color: "#ff6b6b", fontWeight: 700, letterSpacing: "0.1em",
                  animation: "pulse-gold 1.5s ease-in-out infinite",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#ff3333",
                    animation: "pulse-gold 1s ease-in-out infinite",
                    display: "inline-block",
                  }} />
                  LIVE
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{
                background: "rgba(212,175,55,0.15)", color: "#d4af37",
                borderRadius: 6, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700,
              }}>{t.year}</span>
              <span style={{ color: "#b0b8d4", fontSize: "0.8rem" }}>
                Budget: <span style={{ color: "#d4af37", fontWeight: 700 }}>₹{t.budget?.toLocaleString()}</span>
              </span>
              <span style={{ color: "#b0b8d4", fontSize: "0.8rem", textTransform: "capitalize" }}>
                Status: <span style={{
                  color: t.status === "running" ? "#4ade80" : t.status === "completed" ? "#60a5fa" : "#b0b8d4",
                  fontWeight: 600,
                }}>{t.status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <button
            id={`live-btn-${t.id}`}
            onClick={() => onAction("live", t)}
            style={{
              padding: "12px 22px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10, color: "#fff", fontWeight: 700,
              fontSize: "0.9rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            Watch Live
          </button>

          {/* Only show Host button to admins */}
          {role !== "guest" && (
            <button
              id={`host-btn-${t.id}`}
              onClick={() => onAction("host", t)}
              style={{
                padding: "12px 22px",
                background: "linear-gradient(135deg, #d4af37 0%, #c9992a 100%)",
                border: "none",
                borderRadius: 10, color: "#0a0e27", fontWeight: 900,
                fontSize: "0.9rem", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 0 15px rgba(212,175,55,0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 30px rgba(212,175,55,0.6)";
                (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 15px rgba(212,175,55,0.3)";
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            >
              Host Auction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
