export type BlockType =
  | "heading" | "subheading" | "paragraph" | "markdown" | "quote" | "image"
  | "gallery" | "audio" | "video" | "file" | "code" | "equation" | "callout"
  | "divider" | "table" | "toc" | "spacer";

export type PostBlock = {
  id: string;
  type: BlockType;
  text?: string;
  content?: string;
  caption?: string;
  title?: string;
  code?: string;
  language?: string;
  equation?: string;
  mediaId?: string;
  mediaIds?: string[];
  altText?: string;
  url?: string;
  style?: string;
  rows?: string;
};

export type Tag = { slug: string; name: string };
export type Category = { slug: string; name: string; description?: string; accent?: string; post_count?: number };
export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category_slug: string | null;
  status: "draft" | "published";
  layout: string;
  cover_media_id: string | null;
  content_text: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  blocks: PostBlock[];
  tags: Tag[];
};
export type Track = {
  id: string;
  filename: string;
  mime_type: string;
  alt_text: string;
  caption: string;
  url: string;
  artist?: string;
  playlist?: string;
};
export type PostPageData = { post: Post; related: Post[] };
export type PostListData = { posts: Post[]; total: number; page: number; pages: number };
