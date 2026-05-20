"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Tournament } from "@/types";

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

  /* modal state */
  const [modal, setModal] = useState<null | { action: "host" | "live"; tournament: Tournament }>(null);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwShake, setPwShake] = useState(false);

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
    } else {
      setModal({ action: "host", tournament: t });
      setPassword("");
      setPwError(false);
    }
  };

  const handlePasswordSubmit = () => {
    const correct = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin";
    if (password === correct && modal) {
      router.push(`/host?tournament=${modal.tournament.id}`);
    } else {
      setPwError(true);
      setPwShake(true);
      setTimeout(() => setPwShake(false), 500);
    }
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
            ✨ The Most Awaited Event of the Year ✨
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

      {/* ══════════════ MAIN PAGE ══════════════ */}
      <main className="min-h-screen overflow-x-hidden" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f1535 0%, #0a0e27 60%)" }}>

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
                🏏 The Most Awaited Cricket Event of the Year
              </span>
            </div>

            {/* Stats row */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 40, marginTop: 40,
              flexWrap: "wrap",
            }}>
              {[
                { icon: "🏆", label: "Premier Auction", val: "Live" },
                { icon: "⚡", label: "Real-Time Bids", val: "Instant" },
                { icon: "🎯", label: "Professional", val: "System" },
              ].map((s) => (
                <div key={s.val} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem" }}>{s.icon}</div>
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
                🏆 Choose & Enter
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
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏏</div>
                <div style={{ color: "#b0b8d4", fontSize: "1.1rem", marginBottom: 8 }}>No tournaments yet.</div>
                <div style={{ color: "#4a5568", fontSize: "0.875rem" }}>Ask the admin to set up a tournament.</div>
              </div>
            </RevealSection>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {tournaments.map((t, idx) => (
                <RevealSection key={t.id} delay={idx * 80}>
                  <TournamentCard tournament={t} onAction={handleAction} />
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
        </div>
      </main>

      {/* ══════════════ HOST PASSWORD MODAL ══════════════ */}
      {modal && (
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
                margin: "0 auto 16px", fontSize: "1.8rem",
              }}>🔐</div>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: "1.5rem", color: "#d4af37" }}>
                Host Access
              </h2>
              <p style={{ margin: "8px 0 0", color: "#b0b8d4", fontSize: "0.9rem" }}>
                Enter admin password for{" "}
                <span style={{ color: "#fff", fontWeight: 700 }}>{modal.tournament.name}</span>
              </p>
            </div>

            {/* password input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                id="host-password-input"
                type="password"
                autoFocus
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
                ❌ Incorrect password. Try again.
              </div>
            )}

            <button
              id="host-enter-btn"
              onClick={handlePasswordSubmit}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #d4af37 0%, #c9992a 100%)",
                border: "none", borderRadius: 10, color: "#0a0e27",
                fontWeight: 900, fontSize: "1rem", cursor: "pointer",
                boxShadow: "0 0 20px rgba(212,175,55,0.4)",
                transition: "transform 0.1s, box-shadow 0.2s",
                marginBottom: 10,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px rgba(212,175,55,0.7)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(212,175,55,0.4)"; }}
            >
              🚀 Enter Host Panel
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
}: {
  tournament: Tournament;
  onAction: (action: "host" | "live", t: Tournament) => void;
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
            🏆
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
            📺 Watch Live
          </button>

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
            🎙️ Host Auction
          </button>
        </div>
      </div>
    </div>
  );
}
