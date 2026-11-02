-- Step 3: reviewed, tenant-scoped student memory and agent-scoped knowledge search.
-- Additive migration; no external runtime service/API is required.
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'preference';
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS source_detail varchar(500) NOT NULL DEFAULT '';
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS confidence numeric(3,2) NOT NULL DEFAULT 0.90 CHECK(confidence BETWEEN 0 AND 1);
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS fact_status varchar(20) NOT NULL DEFAULT 'confirmed' CHECK(fact_status IN ('confirmed','estimate','unverified'));
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS valid_from timestamptz NOT NULL DEFAULT now();
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS valid_until timestamptz;
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES assistant_memories(id) ON DELETE SET NULL;
ALTER TABLE assistant_memories ADD COLUMN IF NOT EXISTS relevance smallint NOT NULL DEFAULT 75 CHECK(relevance BETWEEN 0 AND 100);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='assistant_memories'::regclass AND conname='assistant_memories_gym_id_student_id_assistant_memory_key_key') THEN
  ALTER TABLE assistant_memories ADD CONSTRAINT assistant_memories_gym_id_student_id_assistant_memory_key_key UNIQUE(gym_id,student_id,assistant,memory_key);
 END IF;
END $$; -- Keep the pre-V1 uniqueness target so old code remains safe during rollback.
CREATE UNIQUE INDEX IF NOT EXISTS assistant_memories_active_key_uq ON assistant_memories(gym_id,student_id,assistant,memory_key) WHERE active=true;
CREATE INDEX IF NOT EXISTS assistant_memories_recall_idx ON assistant_memories(gym_id,student_id,assistant,active,updated_at DESC) WHERE fact_status='confirmed';

CREATE TABLE IF NOT EXISTS assistant_memory_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 assistant varchar(30) NOT NULL CHECK(assistant IN ('nutrigym','personalgym','shared')),
 memory_key varchar(80) NOT NULL, memory_id uuid REFERENCES assistant_memories(id) ON DELETE SET NULL,
 old_value varchar(500), new_value varchar(500), source_detail varchar(500) NOT NULL DEFAULT '',
 change_type varchar(30) NOT NULL CHECK(change_type IN ('created','updated','corrected','invalidated','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(gym_id,student_id) REFERENCES students(gym_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS assistant_memory_history_owner_idx ON assistant_memory_history(gym_id,student_id,assistant,created_at DESC);

CREATE TABLE IF NOT EXISTS assistant_knowledge (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent varchar(30) NOT NULL CHECK(agent IN ('nutrigym','personalgym')),
 category varchar(60) NOT NULL, record_type varchar(40) NOT NULL, title varchar(300) NOT NULL, content text NOT NULL,
 source_name varchar(200) NOT NULL, source_url text NOT NULL, author_institution varchar(200) NOT NULL,
 license_name varchar(300) NOT NULL, source_detail varchar(600) NOT NULL,
 source_record_id varchar(100), data_per_100g jsonb,
 published_at date, incorporated_at timestamptz NOT NULL DEFAULT now(),
 review_status varchar(20) NOT NULL CHECK(review_status IN ('draft','reviewed','rejected')),
 language varchar(10) NOT NULL DEFAULT 'en', search_vector tsvector GENERATED ALWAYS AS
 (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(category,'') || ' ' || coalesce(content,''))) STORED,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(agent,source_name,source_record_id,title)
);
CREATE INDEX IF NOT EXISTS assistant_knowledge_search_idx ON assistant_knowledge USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS assistant_knowledge_review_idx ON assistant_knowledge(agent,review_status,category,incorporated_at DESC);

-- FDC 168878: cooked, enriched, long-grain white rice; SR Legacy.
-- FDC data are CC0 1.0; attribution is requested by USDA. Values are per 100 g.
INSERT INTO assistant_knowledge(agent,category,record_type,title,content,source_name,source_url,author_institution,license_name,source_detail,source_record_id,data_per_100g,review_status,language)
VALUES('nutrigym','food_composition','food_composition','Rice, white, long-grain, regular, enriched, cooked',
'Per 100 g: 130 kcal, protein 2.69 g, carbohydrate 28.17 g, fat 0.28 g, fiber 0.4 g, sodium 1 mg, water 68.44 g. This is a table value for the named cooked food, not a meal recipe or an individual serving estimate.',
'USDA FoodData Central — SR Legacy','https://fdc.nal.usda.gov/food-search?query=168878','U.S. Department of Agriculture, Agricultural Research Service','CC0 1.0 Universal; attribution requested by USDA','Imported record FDC:168878; only the named item and listed per-100-g nutrient values were incorporated. Reviewed against the USDA record; no runtime API call.',
'FDC:168878','{"energy_kcal":130,"protein_g":2.69,"carbohydrate_g":28.17,"fat_g":0.28,"fiber_g":0.4,"sodium_mg":1,"water_g":68.44}'::jsonb,'reviewed','en')
ON CONFLICT(agent,source_name,source_record_id,title) DO UPDATE SET content=EXCLUDED.content,source_url=EXCLUDED.source_url,license_name=EXCLUDED.license_name,source_detail=EXCLUDED.source_detail,data_per_100g=EXCLUDED.data_per_100g,review_status='reviewed',updated_at=now();

-- Independent factual summary from a verified open-access umbrella review; no article text copied.
-- License checked on PMC page: CC BY-NC-ND 4.0; summary is not a derivative-text excerpt.
INSERT INTO assistant_knowledge(agent,category,record_type,title,content,source_name,source_url,author_institution,license_name,source_detail,source_record_id,published_at,review_status,language)
VALUES('personalgym','resistance_training','review_summary','Resistance training and adaptations in healthy adults',
'An umbrella review of 44 systematic reviews reports that resistance training consistently improved muscle mass and strength compared with non-exercising controls in healthy adults. The evidence on how specific prescription variables affect outcomes varied; available evidence did not establish one universally optimal schedule. This is population-level evidence, not an individual prescription.',
'McLeod et al., Journal of Sport and Health Science, umbrella review','https://pmc.ncbi.nlm.nih.gov/articles/PMC10818109/','McMaster University; Journal of Sport and Health Science','CC BY-NC-ND 4.0; license restricts commercial reuse; included as pending licensing review, not as a cleared commercial source.','Content is paraphrased from article abstract results; source/license metadata verified at PMC page. Requires legal review before use in a commercial service.',
'PMC:10818109','2024-01-01','draft','en')
ON CONFLICT(agent,source_name,source_record_id,title) DO UPDATE SET content=EXCLUDED.content,source_url=EXCLUDED.source_url,license_name=EXCLUDED.license_name,source_detail=EXCLUDED.source_detail,review_status='draft',updated_at=now();

-- CDC public-domain adult activity guidance. CDC requires attribution, no substantive alteration,
-- availability at no charge, and a prominent non-endorsement disclaimer in commercial use.
INSERT INTO assistant_knowledge(agent,category,record_type,title,content,source_name,source_url,author_institution,license_name,source_detail,source_record_id,published_at,review_status,language)
VALUES('personalgym','physical_activity','guideline_summary','Adult weekly aerobic and strengthening activity benchmark',
'CDC states adults need at least 150 minutes of moderate-intensity aerobic activity per week (or 75 minutes vigorous or equivalent) and muscle-strengthening activity on at least 2 days each week. General population guidance, not an individualized training plan.',
'CDC, Adult Activity: An Overview','https://www.cdc.gov/physical-activity-basics/guidelines/adults.html','U.S. Centers for Disease Control and Prevention','CDC public-domain material; attribution to CDC, link directly to source, state source available free, no substantive changes, and prominently disclaim government endorsement for commercial use.','Independent, content-preserving summary; CDC reuse terms verified. MultiGym must display required attribution, free-source notice, direct source link, and non-endorsement disclaimer before this record is served.','CDC-ADULT-ACTIVITY','2024-05-15','reviewed','en')
ON CONFLICT(agent,source_name,source_record_id,title) DO UPDATE SET content=EXCLUDED.content,source_url=EXCLUDED.source_url,license_name=EXCLUDED.license_name,source_detail=EXCLUDED.source_detail,review_status='reviewed',updated_at=now();

-- WHO health fact sheets require explicit license/permission review for commercial reuse. Do not seed from WHO until confirmed.
-- WHO is not imported. Previously reviewed rows, if any, must never be modified by this migration.
