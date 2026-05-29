# PRD — Project Types + Kid-Friendly Guided Flow

> **Status**: draft v0.1 · 2026-05-27
> **Owner**: Lightman + kids-opencode session
> **Scope**: V0 product extension — let a kid pick a *project type* (Game / Website) on start, then walk a kid-friendly guided flow that replaces PRD/design/plan adult vocabulary. Plus the IP-protection arrangement for the guided-flow content.
> **Companion docs**: `../client-architecture-handoff.md` (V0 client architecture), `../safety-assessment.md` (safety surface), `packages/kids-plugin/course-packs/README.md` (course pack format)

---

## 1. Background

V0 today ships **one** course pack — `portfolio-site`. The kid runs `kids-opencode --course portfolio-site --mission mission-1` from the CLI; the plugin loads that pack's system prompt overlay, missions and acceptance checks.

Two things are wrong with this for the real product:

1. **Kid can't choose.** The `--course` flag is a developer affordance. A real 12-year-old shouldn't have to type a course id or know one exists. They want to say "I want to make a game" and have something happen.
2. **One type doesn't carry the moat.** A portfolio site is a fine first project, but parents who watch their kid spend 30 minutes building one don't say "this is cool." They say "OK." Three or four *visibly different* outcomes — a playable game, a slick website, a slide deck, a video — is what reads as "this AI is teaching my kid to build real things across different mediums."

Concretely, what the kid sees as guided flow today is just the system prompt overlay in `pack.yml` ("Mission 1 should feel like a quick win — within 5 minutes the kid should see something real in their browser"). That's good guidance but it's *one* style, hand-written for portfolio sites. Game-building needs different pacing (loop logic first, art second), different first-5-minutes win ("a square that moves when I press the arrow keys"), different vocabulary, different acceptance.

## 2. Goals & non-goals

### Goals

- **G1**: Kid picks a project type on `kids-opencode` startup with no flag — Game or Website, V0.
- **G2**: Each type has a kid-friendly guided flow that replaces adult artifacts (PRD / design.md / plan) with kid-friendly equivalents (e.g. "想想你要做啥样的游戏" instead of "write a PRD"). The flow is encoded in the course pack, not in client UI.
- **G3**: Each type has *at least one* type-specific skill / automation that gives the kid a fast, visible win in the first 5 minutes (Game: scaffold a moving-square canvas; Website: scaffold a "hello, I'm X" page they can immediately open).
- **G4**: Course pack content (system prompts, mission briefs, type-specific skills) lives in a **private** repository / workspace, but is **bundled** into the public `@kidsinai/kids-opencode-plugin` npm package at publish time — so install UX is unchanged but source code isn't on public GitHub.
- **G5**: Parents who watch their kid for 10 minutes after install go "oh, cool" — not because of the marketing site, but because of what they see on screen.

### Non-goals

- **NG1**: Slides and Video types. Defer to post-V0; reassess after V0 lands.
- **NG2**: Multi-type single-project (e.g. "a website *and* a game in one folder"). One project = one type.
- **NG3**: A graphical project-creation wizard outside the TUI. The pick happens in the existing Ink TUI.
- **NG4**: Encrypting the guided-flow content at runtime. The npm bundle is readable JS/YAML — "private" here means *source repository not public on GitHub*, not "obfuscated at runtime."
- **NG5**: Changing the safety surface. System prompt rules 1–10, tool whitelist, webfetch allowlist, dangerous-topic overlay all stay exactly as today, layered *under* each type's guided-flow prompt.

## 3. User flow (kid POV)

**Before** (today):
```
$ kids-opencode --course portfolio-site --mission mission-1
[opens straight into Mission 1 chat]
```

**After** (V0):
```
$ kids-opencode

  Welcome, friend.
  What do you want to make today?

    ▸ 🎮  A game you can play
      🌐  A website about you
      🤔  I don't know yet — just chat

  ↑/↓ to choose · Enter to pick
```

After pick (Game shown):
```
  Great pick. Games are fun.

  Before we start, two quick things:
    1. I'll help you, but I won't write code without asking first.
    2. We'll do this in small steps so you don't get stuck.

  Want to give your game a name? (You can change it later.)
  > _
```

Then the type-specific guided flow runs (see §5 for what's in each).

### Key UX rules

- **Words used to a kid are kid words.** No "PRD", no "design doc", no "planning phase". The mental model is: *think of an idea → see something on screen → make it better → keep going*.
- **Don't ask 5 questions in a row.** Single question, kid answers, AI scaffolds something visible, *then* the next question. The kid's reward arrives between every question.
- **Skip is always allowed.** If a kid says "I don't know, just make something" the AI scaffolds a default and lets the kid react.

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ kids-client (Ink TUI)                                               │
│   on startup, if no --course flag:                                  │
│   ① shows ProjectTypePicker                                         │
│   ② kid picks → sets KIDS_COURSE_PACK env → forwards to opencode    │
│   ③ opens MissionScreen as today                                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ @kidsinai/kids-opencode-plugin (server-side)                        │
│   loads course pack from bundled course-packs/<id>/                 │
│   ──────────────────────────────────────────────────────────────────│
│   course-packs/  ← currently in this repo (PUBLIC)                  │
│     portfolio-site/  (today)                                        │
│     game/           (V0 — NEW)                                      │
│     website/        (V0 — NEW, supersedes portfolio-site)           │
│                                                                     │
│   ABOVE moves to:                                                   │
│                                                                     │
│   private submodule @ packages/kids-plugin/course-packs/            │
│     → bundled into plugin dist at publish time                      │
└─────────────────────────────────────────────────────────────────────┘
```

Three layers, each layer's responsibility is unchanged:

| Layer | Today | After V0 |
|---|---|---|
| **kids-client** | Reads `--course` flag, opens mission | Reads `--course` flag *or* shows picker; same MissionScreen after |
| **kids-plugin** | Loads `course-packs/portfolio-site/` | Loads `course-packs/<picked-id>/`; bundles 2 packs in V0 |
| **course pack content** | One pack, public source | Multiple packs, **private source repo**, bundled to dist |

No new processes, no new packages, no new SDK surface.

## 5. V0 scope — Game pack & Website pack

### 5.1 Game pack (`packages/kids-plugin/course-packs/game/`)

**Outcome**: kid produces a single-file HTML5 canvas game they can play in their browser and share. V0 keeps it small — one mechanic, no assets pipeline.

**Missions** (3 missions, ~2 hours total):

| # | Title | First-5-min win | Estimated |
|---|---|---|---|
| 1 | "Something that moves" | A square that moves when arrow keys are pressed | 30 min · 10 ⭐ |
| 2 | "Something to do" | Add a goal: collect a thing, dodge a thing, or score points | 45 min · 15 ⭐ |
| 3 | "Make it yours" | Replace the square with a kid-drawn shape, pick the colours, add a title screen | 45 min · 15 ⭐ |

**Kid-friendly substitute for PRD/design/plan** in `system_prompt_overlay`:

> Before any code, ask the kid these three things (one at a time, simply):
> 1. **What kind of game?** Offer 3 examples they can pick from: "a thing that dodges stuff", "a thing that collects stuff", "a thing that jumps over stuff". Don't lecture about genres.
> 2. **What's the player?** A square is fine. A circle is fine. The kid's initial drawn in ASCII is fine. Don't push for art skills.
> 3. **What's the win?** "You collected 10 stars" / "you survived 30 seconds" / "you got to the right side". One sentence.
>
> Then *immediately* scaffold a canvas with the player moving. The kid sees motion within 5 minutes. **Do not write a design document. Do not list features. Do not explain MVC.** Movement first, words later.

**Type-specific skill** — `scaffold-canvas-game` (auto-runs in Mission 1 step 1):

Creates `index.html` with `<canvas>`, a basic game loop (`requestAnimationFrame`), arrow-key listeners, and a moving rectangle. Single file. Kid opens it in a browser and the square moves. Total LoC: ~40. The skill is invoked via the plugin's existing `write` tool after explicit kid approval ("I'm about to make a file called `index.html` that has a moving square in it. OK?").

**Acceptance** (`mission-1/acceptance.yml`):
- `index.html` exists
- contains `<canvas`
- contains `requestAnimationFrame` or equivalent loop hook
- contains a keyboard event listener (`keydown` or `keyup`)
- kid-tested: the kid pressed an arrow key and saw the square move (heuristic via session audit log)

### 5.2 Website pack (`packages/kids-plugin/course-packs/website/`)

**Status**: rebranded + expanded `portfolio-site`. Existing 3 missions are mostly right; tweaks:

- **Mission 1 unchanged** — first HTML page with kid's name + intro.
- **Mission 2 unchanged** — CSS styling, kid picks colours.
- **Mission 3 expanded** — instead of "one interactive button", let kid pick from 3 mini-features:
  - A button that swaps the page colour theme (light/dark)
  - A small "guestbook" form (writes to localStorage)
  - An image gallery the kid populates

**Migration**: keep `portfolio-site` as an alias for `website` in V0 so existing docs / install scripts that reference it don't break. Deprecate alias post-V1.

### 5.3 What we are *not* doing in V0

- Game pack: no sprite assets pipeline, no sound, no save state, no level system. One canvas, one mechanic.
- Website pack: no JS frameworks, no build tools, no deployment. Single `index.html`, open from filesystem.
- Both: no peer multiplayer, no real backend, no cloud anything.

## 6. Per-type guided flow design pattern

The pattern that replaces PRD/design/plan for every type follows three rules. Each course pack's `system_prompt_overlay` must encode them.

### Rule A — "Idea in one sentence" not "PRD"

The AI asks: "在一句话告诉我你想做啥" (one sentence). Not a paragraph. Not bullet points. Not requirements. **One sentence.** Examples shown to the kid:

- Game: "我想做一个躲避陨石的小飞船" / "I want to make a game where a spaceship dodges meteors"
- Website: "我想做一个介绍我自己和我画的画的网站" / "A site about me and my drawings"

The AI confirms back: "OK, 我们要做的是 [restate]. 对吗?" The kid says yes/no. That sentence becomes the project's North Star — referenced by the AI throughout missions when scope creep happens ("你之前说这个是关于 X — 现在你想加 Y，要不下个项目再做？").

### Rule B — "Pick a vibe" not "design system"

The AI asks: "这个看起来应该是啥感觉的?" (what should this feel like?) and offers 3–4 *named* vibes the kid can pick from (no colour pickers, no theme generators, no Figma):

- Game: 太空感 / 像素游戏 / 可爱卡通 / 黑白极简
- Website: 干净简洁 / 五颜六色 / 像笔记本 / 暗黑霓虹

Each vibe maps to a small, hand-curated palette + font set + UI defaults stored in the course pack. The kid picks one *word*, the AI applies the whole vibe. The kid can override individual choices later but the default is "you picked X, here's what X looks like."

### Rule C — "Show then ask" not "plan then build"

Adult workflow: PRD → design → plan → build → review. Kid workflow: **show something on screen in 5 minutes**, *then* ask what to change.

Every mission's first AI action (after the one-sentence idea + vibe) is to **scaffold something visible**. Type-specific skills (§5.1, §5.2) exist to make this fast and consistent. The kid never sits through "planning" before they see output.

### How this composes in `pack.yml`

```yaml
# packages/kids-plugin/course-packs/game/pack.yml

id: game
version: 0.1.0
title: "A game you can play"
short_description: "Make a small game in your browser. You move the player. You win or lose."

# ... missions, acceptance refs as today ...

guided_flow:
  one_sentence_prompt: "在一句话告诉我你想做啥样的游戏 — 不用复杂，简单一句就行"
  vibes:
    - id: space
      label: "太空感"
      palette: ["#0a0e27", "#fff", "#5cffc8"]
      font: "monospace"
    - id: pixel
      label: "像素游戏"
      palette: ["#222", "#ffce42", "#ff5b5b"]
      font: "'Press Start 2P', monospace"
    - id: cute
      label: "可爱卡通"
      palette: ["#fff5e1", "#ff8fab", "#a0d8f1"]
      font: "'Comic Sans MS', sans-serif"
    - id: minimal
      label: "黑白极简"
      palette: ["#000", "#fff", "#888"]
      font: "system-ui"
  first_5_min_skill: scaffold-canvas-game

system_prompt_overlay: |
  ...kid-friendly pacing rules per Rule A/B/C above...
  When the kid picks a vibe, embed the palette in the canvas background + player + score text.
  Don't dump CSS lectures on a kid who picked "太空感" — just make it look like space.
```

`kids-plugin` reads `guided_flow` and injects it into the system prompt at session start. `kids-client` reads `guided_flow.vibes` only if/when it wants to render a picker UI in TUI (V0 leaves vibe picking to chat — TUI picker can come later).

## 7. Skills automation per type

A "skill" here = a deterministic, plugin-side procedure invoked by the AI that produces files / state in one go (versus the AI improvising line-by-line). Each skill is a function in the plugin package, with a manifest describing inputs + what files it writes. The AI calls it via tool use; the kid still approves before write.

### V0 skills

| Skill | Used by | What it does |
|---|---|---|
| `scaffold-canvas-game` | Game pack mission 1 | Writes `index.html` with `<canvas>` + game loop + arrow-key listener + moving rectangle. Inputs: `vibe`, `player_name`, `canvas_size`. |
| `scaffold-portfolio-page` | Website pack mission 1 | Writes `index.html` with kid's name as `<h1>`, intro paragraph, semantic structure. Inputs: `vibe`, `kid_name`, `intro_sentence`. |
| `apply-vibe` | Both packs mission 2 | Writes/updates `<style>` block to apply the picked vibe's palette + font. Inputs: `vibe_id`, `target_file`. |
| `add-game-goal` | Game pack mission 2 | Adds collectible / obstacle / score logic to existing canvas game. Inputs: `goal_type` (collect/dodge/score), `target_file`. |
| `preview` | Both | Opens the project's `index.html` in default browser. No file writes. |

### Skill safety

- Each skill is whitelisted in the plugin's tool list. Skills *cannot* be invoked outside their pack — `scaffold-canvas-game` rejects if `KIDS_COURSE_PACK !== 'game'`.
- Skills write through the existing `write` tool, so the kid-approval prompt is identical: "I'm about to make `index.html` — OK?"
- Skills can only write inside the project folder (existing `all_writes_within_cwd` audit rule applies).
- Skill source code is what we want to keep private (see §8) — it's the IP, more than the system prompts.

### Out of scope for V0 skills

- Asset generation (image/sound) — too unpredictable, defer.
- Project bootstrapping via `npm init` / `git init` — plugin doesn't run shell.
- Deployment skills (publish to GitHub Pages etc.) — phase 3.

## 8. Private code arrangement

### Goal

The **guided-flow content + skills code** is the product moat. Specifically:
- System prompt overlays per type (the "kid-friendly PRD" pedagogy)
- Vibe palettes + curated defaults (hand-tuned, the "feel" knowledge)
- Skills source code (the deterministic scaffolders)
- Mission briefs + acceptance criteria (the curriculum)

We want these *not on public GitHub*. Public GitHub keeps:
- `kids-client` (Ink TUI core — generic terminal UI)
- `kids-opencode` (CLI wrapper + lifecycle — generic process management)
- `kids-plugin` (server-side safety surface — the safety story is open by design, like Mozilla's; trust comes from auditability)
- `kids-tui-plugin` (theme + keymap layer — generic skin)

### Recommendation: **private submodule, build-time bundle**

```
kids-opencode/                          (public repo, current)
  packages/
    kids-plugin/
      src/
      course-packs/                     ← becomes git submodule
        ↓
        kidsinai/kids-flows (PRIVATE)   ← new private repo
          game/
          website/
          README.md
          ...
      src/skills/                       ← also becomes submodule
        ↓
        kidsinai/kids-skills (PRIVATE)
          scaffold-canvas-game.ts
          scaffold-portfolio-page.ts
          ...
```

#### How it works

1. Two new **private GitHub repos**: `kidsinai/kids-flows` (course packs content) + `kidsinai/kids-skills` (skill code). Both live under the `kidsinai` org with collaborator-only access.
2. The public `kids-opencode` repo references them as **git submodules** at `packages/kids-plugin/course-packs/` and `packages/kids-plugin/src/skills/`. Submodule pointer is in the public repo (a SHA + URL), but the *content* requires private repo access to clone.
3. Open-source contributors who clone the public repo without access get an empty submodule directory + a clear message: "course-pack content is private; the plugin builds without it but won't ship runnable course packs."
4. **CI publish step** (Anthropic / Lightman-only credentials) does a recursive clone with private repo access, copies the submodule contents into `dist/`, and `bun publish`-es the resulting `@kidsinai/kids-opencode-plugin` package with all content bundled.
5. End user `bun add -g @kidsinai/kids-opencode` gets the full bundle. They can `cat node_modules/.../dist/course-packs/game/pack.yml` and read the content — it's not encrypted. But (a) it's not on GitHub, (b) it's not the source of truth, (c) modifying it locally doesn't affect anyone else.

#### Why submodule and not "private workspace package"

A private workspace package (e.g. `@kidsinai/kids-flows-private`) sounds tidier but breaks two things:
- The plugin needs the content at runtime; if it's a separate package, install gets harder (private npm registry auth on kid laptops? no).
- Workspace packages still appear in the public repo's `bun.lock` and `packages/` listing — partial transparency, partial mystery. Confusing.

Submodule keeps the public repo clean (one directory, marked submodule, "private" badge) and the bundled npm artifact is a single self-contained dist.

#### Why not "private npm scope" instead

`@kidsinai/kids-flows` as a real published private npm package, depended on by `@kidsinai/kids-opencode-plugin` — would mean every kid install needs auth to npmjs.com private scope. Doesn't work for `curl | sh`. Rejected.

#### Why not "encrypted bundle" / "pull at runtime from CDN"

Considered and rejected (see Non-goal NG4). For a local CLI used by kids, the right level of IP protection is "not on public GitHub". Anyone determined enough to read the JS we shipped is not our economic threat — competitors building the same product from scratch are.

### Migration plan

1. Create the two private repos: `kidsinai/kids-flows`, `kidsinai/kids-skills`. Empty initial commits.
2. In `kids-opencode`, `git mv packages/kids-plugin/course-packs/portfolio-site` into a working copy of the `kids-flows` private repo, commit, push to private.
3. In `kids-opencode`, add the two private repos as submodules at the same paths. Commit the public repo with the new `.gitmodules` and the submodule pointer.
4. CI publish workflow gains a `submodule init --recursive` step using a deploy key with read access.
5. `kids-plugin`'s build (`tsup` / `bun build`) already copies `course-packs/` into `dist/`; no code change needed there.
6. Update `CLAUDE.md` and `CONTRIBUTING.md` with the "you may see empty submodule dirs, that's expected" note.

### IP risk assessment

| Threat | Mitigation |
|---|---|
| Open-source contributor clones repo, can't run end-to-end | README explains: plugin builds & runs against a stub course pack provided in public repo (a "hello world" pack), real content private |
| Competitor downloads npm package, copies course pack content | Acceptable — at that point they're behind us on shipped product anyway; ship velocity is the moat, not the prompts |
| Private deploy key leak | Rotate; only read access; only used in publish CI |
| Submodule sync friction for internal dev | Document in `docs/DEV.md`; `bun install` runs `git submodule update --init --recursive` via prepare script |

## 9. Acceptance & metrics

### Acceptance (V0 ship gate)

- Picker shows on `kids-opencode` with no flags, kid can pick Game or Website, project initializes correctly.
- Game pack: kid in workshop builds a working canvas game in ≤2 hours across 3 missions; arrow keys move a thing, goal works, vibe applies.
- Website pack: existing portfolio-site UX preserved under the new id; alias `--course portfolio-site` still works.
- Both private submodules clone-and-build cleanly in CI; npm publish produces a self-contained bundle that runs without access to the private repos.
- Safety surface (system prompt rules 1–10, tool whitelist, webfetch allowlist, dangerous-topic overlay) unchanged and all 36+ existing tests still pass.
- No `--course` flag needed for end users; legacy flag still accepted for engineering / installers.

### Metrics (post-launch, 2 weeks)

- % of new sessions that finish Mission 1 (target: ≥70% for Game, ≥80% for Website given existing baseline).
- Parent NPS at 2 weeks (target: ≥40, measured via Parent Portal survey).
- Type pick distribution (sanity check that picker isn't biased — if 95% pick Game we may have a Website-pack problem).
- Time-to-first-visible-output (target: ≤5 minutes from picker → something on screen).

## 10. Milestones

| Milestone | Scope | Estimate |
|---|---|---|
| **M1 — Private repos + submodule wiring** | Two private repos created; submodule references in public; CI publish path works with a stub pack | 1 day |
| **M2 — Picker in kids-client** | TUI startup picker UI; `KIDS_COURSE_PACK` env wiring; legacy `--course` flag preserved | 1 day |
| **M3 — Website pack rename + minor expand** | Rename `portfolio-site` → `website`; keep alias; Mission 3 mini-feature picker | 1 day |
| **M4 — Game pack content** | `pack.yml`, 3 missions + briefs + acceptance, system prompt overlay, vibe set | 2–3 days |
| **M5 — Skills (scaffold-canvas-game, apply-vibe, add-game-goal)** | Skill code, manifests, plugin integration, kid-approval prompts | 2 days |
| **M6 — Workshop dogfood** | Run with 4–6 kids in workshop, observe, fix top 3 friction points | 1 workshop day + 2 days iteration |

Total: ~10 working days for one engineer + 1 workshop session. Achievable inside the current V0b window.

## 11. Open questions

1. **Picker UX form factor.** Inline TUI list (proposed in §3) vs. a one-time first-launch wizard that persists choice in `~/.config/kids-opencode/profile.json` so the kid never sees the picker again on the same machine. Recommendation: **inline every launch** in V0 — kids may want to switch projects, and a 3-line picker isn't friction. Revisit if telemetry shows otherwise.
2. **Vibe count.** 4 vibes per type proposed. More = more content work per type. Fewer = less expressive. Confirm 4 is the V0 sweet spot.
3. **Should the picker show locked types?** "Slides 🔒 coming soon" hints at the roadmap and creates anticipation, but a 12-year-old seeing locked items may feel let down. Recommendation: **hide locked types in V0**; introduce a "more coming soon" line at the bottom of the picker without specifics.
4. **English-only or bilingual TUI for V0?** Picker copy and per-type guided-flow prompts above are written in Chinese in places — `kids-opencode` audience is Australian-English-first per current marketing. Decide whether V0 ships EN-only and ZH lands V1, or both at launch. Default assumption in this PRD: **EN strings ship V0**, ZH translations land before AU/CN dual-market push.
5. **Telemetry pipe.** Do we already have a metric ingestion endpoint for "Mission 1 completed" beyond the local audit log? If not, this needs a thin event-send before §9 metrics work. (Likely an Airbotix-side question.)

## 12. Risks

- **R1**: Game pack pedagogy is harder than website pack. A kid who can't see why their square doesn't move may quit cold. Mitigation: ship 1–2 levels of fallback hint in the system prompt overlay specifically for "the moving thing isn't moving" debugging.
- **R2**: Skills drift from kid approval norm. If a skill writes 5 files at once, the kid sees one big approval prompt and accepts blindly. Mitigation: each skill must produce a *single* file in V0; multi-file skills land post-V0 with a redesigned approval UX.
- **R3**: Private submodule access friction blocks new internal contributors. Mitigation: document onboarding in `CONTRIBUTING.md`; provide a "build with stub pack" path so anyone can verify their PR locally without private access.
- **R4**: Workshop kids pick "I don't know yet — just chat" 80% of the time, picker doesn't matter. Mitigation: design that third option's chat experience to gracefully route into Game or Website once the kid expresses a leaning ("oh that sounds like a game! want me to set you up?").

## 13. Out of this PRD

- The marketing positioning of "4 project types" — that's Airbotix copy work, separate doc.
- The Parent Portal dashboard changes to show "your kid is building a [Game]" — separate PRD.
- Tauri V1 GUI port — separate PRD (the picker design here generalizes, intentionally).
- Slides + Video packs design — explicitly post-V0.

---

## Appendix A — Course pack format extensions

Backwards-compatible additions to existing `pack.yml`:

```yaml
# existing fields (id, version, title, short_description, missions, system_prompt_overlay, ...)

# NEW — optional, defaults sensible
guided_flow:
  one_sentence_prompt: string         # kid-friendly project-idea question
  vibes:
    - id: string
      label: string                   # what kid sees
      palette: [string, ...]          # hex colours, 3–5 entries
      font: string                    # CSS font-family
  first_5_min_skill: string           # skill id to auto-invoke at mission 1 step 1

# NEW — optional
type_category: "game" | "website" | "slides" | "video"  # for picker grouping
icon: string                          # emoji shown in picker
picker_label: string                  # short string in picker
picker_order: number                  # sort order in picker
```

## Appendix B — Picker copy (V0, EN)

```
Welcome, friend.
What do you want to make today?

  🎮  A game you can play
  🌐  A website about you
  🤔  I don't know yet — just chat

↑/↓ to choose · Enter to pick · Ctrl+C to quit
```

ZH (post-V0):

```
你好呀.
今天想做点啥?

  🎮  做一个能玩的游戏
  🌐  做一个介绍你自己的网站
  🤔  还没想好 — 聊聊看

↑/↓ 选 · Enter 确认 · Ctrl+C 退出
```

## Appendix C — Why this becomes the moat

Three things competitors can't trivially copy:
1. **The vibe library** — hand-curated palettes + fonts per type, tuned with actual kid feedback from workshops. This is taste, not engineering.
2. **The pacing rules per type** — "movement before art" for games, "name before style" for websites — comes from observing real kids get stuck, not from theory.
3. **The skill set** — deterministic scaffolders that produce delightful first-5-minute outputs. Each skill is a few dozen lines of code, but the *which-skill-when-and-why* knowledge is the curriculum.

Each of these gets better with every workshop. Closed-source on these three is the leverage; the safety surface and the client TUI stay open because *open auditability is itself a parent-trust feature*.
