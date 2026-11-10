import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowUp, Moon, Search } from "lucide-react";
import { api } from "./api";
import { Ornament, PlayerBar } from "./components";
import { AboutPage, ArchivePage, CategoryPage, HomePage, MusicPage, PostPage, SearchOverlay, TagPage } from "./pages";
import { BatIllustration } from "./illustrations";
import type { Track } from "./types";
const AdminApp = lazy(() => import("./admin"));

type MusicContextValue = { current: Track | null; playTrack: (track: Track) => void };
const MusicContext = createContext<MusicContextValue>({ current: null, playTrack: () => undefined });
export const useMusic = () => useContext(MusicContext);

const starPositions = [
  [9, 21, 0], [27, 71, 2.4], [48, 17, 1.2], [69, 82, 3.6], [87, 32, .7],
  [94, 63, 4.1],
];

function BatFlight({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <BatIllustration className={`bat-flight ${className}`} style={style} />;
}

function SkyDecor({ pathname }: { pathname: string }) {
  const auraRef = useRef<HTMLDivElement>(null);
  const [bat, setBat] = useState<{ id: number; top: number; reverse: boolean } | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        auraRef.current?.style.setProperty("--pointer-x", `${event.clientX}px`);
        auraRef.current?.style.setProperty("--pointer-y", `${event.clientY}px`);
        auraRef.current?.classList.add("is-visible");
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    let expiry: number | undefined;
    const interval = window.setInterval(() => {
      id += 1;
      setBat({ id, top: 12 + Math.random() * 43, reverse: Math.random() > .5 });
      if (expiry) window.clearTimeout(expiry);
      expiry = window.setTimeout(() => setBat(null), 9200);
    }, 23000);
    return () => {
      window.clearInterval(interval);
      if (expiry) window.clearTimeout(expiry);
    };
  }, []);

  useEffect(() => setSecretOpen(false), [pathname]);

  const secret = pathname === "/" ? "The first star is always a little late." :
    pathname.startsWith("/post/") ? "Some pages keep a little moonlight between their lines." :
      pathname.startsWith("/category/") ? "Every room has a door that only opens from within." :
        pathname.startsWith("/tag/") ? "A thread can lead you back to yourself." :
          pathname.startsWith("/music") ? "Turn the record; the night turns with it." :
            pathname.startsWith("/about") ? "The keeper left a small mark in the margin." :
              "The archive remembers what the shelves forget.";

  return <>
    <div className="star-field" aria-hidden="true">{starPositions.map(([left, top, delay], index) =>
      <span key={index} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }}>✦</span>)}</div>
    <div className="cursor-aura" ref={auraRef} aria-hidden="true" />
    {bat && <BatFlight key={bat.id} style={{ top: `${bat.top}%`, animationDirection: bat.reverse ? "reverse" : "normal" }} />}
    <div className="secret-hiding-place">
      {secretOpen && <span className="secret-note" role="status">{secret}</span>}
      <button className="secret-key" aria-label={secretOpen ? "Close the hidden note" : "Find a hidden note"} title="A small secret" onClick={() => setSecretOpen((open) => !open)}><Moon size={16} /></button>
    </div>
  </>;
}

function SiteFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [siteTitle, setSiteTitle] = useState("The Cyber Grimoire");
  const [secondaryTitle, setSecondaryTitle] = useState("Grimoires d'une Data Scientiste");
  const siteShellRef = useRef<HTMLDivElement>(null);

  const playTrack = useCallback((track: Track) => {
    const audio = document.querySelector<HTMLAudioElement>("#persistent-audio");
    if (!audio) return;
    if (current?.id === track.id && !audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (current?.id !== track.id) audio.src = track.url;
    setCurrent(track);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [current]);

  const togglePlayer = () => {
    const audio = document.querySelector<HTMLAudioElement>("#persistent-audio");
    if (!audio || !current) return;
    if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { audio.pause(); setPlaying(false); }
  };
  const onEnded = async () => {
    setPlaying(false);
    try {
      const { tracks } = await api<{ tracks: Track[] }>("/music");
      const index = tracks.findIndex((track) => track.id === current?.id);
      if (tracks.length) playTrack(tracks[(index + 1) % tracks.length]);
    } catch { setPlaying(false); }
  };

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    api<{ site_title?: string; secondary_title?: string }>("/settings").then((settings) => {
      if (settings.site_title) setSiteTitle(settings.site_title);
      if (settings.secondary_title) setSecondaryTitle(settings.secondary_title);
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const listener = () => {
      setScroll(window.scrollY);
      siteShellRef.current?.style.setProperty("--moon-shift", `${Math.min(window.scrollY * .035, 28)}px`);
    };
    window.addEventListener("scroll", listener, { passive: true });
    return () => window.removeEventListener("scroll", listener);
  }, []);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return <MusicContext.Provider value={{ current, playTrack }}>
    <div className="site-shell" ref={siteShellRef}>
      {!location.pathname.startsWith("/admin") && <SkyDecor pathname={location.pathname} />}
      <header className="site-header">
        <Link className="brand-lockup" to="/" aria-label={`${siteTitle} home`}><span className="brand-mark">C</span><span><strong>{siteTitle}</strong><small>A personal archive of the curious</small></span></Link>
        <button className={`menu-toggle${menuOpen ? " is-pulled" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Pull to open menu"} aria-expanded={menuOpen}>
          <span className="menu-cord" aria-hidden="true"><i /><b /></span><span className="sr-only">{menuOpen ? "Close menu" : "Pull to open menu"}</span>
        </button>
        <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          <NavLink to="/archive">The Archive</NavLink><NavLink to="/music">Listening Room</NavLink><NavLink to="/about">About</NavLink>
          <button className="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search the archive"><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button>
        </nav>
      </header>
      <main className="route-stage" key={location.pathname}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/post/:slug" element={<PostPage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/admin/*" element={<Suspense fallback={<div className="admin-loading">Opening the private archive…</div>}><AdminApp /></Suspense>} />
          <Route path="*" element={<div className="empty-state"><Ornament /><h1>This page is lost to the archive.</h1><Link className="text-link" to="/">Return to the beginning</Link></div>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-ornament"><Ornament>✣</Ornament></div>
        <Link className="footer-name" to="/">The Cyber Grimoire</Link>
        <p>A small world of ideas, experiments, and things worth keeping.</p>
        <div className="footer-links"><Link to="/archive">Explore the archive</Link><Link to="/about">About this place</Link><Link to="/admin">Private entrance</Link></div>
        <span className="secret-title">{secondaryTitle}</span>
      </footer>
      <PlayerBar track={current} playing={playing} onToggle={togglePlayer} onEnded={onEnded} />
      {scroll > 500 && <button className="back-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp size={17} /></button>}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} onNavigate={(query) => { setSearchOpen(false); navigate(`/archive?search=${encodeURIComponent(query)}`); }} />}
    </div>
  </MusicContext.Provider>;
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    const adminPage = location.pathname.startsWith("/admin");
    document.title = adminPage ? "Admin | The Cyber Grimoire" : "The Cyber Grimoire";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
    robots.content = adminPage ? "noindex, nofollow, noarchive" : "index, follow";
  }, [location.pathname]);
  return <SiteFrame />;
}
