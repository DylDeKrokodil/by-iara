CREATE TABLE guide_content_images (
    id UUID PRIMARY KEY,
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    content_type VARCHAR(32) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_guide_content_images_guide ON guide_content_images(guide_id);
