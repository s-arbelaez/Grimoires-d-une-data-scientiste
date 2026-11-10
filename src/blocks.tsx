import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { ArrowDown, BookOpen, Copy } from "lucide-react";
import type { PostBlock } from "./types";
import { Ornament } from "./components";

function Markdown({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeSanitize, rehypeKatex]}
    components={{
      pre: ({ children }) => <pre className="code-frame"><button className="copy-code" aria-label="Copy code" onClick={async () => {
        const code = (children as React.ReactElement<{ children?: string }>)?.props?.children;
        if (typeof code === "string") {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }
      }}>{copied ? "Copied" : <Copy size={14} />}</button>{children}</pre>,
      a: ({ href, children }) => <a href={href} target={href?.startsWith("/") ? undefined : "_blank"} rel={href?.startsWith("/") ? undefined : "noreferrer"}>{children}</a>,
    }}
  >{value}</ReactMarkdown>;
}

export function BlockRenderer({ block, preview = false, allBlocks = [] }: { block: PostBlock; preview?: boolean; allBlocks?: PostBlock[] }) {
  const mediaUrl = (id?: string) => id ? (preview ? `/api/admin/media/${id}/file` : `/api/media/${id}`) : "";
  const headings = allBlocks.filter((item) => item.type === "heading" || item.type === "subheading")
    .map((item) => item.text || "Untitled section");
  switch (block.type) {
    case "heading": return <h2 className="content-heading">{block.text || "Untitled section"}</h2>;
    case "subheading": return <h3 className="content-subheading">{block.text || "Subheading"}</h3>;
    case "paragraph":
    case "markdown": return <div className="prose"><Markdown value={block.text || block.content || ""} /></div>;
    case "quote": return <blockquote className="pull-quote"><p>{block.text || "A thought worth keeping."}</p>{block.caption && <cite>— {block.caption}</cite>}</blockquote>;
    case "image": return block.mediaId ? <figure className="media-figure"><img src={mediaUrl(block.mediaId)} alt={block.altText || ""} loading="lazy" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
      : <div className="media-placeholder">Upload an image to place it here</div>;
    case "gallery": return <div className="image-gallery">{(block.mediaIds || []).map((id) => <a key={id} href={mediaUrl(id)} target="_blank" rel="noreferrer"><img src={mediaUrl(id)} alt={block.altText || ""} loading="lazy" /></a>)}</div>;
    case "audio": return block.mediaId ? <figure className="inline-media"><audio controls preload="metadata" src={mediaUrl(block.mediaId)} /><figcaption>{block.caption || block.title || "Audio from the archive"}</figcaption></figure> : <div className="media-placeholder">Upload audio for this entry</div>;
    case "video": return block.mediaId ? <figure className="inline-media"><video controls preload="metadata" src={mediaUrl(block.mediaId)} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure> : <div className="media-placeholder">Upload a video for this entry</div>;
    case "file": return block.mediaId ? <a className="download-card" href={mediaUrl(block.mediaId)} target="_blank" rel="noreferrer"><BookOpen size={19} /><span>{block.title || block.caption || "Open attached document"}</span><ArrowDown size={16} /></a> : <div className="media-placeholder">Upload a document for this entry</div>;
    case "code": return <div className="code-frame"><div className="code-language">{block.language || "code"}</div><pre><code>{block.code || ""}</code></pre></div>;
    case "equation": return <div className="equation-frame"><span className="eyebrow">Expression</span><Markdown value={`$$\n${block.equation || "x = y"}\n$$`} /></div>;
    case "callout": return <aside className={`callout callout-${block.style || "lavender"}`}><span className="eyebrow">{block.title || "A note from the margin"}</span><p>{block.text || ""}</p></aside>;
    case "divider": return <div className="content-divider"><Ornament>✣</Ornament></div>;
    case "table": return <Markdown value={block.rows || "| Column | Column |\n| --- | --- |\n| Value | Value |"} />;
    case "toc": return <nav className="toc-block" aria-label="Contents"><span className="eyebrow">In this entry</span>{headings.length
      ? headings.map((heading, index) => <a href={`#${preview ? "preview-" : ""}section-${index}`} key={`${heading}-${index}`}>{heading}</a>)
      : <p>Add headings to generate this contents list.</p>}</nav>;
    case "spacer": return <div className="content-spacer" aria-hidden="true" />;
    default: return null;
  }
}
