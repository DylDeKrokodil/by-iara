ALTER TABLE guide_blocks DROP CONSTRAINT guide_blocks_type_valid;
ALTER TABLE guide_blocks ADD CONSTRAINT guide_blocks_type_valid
    CHECK (block_type IN ('PARAGRAPH', 'HEADING', 'IMAGE', 'LIST', 'QUOTE', 'CALL_TO_ACTION', 'RICH_TEXT'));
