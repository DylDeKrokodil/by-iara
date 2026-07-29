ALTER TABLE media_assets
    ADD COLUMN hash_verified BOOLEAN NOT NULL DEFAULT true;

UPDATE media_assets
SET hash_verified = false;

CREATE INDEX idx_media_assets_unverified
    ON media_assets(hash_verified)
    WHERE hash_verified = false;
