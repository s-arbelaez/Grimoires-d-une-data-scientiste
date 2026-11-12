import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Bookmark, BookmarkCheck, Headphones, Search, Shuffle, Sparkles } from "lucide-react";
import { api } from "./api";
import { useMusic } from "./App";
import { CategoryChips, Ornament, PostCard, RelatedEntries, SectionHeading } from "./components";
import type { Category, Post, PostBlock, PostListData, PostPageData, Track } from "./types";
const BlockRenderer = lazy(() => import("./blocks").then((module) => ({ default: module.BlockRenderer })));

function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => { api<Category[]>("/categories").then(setCategories).catch(() => setCategories([])); }, []);
  return categories;
}

function usePosts(path: string) {
  const [data, setData] = useState<PostListData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    api<PostListData>(path).then((result) => { if (active) setData(result); })
      .catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [path]);
  return { data, error };
}

export function HomePage() {
  const categories = useCategories();
  const { data } = usePosts("/posts?limit=6&sort=featured");
  const [siteTitle, setSiteTitle] = useState("The Cyber Grimoire");
  const recent = data?.posts || [];
  const featured = recent.find((post) => post.featured) || recent[0];
  const navigate = useNavigate();
  const discoverRandom = async () => {
    try { const result = await api<{ slug: string }>("/random"); navigate(`/post/${result.slug}`); }
    catch { navigate("/archive"); }
  };
  useEffect(() => {
    api<{ site_title?: string }>("/settings").then((settings) => {
      if (settings.site_title) setSiteTitle(settings.site_title);
    }).catch(() => undefined);
  }, []);
  return <div className="home-page">
    <section className="hero-section simple-hero">
      <div className="hero-topline"><span>A personal archive of the curious</span><span className="hero-date">Ideas · experiments · music · mathematics</span></div>
      <div className="hero-art">
        <div className="hero-title-wrap">
          <span className="hero-pretitle">Welcome to</span>
          <h1>{siteTitle}</h1>
          <span className="hero-subtitle">A digital commonplace book for a mind in motion.</span>
          <Link className="hero-primary-link" to="/archive">Explore the archive <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>

    <section className="intro-strip">
      <p>Not a portfolio. Not a feed. Just a <em>living grimoire</em>—a place to collect the things I learn, make, question, and love.</p>
      <button className="text-link" onClick={discoverRandom}><Shuffle size={14} /> Open a random page</button>
    </section>

    {featured && <section className="featured-section">
      <div className="featured-image" aria-hidden="true"><div className="featured-frame"><span>AN ENTRY FROM THE ARCHIVE</span><span className="featured-sigil">☾</span><span>FIELD NOTES · {new Date(featured.published_at || featured.created_at).getFullYear()}</span></div></div>
      <div className="featured-copy"><span className="eyebrow">A page to begin with</span><h2>{featured.title}</h2><p>{featured.excerpt || "A fragment of the archive, waiting to be explored."}</p><Link className="text-link" to={`/post/${featured.slug}`}>Read this entry <ArrowRight size={15} /></Link></div>
    </section>}

    <section className="category-section"><SectionHeading eyebrow="Wander by subject" title="Rooms of the archive" action={<Link className="text-link" to="/archive">All entries <ArrowRight size={15} /></Link>} /><CategoryChips categories={categories} /></section>

    <section className="recent-section"><SectionHeading eyebrow="Fresh from the margins" title="Recently remembered" action={<Link className="text-link" to="/archive">Enter the archive <ArrowRight size={15} /></Link>} />
      {recent.length ? <div className="entry-grid">{recent.slice(0, 3).map((post) => <PostCard key={post.id} post={post} />)}</div>
        : <div className="empty-shelf"><span className="empty-sigil">✶</span><p>The first pages are still being written.</p><span>Come back when the ink has had time to dry.</span></div>}
    </section>

    <section className="music-teaser"><div className="music-teaser-glyph">♫</div><div><span className="eyebrow">A sound kept close</span><h2>Listen while you wander.</h2><p>Music has its own little room here—notes, songs, and things that ask to be heard.</p></div><Link className="round-link" to="/music" aria-label="Visit the Listening Room"><ArrowRight /></Link></section>
  </div>;
}

export function ArchivePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const categories = useCategories();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const path = `/posts?${query.toString()}`;
  const { data, error } = usePosts(path);
  const tags = useState<{ slug: string; name: string }[]>([]);
  useEffect(() => { api<{ slug: string; name: string }[]>("/tags").then(tags[1]).catch(() => tags[1]([])); }, []);
  const change = (key: string, value: string) => {
    const updated = new URLSearchParams(location.search);
    if (value) updated.set(key, value); else updated.delete(key);
    updated.delete("page");
    navigate(`/archive?${updated.toString()}`, { replace: true });
  };
  const clear = () => navigate("/archive");
  return <div className="archive-page page-container">
    <div className="page-intro"><span className="eyebrow">A cabinet of curiosities</span><h1>The Archive</h1><p>Fragments, findings, and whole little worlds. Find a thread and follow it.</p><Ornament>✣</Ornament></div>
    <div className="archive-toolbar">
      <label className="archive-search"><Search size={16} /><input value={query.get("search") || ""} onChange={(e) => change("search", e.target.value)} placeholder="Search the archive…" aria-label="Search entries" /></label>
      <select value={query.get("category") || ""} onChange={(e) => change("category", e.target.value)} aria-label="Filter by category"><option value="">All rooms</option>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select>
      <select value={query.get("tag") || ""} onChange={(e) => change("tag", e.target.value)} aria-label="Filter by tag"><option value="">All tags</option>{tags[0].map((tag) => <option value={tag.slug} key={tag.slug}>{tag.name}</option>)}</select>
      <select value={query.get("type") || ""} onChange={(e) => change("type", e.target.value)} aria-label="Filter by content type"><option value="">Any format</option>{[["code", "Code"], ["image", "Images"], ["audio", "Audio"], ["video", "Video"], ["equation", "Equations"]].map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select>
      <select value={query.get("sort") || "newest"} onChange={(e) => change("sort", e.target.value)} aria-label="Sort entries"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="featured">Featured first</option></select>
      <div className="date-filters"><label>From<input type="date" value={query.get("from") || ""} onChange={(e) => change("from", e.target.value)} /></label><label>To<input type="date" value={query.get("to") || ""} onChange={(e) => change("to", e.target.value)} /></label></div>
      <button className="clear-filters" onClick={clear}>Clear filters</button>
    </div>
    <div className="archive-result-line"><span>{data?.total ?? "—"} {data?.total === 1 ? "entry" : "entries"} in the open archive</span><span>{query.toString() ? "Filtered view" : "Every page, in order"}</span></div>
    {error ? <div className="error-state">{error}</div> : !data ? <div className="loading-state">Searching the shelves…</div> : data.posts.length
      ? <div className="entry-grid archive-grid">{data.posts.map((post) => <PostCard post={post} key={post.id} />)}</div>
      : <div className="empty-shelf"><span className="empty-sigil">✶</span><p>No pages found along this path.</p><span>Try another search or clear the filters.</span></div>}
    {(data?.pages ?? 0) > 1 && <div className="pagination"><button disabled={data!.page <= 1} onClick={() => change("page", String(data!.page - 1))}>← Previous</button><span>Page {data!.page} of {data!.pages}</span><button disabled={data!.page >= data!.pages} onClick={() => change("page", String(data!.page + 1))}>Next →</button></div>}
  </div>;
}

export function CategoryPage() {
  const { slug = "" } = useParams();
  const categories = useCategories();
  const category = categories.find((item) => item.slug === slug);
  const { data, error } = usePosts(`/posts?category=${encodeURIComponent(slug)}&limit=24`);
  return <div className="page-container archive-page"><div className="page-intro"><span className="eyebrow">A room of the archive</span><h1>{category?.name || "Category"}</h1><p>{category?.description}</p><Ornament>✣</Ornament></div>{error ? <div className="error-state">{error}</div> : !data ? <div className="loading-state">Opening this room…</div> : data.posts.length ? <div className="entry-grid archive-grid">{data.posts.map((post) => <PostCard post={post} key={post.id} />)}</div> : <div className="empty-shelf"><p>This room is quiet for now.</p><Link className="text-link" to="/archive">Browse all entries</Link></div>}</div>;
}

export function TagPage() {
  const { slug = "" } = useParams();
  const { data, error } = usePosts(`/posts?tag=${encodeURIComponent(slug)}&limit=24`);
  return <div className="page-container archive-page"><div className="page-intro"><span className="eyebrow">Following a thread</span><h1>#{slug.replaceAll("-", " ")}</h1><p>Every page carrying this little mark.</p><Ornament>✣</Ornament></div>{error ? <div className="error-state">{error}</div> : !data ? <div className="loading-state">Following the thread…</div> : data.posts.length ? <div className="entry-grid archive-grid">{data.posts.map((post) => <PostCard post={post} key={post.id} />)}</div> : <div className="empty-shelf"><p>No entries wear this tag yet.</p><Link className="text-link" to="/archive">Browse the archive</Link></div>}</div>;
}

export function PostPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<PostPageData | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api<PostPageData>(`/posts/${encodeURIComponent(slug)}`).then((result) => { if (active) setData(result); })
      .catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [slug]);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [data]);
  useEffect(() => {
    if (!data) return;
    document.title = `${data.post.title} | The Cyber Grimoire`;
    const description = data.post.excerpt || data.post.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = description;
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${window.location.origin}/post/${encodeURIComponent(data.post.slug)}`;
    document.head.appendChild(canonical);
    const socialMeta = ["og:title", "og:description", "og:type", "og:url"].map((property) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.appendChild(tag); }
      return tag;
    });
    socialMeta[0].content = `${data.post.title} | The Cyber Grimoire`;
    socialMeta[1].content = description;
    socialMeta[2].content = "article";
    socialMeta[3].content = canonical.href;
    const key = "grimoire-bookmarks";
    let saved: string[] = [];
    try { saved = JSON.parse(localStorage.getItem(key) || "[]") as string[]; } catch { saved = []; }
    setBookmarked(saved.includes(data.post.id));
    return () => {
      document.title = "The Cyber Grimoire";
      canonical.remove();
      socialMeta.forEach((tag) => tag.remove());
    };
  }, [data]);
  const toggleBookmark = () => {
    if (!data) return;
    const key = "grimoire-bookmarks";
    let saved: string[] = [];
    try { saved = JSON.parse(localStorage.getItem(key) || "[]") as string[]; } catch { saved = []; }
    const next = saved.includes(data.post.id) ? saved.filter((id) => id !== data.post.id) : [...saved, data.post.id];
    localStorage.setItem(key, JSON.stringify(next));
    setBookmarked(next.includes(data.post.id));
  };
  if (error) return <div className="page-container empty-state"><Ornament /><h1>The page is not in the public archive.</h1><p>Draft pages remain private.</p><Link className="text-link" to="/archive">Return to the archive</Link></div>;
  if (!data) return <div className="page-container loading-state">Turning the page…</div>;
  const { post } = data;
  const titleOf = (block: PostBlock) => block.type === "heading" || block.type === "subheading" ? block.text : undefined;
  const headingIndices = new Map<number, number>();
  const headings: string[] = [];
  post.blocks.forEach((block, index) => {
    const heading = titleOf(block);
    if (heading) {
      headingIndices.set(index, headings.length);
      headings.push(heading);
    }
  });
  return <article className={`post-page layout-${post.layout}`}>
    <div className="reading-progress" style={{ width: `${progress}%` }} />
    <header className="post-header">
      <Link className="back-link" to="/archive">← Back to the archive</Link>
      <div className="post-meta"><span>{post.category_slug?.replaceAll("-", " ") || "Archive"}</span><span>{new Date(post.published_at || post.created_at).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</span><span>{Math.max(1, Math.ceil(post.content_text.split(/\s+/).length / 220))} min read</span></div>
      <h1>{post.title}</h1>{post.excerpt && <p className="post-deck">{post.excerpt}</p>}
      <div className="post-tags">{post.tags.map((tag) => <Link key={tag.slug} to={`/tag/${tag.slug}`}>#{tag.name}</Link>)}</div>
      <button className="bookmark-button bookmark-ribbon" onClick={toggleBookmark}>{bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{bookmarked ? "Saved to your bookmarks" : "Keep this page"}</button>
      <Ornament>✣</Ornament>
    </header>
    {headings.length > 2 && <aside className="post-toc"><span className="eyebrow">In this entry</span>{headings.map((heading, index) => <a href={`#section-${index}`} key={`${heading}-${index}`}>{heading}</a>)}</aside>}
    <div className="post-content">{post.blocks.map((block, index) => {
      const headingIndex = headingIndices.get(index);
      return <div id={headingIndex !== undefined ? `section-${headingIndex}` : undefined} key={block.id || `${block.type}-${index}`} className={`post-block block-${block.type} treatment-${block.style || "default"}`}>{block.type === "audio" && block.mediaId ? <PostAudio block={block} /> : <Suspense fallback={<div className="media-placeholder">Opening this page…</div>}><BlockRenderer block={block} allBlocks={post.blocks} /></Suspense>}</div>;
    })}</div>
    <div className="post-end-mark"><Ornament>✣</Ornament><span>End of this entry—for now.</span></div>
    <RelatedEntries posts={data.related} />
  </article>;
}

function PostAudio({ block }: { block: PostBlock }) {
  const { current, playTrack } = useMusic();
  const track: Track = { id: block.mediaId!, filename: block.title || block.caption || "An entry soundtrack", caption: block.caption || block.title || "", mime_type: "audio/mpeg", alt_text: "", url: `/api/media/${block.mediaId}` };
  return <div className="post-audio"><div className="post-audio-native"><Suspense fallback={<div className="media-placeholder">Opening the audio player…</div>}><BlockRenderer block={block} /></Suspense></div><button onClick={() => playTrack(track)} aria-label={`Play ${track.filename} in the site player`}>{current?.id === track.id ? "Ⅱ" : "♫"}</button><span>Send to the listening bar</span><Headphones size={18} /></div>;
}

export function MusicPage() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState("");
  const { current, playTrack } = useMusic();
  useEffect(() => { api<{ tracks: Track[] }>("/music").then((result) => setTracks(result.tracks)).catch((reason: Error) => setError(reason.message)); }, []);
  return <div className="music-page page-container">
    <div className="music-hero"><span className="eyebrow">A room for listening</span><div className="music-vinyl" aria-hidden="true"><span>♫</span></div><h1>The Listening Room</h1><p>Some things make more sense when you let them play.</p><Ornament>✣</Ornament></div>
    <SectionHeading eyebrow="A little collection" title="Tracks kept close" />
    {error ? <div className="error-state">{error}</div> : !tracks ? <div className="loading-state">Tuning the listening room…</div> : tracks.length ? <div className="track-list">{tracks.map((track, index) => <div className="track-row" key={`${track.playlist || "room"}-${track.id}-${index}`}><span className="track-number">{String(index + 1).padStart(2, "0")}</span><button className="track-play" onClick={() => playTrack(track)} aria-label={`Play ${track.caption || track.filename}`}>{current?.id === track.id ? "Ⅱ" : "▶"}</button><div className="track-info"><strong>{track.caption || track.filename}</strong><span>{track.artist || track.playlist || track.alt_text || "A sound from the archive"}</span></div><audio controls preload="none" src={track.url} /></div>)}</div>
      : <div className="empty-shelf"><span className="empty-sigil">♫</span><p>The Listening Room is waiting for its first record.</p><span>Published audio entries will gather here.</span></div>}
    <div className="music-note"><Sparkles size={16} /><span>No sound begins without your invitation. Audio never autoplays.</span></div>
  </div>;
}

export function AboutPage() {
  const [secondaryTitle, setSecondaryTitle] = useState("Grimoires d'une Data Scientiste");
  useEffect(() => {
    api<{ secondary_title?: string }>("/settings").then((settings) => {
      if (settings.secondary_title) setSecondaryTitle(settings.secondary_title);
    }).catch(() => undefined);
  }, []);
  return <div className="about-page page-container">
    <div className="page-intro"><span className="eyebrow">A note from the keeper</span><h1>About this place</h1><p>Every archive begins with the wish not to lose something.</p><Ornament>✣</Ornament></div>
    <div className="about-layout"><div className="about-sigil">✧<span>THE<br />KEEPER</span>✧</div><div className="about-copy"><h2>A cabinet for a curious mind.</h2><p>The Cyber Grimoire is a personal digital commonplace book: a home for the ideas, experiments, questions, and small obsessions that deserve more than a passing thought.</p><p>Here, data science sits beside computer engineering, mathematics beside music, and projects beside personal notes. The shelves are allowed to be a little unruly. That is part of the point.</p><p>It is not a social network, a resume, or a finished catalogue. It is an evolving record of paying attention.</p><div className="about-colophon"><span className="eyebrow">A discreet colophon</span><p><em>{secondaryTitle}</em> — the old name, kept close to the binding.</p></div></div></div>
    <Link className="text-link" to="/archive">Wander through the archive <ArrowRight size={15} /></Link>
  </div>;
}

export function SearchOverlay({ onClose, onNavigate }: { onClose: () => void; onNavigate: (query: string) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search the archive" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="search-dialog" onSubmit={(event) => { event.preventDefault(); if (query.trim()) onNavigate(query.trim()); }}>
      <button className="search-close" type="button" onClick={onClose} aria-label="Close search">×</button><span className="eyebrow">Look for a thread</span>
      <label><Search size={20} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a word, a thought, a question…" /></label>
      <button className="search-submit" type="submit" disabled={!query.trim()}>Search the archive <ArrowRight size={15} /></button>
    </form>
  </div>;
}
