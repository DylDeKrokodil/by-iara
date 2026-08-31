export type GuideStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type GuideBlockType =
  | 'PARAGRAPH'
  | 'HEADING'
  | 'IMAGE'
  | 'LIST'
  | 'QUOTE'
  | 'CALL_TO_ACTION';
export type GuideImageType = 'COVER' | 'SOCIAL';
export type GuideLocale = 'pt-PT' | 'en-US';
export type GuideSort = 'UPDATED_AT' | 'PUBLISHED_AT' | 'TITLE' | 'STATUS';
export type GuideSortDirection = 'ASC' | 'DESC';

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

export interface GuideContentImage {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface Guide {
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

export interface GuideInput {
  status: GuideStatus;
  author: string;
  publishedAt: string | null;
  translations: Record<GuideLocale, GuideTranslation>;
  categories: string[];
  tags: string[];
  relatedServiceIds: string[];
}

export interface GuideListParams {
  status?: GuideStatus;
  query?: string;
  sort?: GuideSort;
  direction?: GuideSortDirection;
}

export const GUIDE_STATUS_OPTIONS: ReadonlyArray<{
  label: string;
  value: GuideStatus;
}> = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export function guideStatusLabel(status: GuideStatus): string {
  return (
    GUIDE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}
