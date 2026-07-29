CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    content_type VARCHAR(32) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO media_assets (id, content_hash, content_type, width, height, byte_size, storage_key, created_at)
SELECT
    min(id::text)::uuid,
    content_hash,
    min(content_type),
    min(width),
    min(height),
    min(byte_size),
    min(storage_key),
    min(created_at)
FROM guide_content_images
GROUP BY content_hash;

INSERT INTO media_assets (id, content_hash, content_type, width, height, byte_size, storage_key, created_at)
SELECT
    gen_random_uuid(),
    md5(storage_key) || md5(storage_key || service_id::text),
    content_type,
    width,
    height,
    byte_size,
    storage_key,
    updated_at
FROM service_images
ON CONFLICT (storage_key) DO NOTHING;

INSERT INTO media_assets (id, content_hash, content_type, width, height, byte_size, storage_key, created_at)
SELECT
    gen_random_uuid(),
    md5(storage_key) || md5(storage_key || guide_id::text || image_type),
    content_type,
    width,
    height,
    byte_size,
    storage_key,
    updated_at
FROM guide_images
ON CONFLICT (storage_key) DO NOTHING;

ALTER TABLE service_images ADD COLUMN media_asset_id UUID;
ALTER TABLE guide_images ADD COLUMN media_asset_id UUID;
ALTER TABLE guide_content_images ADD COLUMN media_asset_id UUID;

UPDATE service_images reference
SET media_asset_id = asset.id
FROM media_assets asset
WHERE asset.storage_key = reference.storage_key;

UPDATE guide_images reference
SET media_asset_id = asset.id
FROM media_assets asset
WHERE asset.storage_key = reference.storage_key;

UPDATE guide_content_images reference
SET media_asset_id = asset.id
FROM media_assets asset
WHERE asset.storage_key = reference.storage_key;

ALTER TABLE service_images
    ALTER COLUMN media_asset_id SET NOT NULL,
    ADD CONSTRAINT service_images_media_asset_fk
        FOREIGN KEY (media_asset_id) REFERENCES media_assets(id);

ALTER TABLE guide_images
    ALTER COLUMN media_asset_id SET NOT NULL,
    ADD CONSTRAINT guide_images_media_asset_fk
        FOREIGN KEY (media_asset_id) REFERENCES media_assets(id);

ALTER TABLE guide_content_images
    ALTER COLUMN media_asset_id SET NOT NULL,
    ADD CONSTRAINT guide_content_images_media_asset_fk
        FOREIGN KEY (media_asset_id) REFERENCES media_assets(id);

ALTER TABLE service_images DROP CONSTRAINT service_images_storage_key_key;
ALTER TABLE guide_images DROP CONSTRAINT guide_images_storage_key_key;

CREATE INDEX idx_service_images_media_asset ON service_images(media_asset_id);
CREATE INDEX idx_guide_images_media_asset ON guide_images(media_asset_id);
CREATE INDEX idx_guide_content_images_media_asset ON guide_content_images(media_asset_id);
