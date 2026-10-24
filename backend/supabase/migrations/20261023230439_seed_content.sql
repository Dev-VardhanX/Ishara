-- Ishara: Seed Content Migration
-- Migration: 20261023230439_seed_content.sql

-- 1. Seed offline language packs
insert into public.language_packs (code, name, size_mb, version, download_url)
values
  ('en', 'English', 40, '1.0', null),
  ('hi', 'Hindi', 45, '1.0', null),
  ('mr', 'Marathi', 45, '1.0', null)
on conflict (code) do nothing;

-- 2. Seed starter ISL lessons
insert into public.lessons (id, sign_language, title, content, order_index)
values
  (
    'isl_01',
    'ISL',
    'Greetings',
    '{
      "description": "Learn basic Indian Sign Language greetings to start everyday conversations.",
      "signs": [
        {"gloss": "HELLO", "clip": "ISL_HELLO.glb"},
        {"gloss": "WELCOME", "clip": "ISL_WELCOME.glb"},
        {"gloss": "GOOD_MORNING", "clip": "ISL_GOOD_MORNING.glb"},
        {"gloss": "THANK_YOU", "clip": "ISL_THANK_YOU.glb"},
        {"gloss": "GOODBYE", "clip": "ISL_GOODBYE.glb"}
      ],
      "quiz": [
        {
          "question": "Which sign is typically used to welcome someone in ISL?",
          "options": ["WELCOME", "GOODBYE", "NO", "SLEEP"],
          "answer_index": 0
        },
        {
          "question": "What is the standard closing gesture when taking leave?",
          "options": ["HELLO", "GOODBYE", "PLEASE", "NAME"],
          "answer_index": 1
        }
      ]
    }'::jsonb,
    1
  ),
  (
    'isl_02',
    'ISL',
    'Family',
    '{
      "description": "Learn signs for immediate family members and relatives in Indian Sign Language.",
      "signs": [
        {"gloss": "MOTHER", "clip": "ISL_MOTHER.glb"},
        {"gloss": "FATHER", "clip": "ISL_FATHER.glb"},
        {"gloss": "BROTHER", "clip": "ISL_BROTHER.glb"},
        {"gloss": "SISTER", "clip": "ISL_SISTER.glb"},
        {"gloss": "FAMILY", "clip": "ISL_FAMILY.glb"}
      ],
      "quiz": [
        {
          "question": "Which sign refers to one''s mother in ISL?",
          "options": ["FATHER", "MOTHER", "BROTHER", "FRIEND"],
          "answer_index": 1
        },
        {
          "question": "Which collective sign represents the whole household unit?",
          "options": ["FAMILY", "HOUSE", "COLLEGE", "WORK"],
          "answer_index": 0
        }
      ]
    }'::jsonb,
    2
  ),
  (
    'isl_03',
    'ISL',
    'Numbers 1-10',
    '{
      "description": "Master single-hand count signs from 1 through 10 in Indian Sign Language.",
      "signs": [
        {"gloss": "ONE", "clip": "ISL_ONE.glb"},
        {"gloss": "TWO", "clip": "ISL_TWO.glb"},
        {"gloss": "THREE", "clip": "ISL_THREE.glb"},
        {"gloss": "FOUR", "clip": "ISL_FOUR.glb"},
        {"gloss": "FIVE", "clip": "ISL_FIVE.glb"}
      ],
      "quiz": [
        {
          "question": "How is the number 1 signed in ISL?",
          "options": ["Index finger raised upwards", "Fist with thumb tucked", "Open palm facing down", "Pinky finger only"],
          "answer_index": 0
        },
        {
          "question": "Which sign corresponds to the count of five?",
          "options": ["Two fingers", "Full open hand with 5 fingers extended", "Closed fist", "Thumb up only"],
          "answer_index": 1
        }
      ]
    }'::jsonb,
    3
  ),
  (
    'isl_04',
    'ISL',
    'Common Questions',
    '{
      "description": "Learn how to ask essential question words and inquire about everyday situations.",
      "signs": [
        {"gloss": "WHAT", "clip": "ISL_WHAT.glb"},
        {"gloss": "WHERE", "clip": "ISL_WHERE.glb"},
        {"gloss": "WHEN", "clip": "ISL_WHEN.glb"},
        {"gloss": "WHO", "clip": "ISL_WHO.glb"},
        {"gloss": "HOW", "clip": "ISL_HOW.glb"}
      ],
      "quiz": [
        {
          "question": "Which sign is used to ask for the location of an item or place?",
          "options": ["WHAT", "WHERE", "WHO", "WHY"],
          "answer_index": 1
        },
        {
          "question": "Which sign is used to identify a person?",
          "options": ["WHO", "WHEN", "HOW", "WHERE"],
          "answer_index": 0
        }
      ]
    }'::jsonb,
    4
  ),
  (
    'isl_05',
    'ISL',
    'Daily Needs',
    '{
      "description": "Essential signs for expressing primary personal needs, health, and requests.",
      "signs": [
        {"gloss": "WATER", "clip": "ISL_WATER.glb"},
        {"gloss": "FOOD", "clip": "ISL_FOOD.glb"},
        {"gloss": "HELP", "clip": "ISL_HELP.glb"},
        {"gloss": "REST", "clip": "ISL_REST.glb"},
        {"gloss": "MEDICINE", "clip": "ISL_MEDICINE.glb"}
      ],
      "quiz": [
        {
          "question": "Which sign is critical to communicate thirst or request a drink?",
          "options": ["FOOD", "WATER", "MEDICINE", "SLEEP"],
          "answer_index": 1
        },
        {
          "question": "Which sign conveys an urgent need for assistance?",
          "options": ["HELP", "REST", "WALK", "READ"],
          "answer_index": 0
        }
      ]
    }'::jsonb,
    5
  )
on conflict (id) do nothing;
