ALTER TABLE guide_content_images
    ADD COLUMN content_hash VARCHAR(64);

UPDATE guide_content_images
SET content_hash = md5(storage_key) || md5(id::text);

ALTER TABLE guide_content_images
    ALTER COLUMN content_hash SET NOT NULL;

ALTER TABLE guide_content_images
    DROP CONSTRAINT guide_content_images_storage_key_key;

CREATE INDEX idx_guide_content_images_hash
    ON guide_content_images(content_hash);

CREATE INDEX idx_guide_content_images_storage_key
    ON guide_content_images(storage_key);
