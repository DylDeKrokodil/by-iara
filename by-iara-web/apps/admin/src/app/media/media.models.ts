export type MediaUsageType = 'SERVICE' | 'GUIDE_IMAGE' | 'GUIDE_CONTENT';

export interface MediaAsset {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
  usageCount: number;
  usageTypes: MediaUsageType[];
  createdAt: string;
}

export interface MediaAssetView extends MediaAsset {
  previewUrl: string | null;
}
