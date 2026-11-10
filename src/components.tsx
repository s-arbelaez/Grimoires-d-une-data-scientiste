import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Music2 } from "lucide-react";
import type { Category, Post, Track } from "./types";

export function Ornament({ children = "✳" }: { children?: string }) {
  return <span className="ornament" aria-hidden="true">{children}</span>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading">
    <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
    {action}
  </div>;
}

export function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <article className={`entry-card${featured ? " entry-card-featured" : ""}`}>
    <div className="card-kicker"><span>{post.category_slug?.replaceAll("-", " ") || "Archive"}</span><span>{new Date(post.published_at || post.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span></div>
    <h3><Link to={`/post/${post.slug}`}>{post.title}</Link></h3>
    {post.excerpt && <p>{post.excerpt}</p>}
    <div className="card-footer">{post.tags.slice(0, 3).map((tag) => <Link key={tag.slug} to={`/tag/${tag.slug}`}>#{tag.name}</Link>)}<Link className="read-link" to={`/post/${post.slug}`} aria-label={`Read ${post.title}`}><ArrowRight size={16} /></Link></div>
  </article>;
}

export function CategoryChips({ categories }: { categories: Category[] }) {
  return <div className="category-list">{categories.map((category, i) => <Link className="category-chip" to={`/category/${category.slug}`} key={category.slug}>
    <span className="category-index">{String(i + 1).padStart(2, "0")}</span><span>{category.name}</span><small>{category.post_count ?? 0}</small>
  </Link>)}</div>;
}

export function PlayerBar({ track, playing, onToggle, onEnded }: {
  track: Track | null; playing: boolean; onToggle: () => void; onEnded: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  return <div className="player-bar">
    <div className="player-track"><span className="player-icon"><Music2 size={17} /></span><div><strong>{track?.caption || track?.filename || "A quiet place to listen"}</strong><small>{track ? "From the listening room" : "Choose a track from Music"}</small></div></div>
    <div className="player-controls">
      <button className="player-play" disabled={!track} aria-label={playing ? "Pause music" : "Play music"} onClick={onToggle}>{playing ? "Ⅱ" : "▶"}</button>
      <input aria-label="Track position" type="range" min="0" max={duration || 1} value={progress} onChange={(event) => {
        const audio = document.querySelector<HTMLAudioElement>("#persistent-audio");
        if (audio) audio.currentTime = Number(event.target.value);
        setProgress(Number(event.target.value));
      }} />
      <span className="player-time">{duration ? `${Math.floor(progress / 60)}:${String(Math.floor(progress % 60)).padStart(2, "0")}` : "—:——"}</span>
    </div>
    <audio id="persistent-audio" preload="none" onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)} onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)} onEnded={onEnded} />
    <Link className="player-library" to="/music" aria-label="Open the Listening Room"><Music2 size={16} /></Link>
  </div>;
}

export function RelatedEntries({ posts }: { posts: Post[] }) {
  if (!posts.length) return null;
  return <section className="related-section"><SectionHeading eyebrow="Keep wandering" title="Nearby pages" />{posts.map((post) => <PostCard key={post.id} post={post} />)}</section>;
}
