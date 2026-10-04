/** Guide content and image contracts shared by the admin and public apps. */
export type GuideBlockType =
  | 'RICH_TEXT'
  | 'PARAGRAPH'
  | 'HEADING'
  | 'IMAGE'
  | 'LIST'
  | 'QUOTE'
  | 'CALL_TO_ACTION';

export type GuideImageType = 'COVER' | 'SOCIAL';
export type GuideLocale = 'pt-PT' | 'en-US';
export type GuideStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface GuideBlock {
  type: GuideBlockType;
  text?: string;
  headingLevel?: number;
  items?: string[];
  imageUrl?: string;
  imageAlt?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideTranslation {
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  blocks: GuideBlock[];
  faqs: GuideFaq[];
}

export interface GuideImage {
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface GuideRecord {
  id: string;
  status: GuideStatus;
  author: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  translations: Record<GuideLocale, GuideTranslation>;
  categories: string[];
  tags: string[];
  relatedServiceIds: string[];
  images: Partial<Record<GuideImageType, GuideImage>>;
}
