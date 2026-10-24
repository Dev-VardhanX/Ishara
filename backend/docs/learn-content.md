# Learn Content Specification (`lessons` table)

This guide documents the schema and JSON structure used in the `lessons` table so that content creators (Member C) can easily write and update sign language lessons for Ishara.

---

## 1. Table Schema Overview

Each lesson in the `public.lessons` table consists of:

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` | `text` (Primary Key) | Unique lesson identifier | `'isl_01'`, `'asl_01'` |
| `sign_language` | `text` | Sign language system | `'ISL'` or `'ASL'` |
| `title` | `text` | Display title shown in the app | `'Greetings'` |
| `order_index` | `integer` | Sequence order in the lesson list | `1` |
| `content` | `jsonb` | Lesson details, avatar clips, and quiz | *(See JSON format below)* |

---

## 2. JSON Structure of `content`

Every lesson's `content` column must adhere to the following JSON structure:

```json
{
  "description": "Short explanation of what the user will learn in this lesson.",
  "signs": [
    {
      "gloss": "HELLO",
      "clip": "ISL_HELLO.glb"
    },
    {
      "gloss": "THANK_YOU",
      "clip": "ISL_THANK_YOU.glb"
    }
  ],
  "quiz": [
    {
      "question": "What is the standard greeting sign in ISL?",
      "options": [
        "HELLO",
        "GOODBYE",
        "PLEASE",
        "NO"
      ],
      "answer_index": 0
    }
  ]
}
```

---

## 3. Field Definitions & Guidelines

### A. Root Fields
* **`description`** (*string*): A 1-2 sentence overview of the lesson objective.

### B. `signs` (Array of Sign Objects)
Provides the vocabulary words taught in the lesson and references the 3D avatar animation file.
* **`gloss`** (*string*): The standardized uppercase gloss token (e.g., `"HELLO"`, `"FAMILY"`, `"GOOD_MORNING"`).
* **`clip`** (*string*): The exact filename of the 3D avatar animation file.
  * **Naming convention:** `<SIGN_LANG>_<GLOSS>.glb`
  * **Examples:** `ISL_HELLO.glb`, `ISL_MOTHER.glb`, `ASL_WELCOME.glb`.

### C. `quiz` (Array of Quiz Question Objects)
Contains interactive test questions to assess the learner after viewing the signs.
* **`question`** (*string*): The question prompt displayed to the learner.
* **`options`** (*array of strings*): Exactly 4 choices for the multiple-choice card.
* **`answer_index`** (*integer*): Zero-based index (`0`, `1`, `2`, or `3`) identifying the correct choice from `options`.
  * *Example:* If the correct answer is the first item in `options`, set `"answer_index": 0`.

---

## 4. Example SQL Insert Template

To add a new lesson via SQL, use this template:

```sql
insert into public.lessons (id, sign_language, title, content, order_index)
values (
  'isl_06',
  'ISL',
  'Colors',
  '{
    "description": "Learn basic color signs in Indian Sign Language.",
    "signs": [
      {"gloss": "RED", "clip": "ISL_RED.glb"},
      {"gloss": "BLUE", "clip": "ISL_BLUE.glb"},
      {"gloss": "GREEN", "clip": "ISL_GREEN.glb"}
    ],
    "quiz": [
      {
        "question": "Which sign represents the color Red?",
        "options": ["BLUE", "RED", "YELLOW", "WHITE"],
        "answer_index": 1
      }
    ]
  }'::jsonb,
  6
)
on conflict (id) do nothing;
```
