# Course Packs

> Bundled missions distributed with `kids-opencode`. Loaded by the plugin when `KIDS_COURSE_PACK=<pack-id>` is set in the environment (typically via `kids-opencode --course <pack-id>`).

## V0 pack

| ID | Title | Age | Missions | Stars budget | Status |
|---|---|---|---|---|---|
| `portfolio-site` | My personal portfolio website | 12+ | 3 | ~40⭐ | 🟡 content drafted, not workshop-tested |

## Structure

Each pack lives in `<pack-id>/` and has:

```
<pack-id>/
├── pack.yml                  # Metadata: title, age band, missions, system_prompt overlay
├── mission-1/
│   ├── brief.md              # What the kid reads
│   └── acceptance.yml        # Auto-check rules for completion
├── mission-2/
│   ├── brief.md
│   └── acceptance.yml
└── mission-3/
    ├── brief.md
    └── acceptance.yml
```

Content authoring: see [`docs/course-pack-authoring.md`](../docs/course-pack-authoring.md) (TODO).

## V1+ candidate packs

- `arduino-on-mbot` — Robotics Bridge first pack (V1+ depends on hardware tooling)
- `simple-game` — A small JavaScript game (Snake, Pong, or kid-designed)
- `data-story` — Pyodide-powered first data-vis story (V1+ depends on Pyodide integration)
- `class-website` — Group project, multi-kid, shared schools setting

Curriculum team owns the priority order.
