CREATE TABLE service_images (
    service_id UUID PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
    content_type VARCHAR(32) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
