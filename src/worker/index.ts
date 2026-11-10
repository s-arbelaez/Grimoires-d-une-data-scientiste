import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  COOKIE_SECURE?: string;
};

type Block = { type: string; [key: string]: unknown };
type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category_slug: string | null;
  status: "draft" | "published";
  layout: string;
  cover_media_id: string | null;
  content_text: string;
  featured: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

const app = new Hono<{ Bindings: Bindings }>();
const SESSION_COOKIE = "grimoire_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
const BLOCK_TYPES = new Set([
  "heading", "subheading", "paragraph", "markdown", "quote", "image",
  "gallery", "audio", "video", "file", "code", "equation", "callout",
  "divider", "table", "toc", "spacer",
]);
type AppContext = Context<{ Bindings: Bindings }>;

app.use("/api/*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header("Cache-Control", "no-store");
  await next();
});

function jsonError(c: AppContext, message: string, status = 400) {
  return c.json({ error: message }, status as ContentfulStatusCode);
}

function text(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equalConstantTime(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return mismatch === 0;
}

async function derivePassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 600_000 },
    key,
    256,
  );
  return hex(result);
}

const adminSession: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "Authentication required." }, 401);
  const tokenHash = await digest(token);
  const session = await c.env.DB.prepare(
    "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
  ).bind(tokenHash, new Date().toISOString()).first();
  if (!session) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "Authentication required." }, 401);
  }
  await next();
};

const sameOrigin: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const origin = c.req.header("Origin");
  const requestUrl = new URL(c.req.url);
  let localDevelopmentOrigin = false;
  if (origin && ["localhost", "127.0.0.1"].includes(requestUrl.hostname)) {
    try {
      const parsedOrigin = new URL(origin);
      localDevelopmentOrigin = parsedOrigin.protocol === requestUrl.protocol
        && ["localhost", "127.0.0.1"].includes(parsedOrigin.hostname);
    } catch { localDevelopmentOrigin = false; }
  }
  if (!origin || (origin !== requestUrl.origin && !localDevelopmentOrigin)) return c.json({ error: "Request origin was rejected." }, 403);
  await next();
};

async function readBlocks(db: D1Database, postId: string): Promise<Block[]> {
  const rows = await db.prepare(
    "SELECT data_json FROM post_blocks WHERE post_id = ? ORDER BY position ASC",
  ).bind(postId).all<{ data_json: string }>();
  return rows.results.map((row) => JSON.parse(row.data_json) as Block);
}

async function readTags(db: D1Database, postId: string): Promise<{ slug: string; name: string }[]> {
  const result = await db.prepare(
    "SELECT t.slug, t.name FROM tags t JOIN post_tags pt ON pt.tag_slug = t.slug WHERE pt.post_id = ? ORDER BY t.name",
  ).bind(postId).all<{ slug: string; name: string }>();
  return result.results;
}

async function readPost(db: D1Database, row: PostRow) {
  const [blocks, tags] = await Promise.all([readBlocks(db, row.id), readTags(db, row.id)]);
  return { ...row, featured: Boolean(row.featured), blocks, tags };
}

async function readPosts(db: D1Database, rows: PostRow[]) {
  if (!rows.length) return [];
  const placeholders = rows.map(() => "?").join(", ");
  const ids = rows.map((row) => row.id);
  const [blockRows, tagRows] = await Promise.all([
    db.prepare(`SELECT post_id, data_json FROM post_blocks WHERE post_id IN (${placeholders}) ORDER BY position ASC`)
      .bind(...ids).all<{ post_id: string; data_json: string }>(),
    db.prepare(`SELECT pt.post_id, t.slug, t.name FROM post_tags pt JOIN tags t ON t.slug = pt.tag_slug WHERE pt.post_id IN (${placeholders}) ORDER BY t.name`)
      .bind(...ids).all<{ post_id: string; slug: string; name: string }>(),
  ]);
  const blocksByPost = new Map<string, Block[]>();
  const tagsByPost = new Map<string, { slug: string; name: string }[]>();
  for (const row of blockRows.results) {
    const blocks = blocksByPost.get(row.post_id) ?? [];
    blocks.push(JSON.parse(row.data_json) as Block);
    blocksByPost.set(row.post_id, blocks);
  }
  for (const row of tagRows.results) {
    const tags = tagsByPost.get(row.post_id) ?? [];
    tags.push({ slug: row.slug, name: row.name });
    tagsByPost.set(row.post_id, tags);
  }
  return rows.map((row) => ({
    ...row,
    featured: Boolean(row.featured),
    blocks: blocksByPost.get(row.id) ?? [],
    tags: tagsByPost.get(row.id) ?? [],
  }));
}

function collectMediaIds(blocks: Block[], coverId: unknown): string[] {
  const ids = new Set<string>();
  if (typeof coverId === "string" && coverId) ids.add(coverId);
  for (const block of blocks) {
    if (typeof block.mediaId === "string") ids.add(block.mediaId);
    if (Array.isArray(block.mediaIds)) {
      for (const id of block.mediaIds) if (typeof id === "string") ids.add(id);
    }
  }
  return [...ids];
}

function blockText(blocks: Block[]): string {
  return blocks.map((block) =>
    [block.text, block.content, block.caption, block.title, block.code, block.equation]
      .filter((value): value is string => typeof value === "string").join(" "),
  ).join(" ").replace(/\s+/g, " ").slice(0, 100_000);
}

function validateBlocks(value: unknown): Block[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const blocks: Block[] = [];
  let totalSize = 0;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const block = item as Block;
    if (typeof block.type !== "string" || !BLOCK_TYPES.has(block.type)) return null;
    const serialized = JSON.stringify(block);
    if (serialized.length > 100_000) return null;
    totalSize += serialized.length;
    if (totalSize > 500_000) return null;
    blocks.push(block);
  }
  return blocks;
}

async function savePost(c: AppContext, existing?: PostRow) {
  const contentLength = Number(c.req.header("Content-Length") || 0);
  if (contentLength > 800_000) return jsonError(c, "The entry is larger than the 800 KB content limit.", 413);
  let parsed: unknown;
  try {
    parsed = await c.req.json();
  } catch {
    return jsonError(c, "A JSON request body is required.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError(c, "A JSON object is required.");
  const body = parsed as Record<string, unknown>;
  const title = text(body.title, 180);
  const excerpt = text(body.excerpt, 500);
  const blocks = validateBlocks(body.blocks);
  const requestedStatus = body.status === "published" ? "published" : "draft";
  const category = text(body.category_slug, 100) || null;
  const layout = ["single", "split", "wide"].includes(String(body.layout)) ? String(body.layout) : "single";
  const requestedSlug = slugify(text(body.slug, 180) || title);
  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => text(tag, 60)).filter(Boolean))].slice(0, 20)
    : [];
  if (!title || !blocks || !requestedSlug) return jsonError(c, "Title, a valid slug, and a valid block list are required.");
  if (category && !await c.env.DB.prepare("SELECT slug FROM categories WHERE slug = ?").bind(category).first()) {
    return jsonError(c, "Choose an existing category.");
  }

  const slugTaken = await c.env.DB.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?")
    .bind(requestedSlug, existing?.id ?? "").first();
  if (slugTaken) return jsonError(c, "That URL slug is already in use.", 409);

  const id = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const coverId = typeof body.cover_media_id === "string" ? body.cover_media_id : null;
  const publishedAt = requestedStatus === "published" ? existing?.published_at ?? now : null;
  const statements: D1PreparedStatement[] = [];

  if (existing) {
    statements.push(c.env.DB.prepare(
      `UPDATE posts SET slug = ?, title = ?, excerpt = ?, category_slug = ?, status = ?, layout = ?,
       cover_media_id = ?, content_text = ?, featured = ?, updated_at = ?, published_at = ? WHERE id = ?`,
    ).bind(requestedSlug, title, excerpt, category, requestedStatus, layout, coverId, blockText(blocks),
      body.featured === true ? 1 : 0, now, publishedAt, id));
    statements.push(c.env.DB.prepare("DELETE FROM post_blocks WHERE post_id = ?").bind(id));
    statements.push(c.env.DB.prepare("DELETE FROM post_tags WHERE post_id = ?").bind(id));
    statements.push(c.env.DB.prepare("DELETE FROM post_media WHERE post_id = ?").bind(id));
  } else {
    statements.push(c.env.DB.prepare(
      `INSERT INTO posts (id, slug, title, excerpt, category_slug, status, layout, cover_media_id,
       content_text, featured, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, requestedSlug, title, excerpt, category, requestedStatus, layout, coverId, blockText(blocks),
      body.featured === true ? 1 : 0, now, now, publishedAt));
  }

  blocks.forEach((block, position) => {
    statements.push(c.env.DB.prepare(
      "INSERT INTO post_blocks (post_id, position, type, data_json) VALUES (?, ?, ?, ?)",
    ).bind(id, position, block.type, JSON.stringify(block)));
  });
  for (const name of tags) {
    const tagSlug = slugify(name);
    if (!tagSlug) continue;
    statements.push(c.env.DB.prepare("INSERT OR IGNORE INTO tags (slug, name) VALUES (?, ?)").bind(tagSlug, name));
    statements.push(c.env.DB.prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_slug) VALUES (?, ?)").bind(id, tagSlug));
  }
  for (const mediaId of collectMediaIds(blocks, coverId)) {
    statements.push(c.env.DB.prepare("INSERT OR IGNORE INTO post_media (post_id, media_id) VALUES (?, ?)").bind(id, mediaId));
  }
  await c.env.DB.batch(statements);
  await c.env.DB.prepare(
    `UPDATE media SET is_public = CASE WHEN EXISTS (
      SELECT 1 FROM post_media pm JOIN posts p ON p.id = pm.post_id
      WHERE pm.media_id = media.id AND p.status = 'published'
    ) THEN 1 ELSE 0 END`,
  ).run();
  const saved = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<PostRow>();
  if (!saved) return jsonError(c, "The post could not be saved.", 500);
  return c.json(await readPost(c.env.DB, saved), existing ? 200 : 201);
}

function sniff(bytes: Uint8Array): { mime: string; kind: string } | null {
  const starts = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (starts(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", kind: "image" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: "image/png", kind: "image" };
  if (ascii(0, 3) === "GIF") return { mime: "image/gif", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { mime: "image/webp", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return { mime: "audio/wav", kind: "audio" };
  if (ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return { mime: "audio/mpeg", kind: "audio" };
  if (ascii(0, 4) === "OggS") return { mime: "audio/ogg", kind: "audio" };
  if (ascii(4, 4) === "ftyp") return { mime: "video/mp4", kind: "video" };
  if (ascii(0, 5) === "%PDF-") return { mime: "application/pdf", kind: "file" };
  return null;
}

app.get("/api/health", (c) => c.json({ ok: true, service: "the-cyber-grimoire" }));

app.get("/sitemap.xml", async (c) => {
  const result = await c.env.DB.prepare("SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC").all<{ slug: string; updated_at: string }>();
  const origin = new URL(c.req.url).origin;
  const staticPages = ["", "/archive", "/music", "/about"];
  const entries = [
    ...staticPages.map((path) => `<url><loc>${origin}${path}</loc></url>`),
    ...result.results.map((post) => `<url><loc>${origin}/post/${encodeURIComponent(post.slug)}</loc><lastmod>${post.updated_at}</lastmod></url>`),
  ];
  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`);
});

app.get("/robots.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.text(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${new URL(c.req.url).origin}/sitemap.xml\n`);
});

app.get("/api/settings", async (c) => {
  const result = await c.env.DB.prepare("SELECT key, value FROM site_settings").all<{ key: string; value: string }>();
  return c.json(Object.fromEntries(result.results.map((setting) => [setting.key, setting.value])));
});

app.post("/api/admin/login", sameOrigin, async (c) => {
  const username = text(c.req.header("CF-Connecting-IP") || "local", 80);
  const now = new Date();
  const since = new Date(now.getTime() - 15 * 60_000).toISOString();
  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM login_attempts WHERE ip = ? AND attempted_at > ?",
  ).bind(username, since).first<{ count: number }>();
  if ((count?.count ?? 0) >= 8) return jsonError(c, "Too many attempts. Try again in fifteen minutes.", 429);

  const parsed = await c.req.json().catch(() => ({})) as unknown;
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const configuredUser = c.env.ADMIN_USERNAME;
  const configuredPassword = c.env.ADMIN_PASSWORD;
  const suppliedUser = text(body.username, 120);
  const suppliedPassword = typeof body.password === "string" ? body.password : "";
  const validConfiguration = Boolean(configuredUser && configuredPassword);
  const salt = configuredUser ?? "unconfigured-admin";
  const expected = validConfiguration ? await derivePassword(configuredPassword!, salt) : "";
  const actual = await derivePassword(suppliedPassword.slice(0, 1024), salt);
  const valid = validConfiguration && equalConstantTime(suppliedUser, configuredUser!) && equalConstantTime(actual, expected);

  if (!valid) {
    await c.env.DB.prepare("INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)")
      .bind(username, now.toISOString()).run();
    return jsonError(c, validConfiguration ? "The username or password was not recognized." : "Admin credentials are not configured.", validConfiguration ? 401 : 503);
  }

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(username),
    c.env.DB.prepare("INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)")
      .bind(await digest(token), expiresAt, now.toISOString()),
  ]);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: c.env.COOKIE_SECURE !== "false",
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return c.json({ authenticated: true, expiresAt });
});

app.post("/api/admin/logout", sameOrigin, adminSession, async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await digest(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: c.env.COOKIE_SECURE !== "false", sameSite: "Strict" });
  return c.json({ authenticated: false });
});

app.get("/api/admin/me", adminSession, (c) => c.json({ authenticated: true }));

app.get("/api/categories", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT c.slug, c.name, c.description, c.accent, COUNT(p.id) AS post_count
     FROM categories c LEFT JOIN posts p ON p.category_slug = c.slug AND p.status = 'published'
     GROUP BY c.slug ORDER BY c.sort_order, c.name`,
  ).all();
  return c.json(result.results);
});

app.get("/api/tags", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT t.slug, t.name, COUNT(pt.post_id) AS post_count FROM tags t
     JOIN post_tags pt ON pt.tag_slug = t.slug JOIN posts p ON p.id = pt.post_id AND p.status = 'published'
     GROUP BY t.slug ORDER BY t.name`,
  ).all();
  return c.json(result.results);
});

app.get("/api/posts", async (c) => {
  const params = c.req.query();
  const where = ["p.status = 'published'"];
  const values: (string | number)[] = [];
  const search = text(params.search, 150);
  if (search) {
    where.push("instr(lower(p.title || ' ' || p.excerpt || ' ' || p.content_text), lower(?)) > 0");
    values.push(search);
  }
  if (params.category) { where.push("p.category_slug = ?"); values.push(text(params.category, 100)); }
  if (params.tag) {
    where.push("EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_slug = ?)");
    values.push(text(params.tag, 100));
  }
  if (params.type && BLOCK_TYPES.has(params.type)) {
    where.push("EXISTS (SELECT 1 FROM post_blocks pb WHERE pb.post_id = p.id AND pb.type = ?)");
    values.push(params.type);
  }
  if (params.from) { where.push("date(p.published_at) >= date(?)"); values.push(params.from.slice(0, 10)); }
  if (params.to) { where.push("date(p.published_at) <= date(?)"); values.push(params.to.slice(0, 10)); }
  const sort = params.sort === "oldest" ? "p.published_at ASC" : params.sort === "featured"
    ? "p.featured DESC, p.published_at DESC" : "p.published_at DESC";
  const page = Math.max(1, Math.min(10_000, Number(params.page) || 1));
  const limit = Math.max(1, Math.min(24, Number(params.limit) || 12));
  const filter = where.join(" AND ");
  const [postsResult, countResult] = await Promise.all([
    c.env.DB.prepare(`SELECT p.* FROM posts p WHERE ${filter} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .bind(...values, limit, (page - 1) * limit).all<PostRow>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM posts p WHERE ${filter}`).bind(...values).first<{ total: number }>(),
  ]);
  const posts = await readPosts(c.env.DB, postsResult.results);
  return c.json({ posts, total: countResult?.total ?? 0, page, pages: Math.ceil((countResult?.total ?? 0) / limit) });
});

app.get("/api/posts/:slug", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'")
    .bind(c.req.param("slug")).first<PostRow>();
  if (!row) return jsonError(c, "Entry not found.", 404);
  const post = await readPost(c.env.DB, row);
  const relatedRows = await c.env.DB.prepare(
    `SELECT DISTINCT p.* FROM posts p JOIN post_tags pt ON pt.post_id = p.id
     WHERE p.status = 'published' AND pt.tag_slug IN (SELECT tag_slug FROM post_tags WHERE post_id = ?)
     AND p.id != ? ORDER BY p.published_at DESC LIMIT 3`,
  ).bind(row.id, row.id).all<PostRow>();
  const related = await readPosts(c.env.DB, relatedRows.results);
  return c.json({ post, related });
});

app.get("/api/random", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT slug FROM posts WHERE status = 'published' ORDER BY RANDOM() LIMIT 1",
  ).first<{ slug: string }>();
  return row ? c.json({ slug: row.slug }) : jsonError(c, "The archive is empty.", 404);
});

app.get("/api/music", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT DISTINCT m.id, m.filename, m.mime_type, m.alt_text, m.uploaded_at,
      COALESCE(NULLIF(pt.title, ''), NULLIF(m.caption, ''), m.filename) AS caption,
      COALESCE(pt.artist, '') AS artist, pl.title AS playlist
     FROM playlist_tracks pt JOIN playlists pl ON pl.id = pt.playlist_id
     JOIN media m ON m.id = pt.media_id
     WHERE m.is_public = 1 AND m.mime_type LIKE 'audio/%'
     ORDER BY pl.sort_order, pt.position`,
  ).all();
  return c.json({ title: "The Listening Room", tracks: result.results.map((track) => ({ ...track, url: `/api/media/${track.id}` })) });
});

app.get("/api/media/:id", async (c) => {
  const metadata = await c.env.DB.prepare(
    "SELECT object_key, mime_type, filename, size_bytes FROM media WHERE id = ? AND is_public = 1",
  ).bind(c.req.param("id")).first<{ object_key: string; mime_type: string; filename: string; size_bytes: number }>();
  if (!metadata) return jsonError(c, "Media not found.", 404);
  const object = await c.env.MEDIA.get(metadata.object_key);
  if (!object) return jsonError(c, "Media file not found.", 404);
  c.header("Content-Type", metadata.mime_type);
  c.header("Content-Length", String(metadata.size_bytes));
  c.header("Content-Disposition", `inline; filename="${metadata.filename.replace(/["\\\r\n]/g, "_")}"`);
  c.header("Cache-Control", "public, max-age=86400, immutable");
  return c.body(object.body);
});

app.get("/api/admin/posts", adminSession, async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM posts ORDER BY updated_at DESC LIMIT 100").all<PostRow>();
  return c.json(await readPosts(c.env.DB, result.results));
});

app.post("/api/admin/posts", sameOrigin, adminSession, (c) => savePost(c));

app.put("/api/admin/posts/:id", sameOrigin, adminSession, async (c) => {
  const existing = await c.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(c.req.param("id")).first<PostRow>();
  if (!existing) return jsonError(c, "Entry not found.", 404);
  return savePost(c, existing);
});

app.delete("/api/admin/posts/:id", sameOrigin, adminSession, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  await c.env.DB.prepare(
    `UPDATE media SET is_public = CASE WHEN EXISTS (
      SELECT 1 FROM post_media pm JOIN posts p ON p.id = pm.post_id
      WHERE pm.media_id = media.id AND p.status = 'published'
    ) THEN 1 ELSE 0 END`,
  ).run();
  return c.json({ deleted: true });
});

app.get("/api/admin/media", adminSession, async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT id, filename, mime_type, size_bytes, alt_text, caption, uploaded_at, is_public FROM media ORDER BY uploaded_at DESC LIMIT 100",
  ).all();
  return c.json(result.results);
});

app.post("/api/admin/media", sameOrigin, adminSession, async (c) => {
  const declaredLength = Number(c.req.header("Content-Length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 100_000) return jsonError(c, "This file exceeds the 24 MB upload limit.", 413);
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File) || file.size === 0) return jsonError(c, "Choose a file to upload.");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError(c, "This file exceeds the 24 MB upload limit.", 413);
  const buffer = await file.arrayBuffer();
  const detected = sniff(new Uint8Array(buffer));
  if (!detected) return jsonError(c, "This file type is not supported. Use an image, MP3/WAV/OGG, MP4, or PDF.");
  const id = crypto.randomUUID();
  const objectKey = `${id}/${crypto.randomUUID()}`;
  const filename = text(file.name, 140).replace(/[\/\\\r\n"]/g, "_") || `upload-${id}`;
  const altText = text(body.alt_text, 300);
  const caption = text(body.caption, 500);
  await c.env.MEDIA.put(objectKey, buffer, { httpMetadata: { contentType: detected.mime } });
  try {
    const statements = [c.env.DB.prepare(
      `INSERT INTO media (id, object_key, filename, mime_type, size_bytes, alt_text, caption, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, objectKey, filename, detected.mime, file.size, altText, caption, new Date().toISOString())];
    if (detected.kind === "audio") {
      const title = filename.replace(/\.[^.]+$/, "");
      statements.push(c.env.DB.prepare(
        `INSERT INTO playlist_tracks (playlist_id, position, media_id, title, artist)
         SELECT 'listening-room', COALESCE(MAX(position), 0) + 1, ?, ?, ''
         FROM playlist_tracks WHERE playlist_id = 'listening-room'`,
      ).bind(id, title));
    }
    await c.env.DB.batch(statements);
  } catch (error) {
    await c.env.MEDIA.delete(objectKey);
    throw error;
  }
  return c.json({
    id, filename, mime_type: detected.mime, kind: detected.kind, size_bytes: file.size, alt_text: altText,
    caption, url: `/api/admin/media/${id}/file`,
  }, 201);
});

app.get("/api/admin/media/:id/file", adminSession, async (c) => {
  const metadata = await c.env.DB.prepare(
    "SELECT object_key, mime_type, filename FROM media WHERE id = ?",
  ).bind(c.req.param("id")).first<{ object_key: string; mime_type: string; filename: string }>();
  if (!metadata) return jsonError(c, "Media not found.", 404);
  const object = await c.env.MEDIA.get(metadata.object_key);
  if (!object) return jsonError(c, "Media file not found.", 404);
  c.header("Content-Type", metadata.mime_type);
  c.header("Content-Disposition", `inline; filename="${metadata.filename.replace(/["\\\r\n]/g, "_")}"`);
  c.header("Cache-Control", "private, no-store");
  return c.body(object.body);
});

app.delete("/api/admin/media/:id", sameOrigin, adminSession, async (c) => {
  const media = await c.env.DB.prepare("SELECT object_key FROM media WHERE id = ?")
    .bind(c.req.param("id")).first<{ object_key: string }>();
  if (!media) return jsonError(c, "Media not found.", 404);
  const used = await c.env.DB.prepare("SELECT post_id FROM post_media WHERE media_id = ? LIMIT 1")
    .bind(c.req.param("id")).first();
  if (used) return jsonError(c, "Remove this file from its entries before deleting it.", 409);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM playlist_tracks WHERE media_id = ?").bind(c.req.param("id")),
    c.env.DB.prepare("DELETE FROM media WHERE id = ?").bind(c.req.param("id")),
  ]);
  await c.env.MEDIA.delete(media.object_key);
  return c.json({ deleted: true });
});

app.get("/api/admin/categories", adminSession, async (c) => {
  const categories = await c.env.DB.prepare("SELECT slug, name FROM categories ORDER BY sort_order, name").all();
  return c.json(categories.results);
});

app.post("/api/admin/categories", sameOrigin, adminSession, async (c) => {
  const parsed = await c.req.json().catch(() => ({})) as unknown;
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const name = text(body.name, 80);
  const slug = slugify(text(body.slug, 100) || name);
  const description = text(body.description, 240);
  const accent = /^#[0-9a-f]{6}$/i.test(text(body.accent, 7)) ? text(body.accent, 7) : "#a98bd1";
  if (!name || !slug) return jsonError(c, "A category name is required.");
  if (await c.env.DB.prepare("SELECT slug FROM categories WHERE slug = ?").bind(slug).first()) {
    return jsonError(c, "A category with that name already exists.", 409);
  }
  await c.env.DB.prepare(
    "INSERT INTO categories (slug, name, description, accent, sort_order) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))",
  ).bind(slug, name, description, accent).run();
  return c.json({ slug, name, description, accent }, 201);
});

app.delete("/api/admin/categories/:slug", sameOrigin, adminSession, async (c) => {
  const slug = c.req.param("slug");
  await c.env.DB.prepare("UPDATE posts SET category_slug = NULL WHERE category_slug = ?").bind(slug).run();
  await c.env.DB.prepare("DELETE FROM categories WHERE slug = ?").bind(slug).run();
  return c.json({ deleted: true });
});

app.get("/api/admin/settings", adminSession, async (c) => {
  const result = await c.env.DB.prepare("SELECT key, value FROM site_settings").all<{ key: string; value: string }>();
  return c.json(Object.fromEntries(result.results.map((setting) => [setting.key, setting.value])));
});

app.get("/api/admin/playlists", adminSession, async (c) => {
  const [playlists, tracks, media] = await Promise.all([
    c.env.DB.prepare("SELECT id, title, description, sort_order FROM playlists ORDER BY sort_order, title").all<{ id: string; title: string; description: string; sort_order: number }>(),
    c.env.DB.prepare(
      `SELECT pt.playlist_id, pt.position, pt.media_id, pt.title, pt.artist, m.filename, m.is_public
       FROM playlist_tracks pt JOIN media m ON m.id = pt.media_id
       ORDER BY pt.playlist_id, pt.position`,
    ).all<{ playlist_id: string; position: number; media_id: string; title: string; artist: string; filename: string; is_public: number }>(),
    c.env.DB.prepare(
      "SELECT id, filename, caption, mime_type, is_public FROM media WHERE mime_type LIKE 'audio/%' ORDER BY uploaded_at DESC",
    ).all<{ id: string; filename: string; caption: string; mime_type: string; is_public: number }>(),
  ]);
  return c.json({
    playlists: playlists.results.map((playlist) => ({
      ...playlist,
      tracks: tracks.results.filter((track) => track.playlist_id === playlist.id),
    })),
    media: media.results,
  });
});

app.post("/api/admin/playlists", sameOrigin, adminSession, async (c) => {
  const parsed = await c.req.json().catch(() => ({})) as unknown;
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const title = text(body.title, 100);
  const description = text(body.description, 300);
  if (!title) return jsonError(c, "A playlist title is required.");
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO playlists (id, title, description, sort_order) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM playlists))",
  ).bind(id, title, description).run();
  return c.json({ id, title, description, sort_order: 0, tracks: [] }, 201);
});

app.put("/api/admin/playlists/:id", sameOrigin, adminSession, async (c) => {
  const id = c.req.param("id");
  const parsed = await c.req.json().catch(() => ({})) as unknown;
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const title = text(body.title, 100);
  const description = text(body.description, 300);
  if (!title) return jsonError(c, "A playlist title is required.");
  if (!await c.env.DB.prepare("SELECT id FROM playlists WHERE id = ?").bind(id).first()) return jsonError(c, "Playlist not found.", 404);
  if (!Array.isArray(body.tracks) || body.tracks.length > 100) return jsonError(c, "Provide at most 100 playlist tracks.");
  const selected: Record<string, unknown>[] = [];
  for (const item of body.tracks) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof (item as Record<string, unknown>).media_id !== "string") {
      return jsonError(c, "Each playlist track must identify an audio file.");
    }
    selected.push(item as Record<string, unknown>);
  }
  const mediaIds = [...new Set(selected.map((item) => text(item.media_id, 80)).filter(Boolean))];
  if (mediaIds.length !== selected.length) return jsonError(c, "Playlist tracks must refer to distinct audio files.");
  if (mediaIds.length) {
    const placeholders = mediaIds.map(() => "?").join(", ");
    const found = await c.env.DB.prepare(
      `SELECT id FROM media WHERE mime_type LIKE 'audio/%' AND id IN (${placeholders})`,
    ).bind(...mediaIds).all<{ id: string }>();
    if (found.results.length !== mediaIds.length) return jsonError(c, "A selected playlist track is not an audio file.");
  }
  const statements = [
    c.env.DB.prepare("UPDATE playlists SET title = ?, description = ? WHERE id = ?").bind(title, description, id),
    c.env.DB.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?").bind(id),
  ];
  selected.forEach((track, position) => {
    const mediaId = text(track.media_id, 80);
    statements.push(c.env.DB.prepare(
      "INSERT INTO playlist_tracks (playlist_id, position, media_id, title, artist) VALUES (?, ?, ?, ?, ?)",
    ).bind(id, position, mediaId, text(track.title, 120), text(track.artist, 120)));
  });
  await c.env.DB.batch(statements);
  return c.json({ saved: true });
});

app.delete("/api/admin/playlists/:id", sameOrigin, adminSession, async (c) => {
  const id = c.req.param("id");
  if (id === "listening-room") return jsonError(c, "The default Listening Room cannot be deleted.", 409);
  await c.env.DB.prepare("DELETE FROM playlists WHERE id = ?").bind(id).run();
  return c.json({ deleted: true });
});

app.put("/api/admin/settings", sameOrigin, adminSession, async (c) => {
  const parsed = await c.req.json().catch(() => ({})) as unknown;
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  const title = text(body.site_title, 100);
  const secondary = text(body.secondary_title, 140);
  if (!title || !secondary) return jsonError(c, "Both site titles are required.");
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('site_title', ?)").bind(title),
    c.env.DB.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('secondary_title', ?)").bind(secondary),
  ]);
  return c.json({ site_title: title, secondary_title: secondary });
});

app.notFound((c) => c.req.path.startsWith("/api/")
  ? c.json({ error: "Not found." }, 404)
  : c.env.ASSETS.fetch(c.req.raw));

app.onError((error, c) => {
  console.error("Request failed", error);
  return c.json({ error: "The request could not be completed." }, 500);
});

export default app;
