CREATE TABLE website_popups (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    title_pt VARCHAR(80) NOT NULL,
    title_en VARCHAR(80) NOT NULL,
    body_pt VARCHAR(240) NOT NULL,
    body_en VARCHAR(240) NOT NULL,
    action VARCHAR(16) NOT NULL CHECK (action IN ('book', 'services', 'packs')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A single publication slot makes multiple active popups impossible, including
-- concurrent requests. Updating this row atomically replaces the active popup.
CREATE TABLE website_popup_publication (
    singleton BOOLEAN DEFAULT TRUE PRIMARY KEY CHECK (singleton = TRUE),
    popup_id UUID REFERENCES website_popups(id) ON DELETE SET NULL
);
INSERT INTO website_popup_publication(singleton, popup_id) VALUES (TRUE, NULL);
