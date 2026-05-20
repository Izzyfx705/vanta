-- SQL Schema Update: Add images support to products table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- (Optional) Copy existing 'image' value as the first element of 'images' array for backward compatibility
UPDATE public.products 
SET images = jsonb_build_array(image) 
WHERE image IS NOT NULL AND image != '' AND (images IS NULL OR jsonb_array_length(images) = 0);
