/*
  Warnings:

  - You are about to drop the column `vidName` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `vidTags` on the `Video` table. All the data in the column will be lost.
  - Added the required column `title` to the `Video` table without a default value. This is not possible if the table is not empty.

*/


--  Add new columns
ALTER TABLE "Video"
ADD COLUMN "vidType" "VideoType" NOT NULL DEFAULT 'video',
ADD COLUMN "description" VARCHAR(2048);

--  Rename the column
ALTER TABLE "Video"
RENAME COLUMN "vidName" TO "title";



WITH raw_tags AS (
  SELECT 
    id AS video_id,
    unnest("vidTags") AS tag_name
  FROM "Video"
  WHERE "vidTags" IS NOT NULL
), clean_tags AS (
  SELECT 
    video_id,
    trim(lower(tag_name)) AS tag_name
  FROM raw_tags
)
INSERT INTO "Tags" (name)
SELECT DISTINCT tag_name
FROM clean_tags
WHERE tag_name <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "Tags" t WHERE t.name = trim(lower(clean_tags.tag_name))
);

WITH raw_tags AS (
  SELECT 
    id AS video_id,
    unnest("vidTags") AS tag_name

  FROM "Video"
  WHERE "vidTags" IS NOT NULL
), clean_tags AS (
  SELECT 
    video_id,
    trim(lower(tag_name)) AS tag_name
  FROM raw_tags
), tag_ids AS (
  SELECT 
    ct.video_id,
    t.id AS tag_id
  FROM clean_tags ct
  JOIN "Tags" t ON t.name = ct.tag_name
)
INSERT INTO "_TagsToVideo" ("A", "B")
SELECT 
  tag_id AS "A",
  video_id AS "B"
FROM tag_ids
ON CONFLICT DO NOTHING;


ALTER TABLE "Video"
DROP COLUMN "vidTags";


