-- Migration: Add menu_images column to event_list
-- Date: 2026-01-16
-- Description: Adds support for multiple menu image URLs (Cloudinary) per event

-- Add the column
ALTER TABLE event_list ADD COLUMN menu_images TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN event_list.menu_images IS 'Array of Cloudinary URLs for menu images. Takes precedence over menu_link when displaying.';
