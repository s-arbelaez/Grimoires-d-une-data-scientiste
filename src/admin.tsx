import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Check, Copy, Eye, FilePlus2, ImagePlus, LogOut, Plus, Save, Settings2, Trash2, Upload, X } from "lucide-react";
import { api, slugFromTitle } from "./api";
import { Ornament } from "./components";
import { BlockRenderer } from "./blocks";
import type { BlockType, Category, Post, PostBlock } from "./types";

type Settings = { site_title: string; secondary_title: string };
type MediaItem = { id: string; filename: string; mime_type: string; size_bytes: number; alt_text: string; caption: string; uploaded_at: string; is_public: number };
type UploadResult = { id: string; filename: string; mime_type: string; kind: string; size_bytes: number; url: string };
type PlaylistTrack = { media_id: string; position: number; title: string; artist: string; filename: string; is_public: number };
type Playlist = { id: string; title: string; description: string; sort_order: number; tracks: PlaylistTrack[] };
type AudioFile = { id: string; filename: string; caption: string; mime_type: string; is_public: number };

const templates: { name: string; category: string; blocks: Omit<PostBlock, "id">[] }[] = [
  { name: "Data Science", category: "data-science", blocks: [
    { type: "heading", text: "The question" }, { type: "paragraph", text: "" }, { type: "heading", text: "Context & motivation" },
    { type: "paragraph", text: "" }, { type: "heading", text: "Concepts & foundations" }, { type: "markdown", text: "" },
    { type: "heading", text: "Method & implementation" }, { type: "code", language: "python", code: "" },
    { type: "heading", text: "Observations & limitations" }, { type: "paragraph", text: "" }, { type: "heading", text: "References" }, { type: "paragraph", text: "" },
  ] },
  { name: "Computer Engineering", category: "computer-engineering", blocks: [
    { type: "heading", text: "Context" }, { type: "paragraph", text: "" }, { type: "heading", text: "Technical concept" },
    { type: "markdown", text: "" }, { type: "heading", text: "Architecture & design" }, { type: "image", caption: "" },
    { type: "heading", text: "Implementation" }, { type: "code", language: "text", code: "" }, { type: "heading", text: "Findings & references" }, { type: "paragraph", text: "" },
  ] },
  { name: "Mathematics", category: "mathematics", blocks: [
    { type: "heading", text: "Topic & motivation" }, { type: "paragraph", text: "" }, { type: "heading", text: "Definitions" },
    { type: "markdown", text: "" }, { type: "heading", text: "Derivation" }, { type: "equation", equation: "f(x) = x^2" },
    { type: "heading", text: "Worked example" }, { type: "paragraph", text: "" }, { type: "heading", text: "Questions & references" }, { type: "paragraph", text: "" },
  ] },
  { name: "Projects", category: "projects", blocks: [
    { type: "heading", text: "Why make this?" }, { type: "paragraph", text: "" }, { type: "heading", text: "The problem & objectives" },
    { type: "callout", title: "The intention", text: "" }, { type: "heading", text: "Tools & architecture" },
    { type: "image", caption: "A glimpse of the work" }, { type: "heading", text: "Development log" },
    { type: "markdown", text: "" }, { type: "heading", text: "Results & lessons" }, { type: "paragraph", text: "" },
  ] },
  { name: "Music", category: "music", blocks: [
    { type: "heading", text: "Artist & record" }, { type: "paragraph", text: "" }, { type: "audio", caption: "" },
    { type: "heading", text: "A little context" }, { type: "markdown", text: "" }, { type: "quote", text: "", caption: "A line that stayed with me" },
    { type: "heading", text: "Listening notes" }, { type: "paragraph", text: "" },
  ] },
  { name: "Art", category: "art", blocks: [
    { type: "heading", text: "The subject" }, { type: "paragraph", text: "" }, { type: "gallery", mediaIds: [] },
    { type: "heading", text: "Context & commentary" }, { type: "markdown", text: "" },
    { type: "heading", text: "Personal interpretation" }, { type: "paragraph", text: "" },
  ] },
  { name: "Personal Notes", category: "personal-notes", blocks: [
    { type: "heading", text: "A note to keep" }, { type: "paragraph", text: "" }, { type: "image", caption: "" },
  ] },
  { name: "General", category: "general", blocks: [{ type: "paragraph", text: "" }] },
];

const blockOptions: { type: BlockType; label: string }[] = [
  { type: "heading", label: "Heading" }, { type: "subheading", label: "Subheading" },
  { type: "paragraph", label: "Text" }, { type: "markdown", label: "Markdown" },
  { type: "quote", label: "Quote" }, { type: "image", label: "Image" },
  { type: "gallery", label: "Gallery" }, { type: "audio", label: "Audio" },
  { type: "video", label: "Video" }, { type: "file", label: "File" },
  { type: "code", label: "Code" }, { type: "equation", label: "Equation" },
  { type: "callout", label: "Callout" }, { type: "divider", label: "Divider" },
  { type: "table", label: "Table" }, { type: "toc", label: "Contents" }, { type: "spacer", label: "Spacer" },
];

function makeBlock(type: BlockType): PostBlock {
  const base: PostBlock = { id: crypto.randomUUID(), type };
  if (["heading", "subheading", "paragraph", "markdown", "quote", "callout"].includes(type)) base.text = "";
  if (type === "code") { base.code = ""; base.language = "text"; }
  if (type === "equation") base.equation = "";
  if (type === "gallery") base.mediaIds = [];
  return base;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try { await api("/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }); onLogin(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The sign-in could not be completed."); }
    finally { setBusy(false); }
  };
  return <div className="login-page"><div className="login-card"><Link className="login-brand" to="/">✣ &nbsp; The Cyber Grimoire</Link><span className="eyebrow">Private entrance</span><h1>Welcome back.</h1><p>This little room is for the keeper of the archive.</p>
    <form onSubmit={submit}><label>Username<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="button-primary" disabled={busy}>{busy ? "Unlocking…" : "Enter the archive"}</button></form>
    <Link className="login-return" to="/">← Return to the public pages</Link></div></div>;
}

export default function AdminApp() {
  const [auth, setAuth] = useState<"checking" | "yes" | "no">("checking");
  const navigate = useNavigate();
  const refresh = () => api("/admin/me").then(() => setAuth("yes")).catch(() => setAuth("no"));
  useEffect(() => { refresh(); }, []);
  const logout = async () => { try { await api("/admin/logout", { method: "POST" }); } finally { setAuth("no"); navigate("/admin"); } };
  if (auth === "checking") return <div className="admin-loading">Opening the private archive…</div>;
  if (auth === "no") return <AdminLogin onLogin={() => { setAuth("yes"); navigate("/admin"); }} />;
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Link className="admin-brand" to="/admin"><span>✣</span><strong>The Grimoire</strong></Link><small>PRIVATE ARCHIVE</small><nav><Link to="/admin">Overview</Link><Link to="/admin/media">Media library</Link><Link to="/admin/playlists">Playlists</Link><Link to="/admin/categories">Categories</Link><Link to="/admin/settings">Site settings</Link></nav><Link className="admin-public" to="/">View public site ↗</Link><button className="admin-logout" onClick={logout}><LogOut size={15} /> Sign out</button></aside>
    <main className="admin-main"><Routes><Route index element={<Dashboard />} /><Route path="new" element={<Editor />} /><Route path="edit/:id" element={<Editor />} /><Route path="media" element={<MediaLibrary />} /><Route path="playlists" element={<PlaylistManager />} /><Route path="categories" element={<CategoryManager />} /><Route path="settings" element={<SiteSettings />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></main>
  </div>;
}

function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const reload = () => api<Post[]>("/admin/posts").then(setPosts).catch((reason: Error) => setError(reason.message));
  useEffect(() => { reload(); }, []);
  const create = () => navigate("/admin/new");
  return <div className="dashboard-page"><div className="admin-topline"><div><span className="eyebrow">The keeper's desk</span><h1>Good evening.</h1><p>Gather your thoughts. The archive is yours to shape.</p></div><button className="button-primary" onClick={create}><FilePlus2 size={16} /> Compose an entry</button></div>
    <div className="admin-stats"><div><span>All entries</span><strong>{posts.length}</strong></div><div><span>Published</span><strong>{posts.filter((post) => post.status === "published").length}</strong></div><div><span>In draft</span><strong>{posts.filter((post) => post.status === "draft").length}</strong></div></div>
    <section className="admin-list-section"><div className="admin-list-heading"><div><span className="eyebrow">Your pages</span><h2>Recent entries</h2></div><button className="text-link" onClick={create}><Plus size={15} /> New entry</button></div>
      {error && <div className="form-error">{error}</div>}
      {posts.length ? <div className="admin-post-list">{posts.map((post) => <div className="admin-post-row" key={post.id}><span className={`status-dot ${post.status}`} /><div className="admin-post-title"><strong>{post.title}</strong><span>{post.category_slug || "Uncategorized"} · Updated {new Date(post.updated_at).toLocaleDateString()}</span></div><span className={`status-label ${post.status}`}>{post.status}</span><Link className="admin-edit-link" to={`/admin/edit/${post.id}`}>Edit →</Link></div>)}</div>
        : <div className="admin-empty"><Ornament /><p>No pages just yet.</p><button className="text-link" onClick={create}>Begin with a blank canvas <ArrowDown size={14} /></button></div>}
    </section>
  </div>;
}

function Editor() {
  const { id } = useParams();
  const isNew = id === undefined || id === "new";
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [postId, setPostId] = useState<string | null>(isNew ? null : id!);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [layout, setLayout] = useState("single");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [blocks, setBlocks] = useState<PostBlock[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [preview, setPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  useEffect(() => { api<Category[]>("/admin/categories").then(setCategories).catch((reason: Error) => setError(reason.message)); }, []);
  useEffect(() => {
    if (isNew) return;
    let active = true;
    api<Post[]>(`/admin/posts`).then((posts) => {
      const post = posts.find((item) => item.id === id);
      if (!post) throw new Error("This entry could not be found.");
      if (!active) return;
      setTitle(post.title); setSlug(post.slug); setExcerpt(post.excerpt); setCategory(post.category_slug || "");
      setLayout(post.layout); setTags(post.tags.map((tag) => tag.name).join(", ")); setFeatured(post.featured);
      setBlocks(post.blocks.map((block) => ({ ...block, id: block.id || crypto.randomUUID() }))); setStatus(post.status);
    }).catch((reason: Error) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isNew]);

  const update = (index: number, patch: Partial<PostBlock>) => setBlocks((current) => current.map((block, i) => i === index ? { ...block, ...patch } : block));
  const move = (index: number, direction: -1 | 1) => setBlocks((current) => {
    const next = [...current]; const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const applyTemplate = (template: typeof templates[number]) => {
    setCategory(template.category);
    setBlocks(template.blocks.map((block) => ({ ...block, id: crypto.randomUUID() })));
    setNotice(`${template.name} structure added. Every block is yours to change.`);
    window.setTimeout(() => setNotice(""), 3800);
  };
  const save = async (nextStatus: "draft" | "published" = "draft") => {
    setBusy(true); setError(""); setNotice("");
    const payload = {
      title, slug: slug || slugFromTitle(title), excerpt, category_slug: category || null,
      layout, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), featured,
      blocks: blocks.map(({ id: _id, ...block }) => block), status: nextStatus,
    };
    try {
      const saved = await api<Post>(postId ? `/admin/posts/${postId}` : "/admin/posts", {
        method: postId ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      setPostId(saved.id); setSlug(saved.slug); setStatus(saved.status);
      setNotice(nextStatus === "published" ? "This entry is now in the public archive." : "Draft saved safely.");
      if (!postId) navigate(`/admin/edit/${saved.id}`, { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The entry could not be saved."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!postId || !window.confirm("Delete this entry permanently? This cannot be undone.")) return;
    try { await api(`/admin/posts/${postId}`, { method: "DELETE" }); navigate("/admin"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The entry could not be deleted."); }
  };
  const upload = async (file: File, index: number) => {
    const body = new FormData(); body.set("file", file);
    setError("");
    try {
      const media = await api<UploadResult>("/admin/media", { method: "POST", body });
      const block = blocks[index];
      if (block.type === "gallery") update(index, { mediaIds: [...(block.mediaIds || []), media.id] });
      else update(index, { mediaId: media.id, title: block.title || media.filename });
      setNotice(`${media.filename} uploaded to protected media storage.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed."); }
  };
  const previewPost = { id: postId || "preview", slug: slug || slugFromTitle(title), title: title || "Untitled entry", excerpt, category_slug: category || null, status, layout, cover_media_id: null, content_text: "", featured, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), published_at: null, blocks, tags: tags.split(",").filter(Boolean).map((name) => ({ name, slug: slugFromTitle(name) })) };
  if (loading) return <div className="admin-loading">Gathering your pages…</div>;
  return <div className="editor-page">
    <div className="editor-topbar"><Link to="/admin" className="back-link">← Desk</Link><div><span className={`status-label ${status}`}>{status}</span>{notice && <span className="save-notice"><Check size={14} /> {notice}</span>}</div><div className="editor-actions"><button className="button-quiet" onClick={() => setPreview(!preview)}><Eye size={15} /> {preview ? "Edit" : "Preview"}</button><button className="button-quiet" disabled={busy} onClick={() => save("draft")}><Save size={15} /> Save draft</button><button className="button-primary" disabled={busy} onClick={() => save(status === "published" ? "draft" : "published")}>{busy ? "Saving…" : status === "published" ? "Unpublish" : "Publish"}</button></div></div>
    {error && <div className="form-error editor-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
    {!preview ? <div className="editor-layout">
      <section className="editor-canvas">
        {!blocks.length && <div className="template-picker"><span className="eyebrow">Begin with a structure</span><h2>Choose a template, or start with a blank canvas.</h2><div className="template-grid">{templates.map((template) => <button key={template.name} onClick={() => applyTemplate(template)}><span>✣</span><strong>{template.name}</strong><small>{template.blocks.length} starter sections</small></button>)}</div><button className="text-link" onClick={() => setBlocks([makeBlock("paragraph")])}>Start with a blank canvas <ArrowDown size={14} /></button></div>}
        <div className="canvas-heading"><span className="eyebrow">The composition</span><span>{blocks.length} blocks · drag-free, move with arrows</span></div>
        {blocks.map((block, index) => <BlockEditor key={block.id} block={block} index={index} count={blocks.length} onChange={(patch) => update(index, patch)} onMove={move} onDuplicate={() => setBlocks((current) => [...current.slice(0, index + 1), { ...block, id: crypto.randomUUID() }, ...current.slice(index + 1)])} onDelete={() => setBlocks((current) => current.filter((_, i) => i !== index))} onUpload={(file) => upload(file, index)} />)}
        <div className="add-block-panel"><span className="eyebrow">Add to your page</span><div className="block-add-list">{blockOptions.map((option) => <button key={option.type} onClick={() => setBlocks((current) => [...current, makeBlock(option.type)])}><Plus size={13} />{option.label}</button>)}</div></div>
      </section>
      <aside className="editor-settings">
        <span className="eyebrow">Entry details</span><label>Title<input value={title} onChange={(e) => { setTitle(e.target.value); if (!slugManuallyEdited) setSlug(slugFromTitle(e.target.value)); }} placeholder="Give this page a name…" maxLength={180} /></label>
        <label>URL slug<div className="slug-field"><span>/post/</span><input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }} /></div></label>
        <label>Short introduction<textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="A few words to invite someone in…" maxLength={500} /></label>
        <label>Room<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Uncategorized</option>{categories.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
        <label>Tags <small>Separate with commas</small><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="systems, notes, learning" /></label>
        <fieldset><legend>Page composition</legend><div className="layout-options">{[["single", "One column"], ["split", "Two column"], ["wide", "Full width"]].map(([value, name]) => <button className={layout === value ? "selected" : ""} onClick={() => setLayout(value)} key={value} type="button">{name}</button>)}</div></fieldset>
        <label className="featured-check"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Feature this entry on the home page</label>
        {postId && <button className="delete-entry" onClick={remove}><Trash2 size={15} /> Delete this entry</button>}
        <div className="editor-help"><span>✦</span><p>Every block is editable. Save a draft at any time; only published pages enter the public archive.</p></div>
      </aside>
    </div> : <div className={`editor-preview preview-${previewMode}`}><div className="preview-toolbar"><span className="eyebrow">Live page preview</span><div>{["desktop", "tablet", "mobile"].map((mode) => <button className={previewMode === mode ? "selected" : ""} onClick={() => setPreviewMode(mode)} key={mode}>{mode}</button>)}</div></div><PreviewPost post={previewPost} /></div>}
  </div>;
}

function BlockEditor({ block, index, count, onChange, onMove, onDuplicate, onDelete, onUpload }: {
  block: PostBlock; index: number; count: number; onChange: (patch: Partial<PostBlock>) => void;
  onMove: (index: number, direction: -1 | 1) => void; onDuplicate: () => void; onDelete: () => void; onUpload: (file: File) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileChanged = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); event.target.value = ""; }
  };
  const textArea = (key: "text" | "code" | "equation" | "rows", placeholder: string, rows = 4) => <textarea value={block[key] || ""} onChange={(event) => onChange({ [key]: event.target.value })} placeholder={placeholder} rows={rows} />;
  return <section className={`block-editor block-editor-${block.type}`}>
    <div className="block-editor-head"><span className="block-type-label">{blockOptions.find((option) => option.type === block.type)?.label || block.type}</span><div className="block-tools">
      <button onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up"><ArrowUp size={14} /></button><button onClick={() => onMove(index, 1)} disabled={index === count - 1} title="Move down"><ArrowDown size={14} /></button><button onClick={onDuplicate} title="Duplicate block"><Copy size={14} /></button><button onClick={onDelete} title="Delete block"><Trash2 size={14} /></button>
    </div></div>
    {["heading", "subheading", "paragraph", "markdown", "quote", "callout"].includes(block.type) && textArea("text", block.type === "heading" ? "Section title…" : "Write this part of your page…", block.type === "heading" || block.type === "subheading" ? 1 : 4)}
    {block.type === "quote" && <input value={block.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Attribution (optional)" />}
    {block.type === "callout" && <div className="block-inline-fields"><input value={block.title || ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Callout label" /><select value={block.style || "lavender"} onChange={(e) => onChange({ style: e.target.value })}><option value="lavender">Lavender</option><option value="parchment">Parchment</option><option value="rose">Rose</option></select></div>}
    {block.type === "code" && <><div className="block-inline-fields"><input value={block.language || ""} onChange={(e) => onChange({ language: e.target.value })} placeholder="Language (e.g. python)" /></div>{textArea("code", "Paste or write code…", 8)}</>}
    {block.type === "equation" && <>{textArea("equation", "Enter a LaTeX expression, e.g. \\int_0^1 x^2 \\, dx", 2)}<small>LaTeX is rendered in the published entry.</small></>}
    {block.type === "table" && textArea("rows", "Use a Markdown table…", 5)}
    {["image", "gallery", "audio", "video", "file"].includes(block.type) && <div className="block-media-fields">
      {block.mediaId && <div className="attached-media"><span>Attached: {block.title || block.mediaId.slice(0, 8)}</span><button onClick={() => onChange({ mediaId: undefined, title: undefined })} aria-label="Remove attached media"><X size={14} /></button></div>}
      {block.type === "gallery" && block.mediaIds?.length ? <div className="gallery-count">{block.mediaIds.length} image{block.mediaIds.length === 1 ? "" : "s"} in this gallery <button onClick={() => onChange({ mediaIds: [] })}>Clear</button></div> : null}
      <label className="upload-button"><Upload size={15} />{uploading ? "Uploading…" : block.type === "gallery" ? "Add an image" : block.mediaId ? "Replace file" : "Choose a file"}<input type="file" accept={block.type === "image" || block.type === "gallery" ? "image/jpeg,image/png,image/gif,image/webp" : block.type === "audio" ? "audio/mpeg,audio/wav,audio/ogg" : block.type === "video" ? "video/mp4" : "application/pdf"} onChange={fileChanged} disabled={uploading} /></label>
      {["image", "gallery"].includes(block.type) && <input value={block.altText || ""} onChange={(e) => onChange({ altText: e.target.value })} placeholder="Alt text for accessibility" />}
      <input value={block.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Caption or description" />
    </div>}
    {block.type === "divider" && <div className="block-divider-preview">✣ ───────── ✣</div>}
    {block.type === "toc" && <div className="block-divider-preview">The published contents list is generated from headings.</div>}
    {block.type === "spacer" && <div className="block-divider-preview">A little breathing room between sections.</div>}
    <div className="block-style-row"><span>Block treatment</span><select value={block.style || "default"} onChange={(e) => onChange({ style: e.target.value })}><option value="default">Default</option><option value="indented">Indented</option><option value="wide">Wide</option><option value="centered">Centered</option></select></div>
  </section>;
}

function PreviewPost({ post }: { post: Post }) {
  let headingIndex = 0;
  return <article className={`preview-post layout-${post.layout}`}><header><span className="eyebrow">Preview · {post.category_slug || "Archive"}</span><h1>{post.title}</h1>{post.excerpt && <p>{post.excerpt}</p>}<Ornament>✣</Ornament></header><div className="post-content">{post.blocks.map((block, index) => {
    const section = block.type === "heading" || block.type === "subheading" ? headingIndex++ : undefined;
    return <div id={section !== undefined ? `preview-section-${section}` : undefined} className={`post-block block-${block.type} treatment-${block.style || "default"}`} key={block.id || index}><BlockRenderer block={block} preview allBlocks={post.blocks} /></div>;
  })}</div></article>;
}

function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => api<MediaItem[]>("/admin/media").then(setItems).catch((reason: Error) => setError(reason.message));
  useEffect(() => { refresh(); }, []);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError("");
    const form = new FormData(); form.set("file", file);
    try { await api<UploadResult>("/admin/media", { method: "POST", body: form }); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The upload failed."); }
    finally { setBusy(false); }
  };
  return <div className="admin-section-page"><div className="admin-topline"><div><span className="eyebrow">Your collected materials</span><h1>Media library</h1><p>Files live in private R2 storage until a published entry uses them.</p></div><label className="button-primary upload-library"><ImagePlus size={15} />{busy ? "Uploading…" : "Upload a file"}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,application/pdf" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
    {error && <div className="form-error">{error}</div>}
    {items.length ? <div className="media-grid">{items.map((item) => <div className="media-card" key={item.id}><div className="media-card-preview">{item.mime_type.startsWith("image/") ? <img src={`/api/admin/media/${item.id}/file`} alt={item.alt_text} /> : <span>{item.mime_type.startsWith("audio/") ? "♫" : item.mime_type.startsWith("video/") ? "▶" : "PDF"}</span>}</div><strong>{item.filename}</strong><small>{item.mime_type} · {(item.size_bytes / 1024 / 1024).toFixed(2)} MB · {item.is_public ? "Public via published post" : "Private"}</small><button onClick={async () => { await navigator.clipboard.writeText(item.id); }}>Copy media ID <Copy size={13} /></button><button className="media-delete" onClick={async () => {
      if (!window.confirm(`Permanently remove ${item.filename} from R2?`)) return;
      try { await api(`/admin/media/${item.id}`, { method: "DELETE" }); refresh(); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "The file could not be removed."); }
    }}>Remove file <Trash2 size={13} /></button></div>)}</div>
      : <div className="admin-empty"><Ornament /><p>Your media library is empty.</p><span>Upload images, audio, video, and PDFs for your entries.</span></div>}
  </div>;
}

function PlaylistManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<PlaylistTrack[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async (keepId = selectedId) => {
    const result = await api<{ playlists: Playlist[]; media: AudioFile[] }>("/admin/playlists");
    setPlaylists(result.playlists);
    setAudioFiles(result.media);
    const current = result.playlists.find((playlist) => playlist.id === keepId) || result.playlists[0];
    setSelectedId(current?.id || "");
    setSelectedTracks(current?.tracks.map((track) => ({ ...track })) || []);
    setTitle(current?.title || "");
    setDescription(current?.description || "");
  };
  useEffect(() => { refresh().catch((reason: Error) => setError(reason.message)); }, []);

  const selectPlaylist = (playlist: Playlist) => {
    setSelectedId(playlist.id);
    setSelectedTracks(playlist.tracks.map((track) => ({ ...track })));
    setTitle(playlist.title);
    setDescription(playlist.description);
    setNotice("");
  };
  const toggleTrack = (file: AudioFile, checked: boolean) => {
    setSelectedTracks((current) => checked
      ? [...current, {
        media_id: file.id, position: current.length, title: file.caption || file.filename.replace(/\.[^.]+$/, ""),
        artist: "", filename: file.filename, is_public: file.is_public,
      }]
      : current.filter((track) => track.media_id !== file.id));
  };
  const updateTrack = (mediaId: string, patch: Partial<PlaylistTrack>) => {
    setSelectedTracks((current) => current.map((track) => track.media_id === mediaId ? { ...track, ...patch } : track));
  };
  const save = async () => {
    if (!selectedId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`/admin/playlists/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ title, description, tracks: selectedTracks.map(({ media_id, title: trackTitle, artist }) => ({ media_id, title: trackTitle, artist })) }),
      });
      await refresh(selectedId);
      setNotice("Playlist saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Playlist could not be saved."); }
    finally { setBusy(false); }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const created = await api<Playlist>("/admin/playlists", { method: "POST", body: JSON.stringify({ title: newTitle, description: newDescription }) });
      setNewTitle(""); setNewDescription("");
      await refresh(created.id);
      setNotice("A new playlist is ready. Add a few tracks to begin.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Playlist could not be created."); }
    finally { setBusy(false); }
  };
  const removePlaylist = async () => {
    if (!selectedId || selectedId === "listening-room" || !window.confirm(`Delete “${title}” and its playlist order? Your media files will remain in the library.`)) return;
    setBusy(true); setError("");
    try { await api(`/admin/playlists/${selectedId}`, { method: "DELETE" }); await refresh(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Playlist could not be removed."); }
    finally { setBusy(false); }
  };

  return <div className="admin-section-page">
    <div className="admin-topline"><div><span className="eyebrow">Music in the margins</span><h1>Playlists</h1><p>Curate the listening rooms visitors can carry through the archive.</p></div></div>
    {error && <div className="form-error">{error}</div>}
    <form className="playlist-create" onSubmit={create}><span className="eyebrow">Open a new listening room</span><label>Playlist name<input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required maxLength={100} placeholder="A name for this collection" /></label><label>Small description<input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} maxLength={300} placeholder="What kind of listening belongs here?" /></label><button className="button-primary" disabled={busy}><Plus size={15} /> Create playlist</button></form>
    {!playlists.length ? <div className="admin-empty"><Ornament /><p>No playlists yet.</p><span>Make one, then upload audio in the media library.</span></div> : <div className="playlist-manager">
      <div className="playlist-tabs" role="tablist" aria-label="Playlists">{playlists.map((playlist) => <button key={playlist.id} role="tab" aria-selected={selectedId === playlist.id} className={selectedId === playlist.id ? "selected" : ""} onClick={() => selectPlaylist(playlist)}>{playlist.title}<small>{playlist.tracks.length} tracks</small></button>)}</div>
      <section className="playlist-editor"><div className="playlist-editor-head"><div><span className="eyebrow">Current listening room</span><h2>{title || "Playlist"}</h2></div><div className="playlist-actions"><button className="button-quiet" onClick={removePlaylist} disabled={busy || selectedId === "listening-room"}><Trash2 size={14} /> Delete</button><button className="button-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save playlist"}</button></div></div>
        <label className="playlist-field">Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></label>
        <label className="playlist-field">Description<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} /></label>
        <span className="eyebrow playlist-track-label">Select tracks and arrange the names</span>
        {audioFiles.length ? <div className="playlist-track-editor">{audioFiles.map((file) => {
          const track = selectedTracks.find((entry) => entry.media_id === file.id);
          return <div className={`playlist-track-edit${track ? " is-selected" : ""}`} key={file.id}>
            <label className="playlist-track-check"><input type="checkbox" checked={Boolean(track)} onChange={(event) => toggleTrack(file, event.target.checked)} /><span><strong>{file.caption || file.filename}</strong><small>{file.filename} · {file.is_public ? "Available to visitors" : "Private until a post is published"}</small></span></label>
            {track && <div className="playlist-track-fields"><input aria-label={`Track title for ${file.filename}`} value={track.title} onChange={(event) => updateTrack(file.id, { title: event.target.value })} placeholder="Track title" /><input aria-label={`Artist for ${file.filename}`} value={track.artist} onChange={(event) => updateTrack(file.id, { artist: event.target.value })} placeholder="Artist" /></div>}
          </div>;
        })}</div> : <div className="admin-empty"><p>No audio files in the library.</p><Link className="text-link" to="/admin/media">Upload audio in Media Library</Link></div>}
        {notice && <div className="save-notice"><Check size={14} /> {notice}</div>}
      </section>
    </div>}
  </div>;
}

function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const refresh = () => api<Category[]>("/categories").then(setCategories).catch((reason: Error) => setError(reason.message));
  useEffect(() => { refresh(); }, []);
  const add = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    try { await api("/admin/categories", { method: "POST", body: JSON.stringify({ name, description }) }); setName(""); setDescription(""); refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add category."); }
  };
  const remove = async (slug: string) => {
    if (!window.confirm("Remove this category? Posts will remain, but become uncategorized.")) return;
    try { await api(`/admin/categories/${slug}`, { method: "DELETE" }); refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove category."); }
  };
  return <div className="admin-section-page"><div className="admin-topline"><div><span className="eyebrow">Shape the shelves</span><h1>Categories</h1><p>Organize your archive into rooms that make sense to you.</p></div></div>{error && <div className="form-error">{error}</div>}
    <div className="category-admin-list">{categories.map((item) => <div key={item.slug}><span className="category-color" style={{ background: item.accent }} /><div><strong>{item.name}</strong><small>{item.description || item.slug} · {item.post_count ?? 0} entries</small></div><button onClick={() => remove(item.slug)} aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button></div>)}</div>
    <form className="add-category-form" onSubmit={add}><span className="eyebrow">Add a room</span><label>Name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></label><label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} /></label><button className="button-primary"><Plus size={15} /> Add category</button></form>
  </div>;
}

function SiteSettings() {
  const [settings, setSettings] = useState<Settings>({ site_title: "The Cyber Grimoire", secondary_title: "Grimoires d'une Data Scientiste" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api<Settings>("/admin/settings").then(setSettings).catch((reason: Error) => setError(reason.message)); }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    try { setSettings(await api<Settings>("/admin/settings", { method: "PUT", body: JSON.stringify(settings) })); setNotice("Your site identity has been saved."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save settings."); }
  };
  return <div className="admin-section-page"><div className="admin-topline"><div><span className="eyebrow">The name on the cover</span><h1>Site settings</h1><p>Keep the public identity the way you mean it.</p></div></div><form className="settings-form" onSubmit={save}><label>Public title<input value={settings.site_title} onChange={(e) => setSettings({ ...settings, site_title: e.target.value })} required maxLength={100} /></label><label>Secondary / colophon title<input value={settings.secondary_title} onChange={(e) => setSettings({ ...settings, secondary_title: e.target.value })} required maxLength={140} /></label><p>The secondary title is shown discreetly in the site's footer and About page.</p>{error && <div className="form-error">{error}</div>}{notice && <div className="save-notice"><Check size={14} /> {notice}</div>}<button className="button-primary"><Settings2 size={15} /> Save identity</button></form></div>;
}
