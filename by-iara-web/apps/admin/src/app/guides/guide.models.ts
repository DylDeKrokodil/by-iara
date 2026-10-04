import type {
  GuideLocale,
  GuideRecord,
  GuideStatus,
  GuideTranslation,
} from '@by-iara/guide-models';

export type {
  GuideBlock,
  GuideBlockType,
  GuideFaq,
  GuideImage,
  GuideImageType,
  GuideLocale,
  GuideRecord,
  GuideStatus,
  GuideTranslation,
} from '@by-iara/guide-models';

export type GuideSort = 'UPDATED_AT' | 'PUBLISHED_AT' | 'TITLE' | 'STATUS';
export type GuideSortDirection = 'ASC' | 'DESC';

export interface GuideContentImage {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

export type Guide = GuideRecord;

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
