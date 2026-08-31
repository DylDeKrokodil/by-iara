CREATE TABLE guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    author VARCHAR(160) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT guides_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE TABLE guide_translations (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    title VARCHAR(180) NOT NULL,
    excerpt TEXT NOT NULL,
    seo_title VARCHAR(180) NOT NULL,
    meta_description VARCHAR(320) NOT NULL,
    PRIMARY KEY (guide_id, locale),
    CONSTRAINT guide_translations_locale_valid CHECK (locale IN ('pt-PT', 'en-US')),
    CONSTRAINT guide_translations_slug_unique UNIQUE (locale, slug)
);

CREATE TABLE guide_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL,
    locale VARCHAR(10) NOT NULL,
    block_type VARCHAR(30) NOT NULL,
    sort_order INTEGER NOT NULL,
    text_content TEXT,
    heading_level INTEGER,
    image_url VARCHAR(1000),
    image_alt VARCHAR(300),
    action_label VARCHAR(160),
    action_url VARCHAR(1000),
    CONSTRAINT guide_blocks_translation_fk
        FOREIGN KEY (guide_id, locale)
        REFERENCES guide_translations(guide_id, locale)
        ON DELETE CASCADE,
    CONSTRAINT guide_blocks_type_valid
        CHECK (block_type IN ('PARAGRAPH', 'HEADING', 'IMAGE', 'LIST', 'QUOTE', 'CALL_TO_ACTION')),
    CONSTRAINT guide_blocks_heading_level_valid
        CHECK (heading_level IS NULL OR heading_level IN (2, 3, 4)),
    CONSTRAINT guide_blocks_order_unique UNIQUE (guide_id, locale, sort_order)
);

CREATE TABLE guide_block_items (
    block_id UUID NOT NULL REFERENCES guide_blocks(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    PRIMARY KEY (block_id, sort_order)
);

CREATE TABLE guide_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL,
    locale VARCHAR(10) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    CONSTRAINT guide_faqs_translation_fk
        FOREIGN KEY (guide_id, locale)
        REFERENCES guide_translations(guide_id, locale)
        ON DELETE CASCADE,
    CONSTRAINT guide_faqs_order_unique UNIQUE (guide_id, locale, sort_order)
);

CREATE TABLE guide_categories (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (guide_id, name)
);

CREATE TABLE guide_tags (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (guide_id, name)
);

CREATE TABLE guide_related_services (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (guide_id, service_id)
);

CREATE TABLE guide_images (
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    image_type VARCHAR(20) NOT NULL,
    content_type VARCHAR(32) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (guide_id, image_type),
    CONSTRAINT guide_images_type_valid CHECK (image_type IN ('COVER', 'SOCIAL'))
);

CREATE INDEX idx_guides_status_published ON guides(status, published_at DESC);
CREATE INDEX idx_guide_translations_locale ON guide_translations(locale);
CREATE INDEX idx_guide_blocks_translation ON guide_blocks(guide_id, locale, sort_order);
CREATE INDEX idx_guide_related_services_guide ON guide_related_services(guide_id, sort_order);
