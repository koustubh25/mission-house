# Building Apps with AI: Deep Dive into beads Workflow

_Part 2 of 2: JSONL Memory, Real Examples, and Honest Drawbacks_

---

## Recap

In [Part 1](./part1-introduction-to-beads.md), I introduced `beads` — a git-native issue tracker designed for AI-assisted development. We looked at the Mission House app and the basic workflow. Now let’s go deeper.

---

## Where the Tasks Came From

Although beads is task-first, I didn’t start from a blank slate.

I began with a lightweight [requirements.md](https://github.com/koustubh25/mission-house/blob/main/docs/requirements.md) that described:

- core user flows
- data sources (e.g. NAPLAN, Google Maps)
- output expectations (comparison metrics, charts)

I then asked Claude Code (with the beads plugin) to:

- Read requirements.md
- Propose epics, features, and tasks
- Encode them directly into beads issues with explicit dependencies

In other words, requirements existed, but they were treated as input, not as a continuously consulted execution artifact.

Once the task graph existed, beads became the primary source of truth.

## Scope and Assumptions

This post reflects a **solo, AI-assisted development workflow** on a small but non-trivial codebase (dozens of tasks, explicit dependencies, multiple external APIs).

Assumptions:

- The AI agent has read access to the full issue graph
- Execution efficiency matters more than prolonged design deliberation

For ambiguous product discovery, multi-team coordination, or regulated environments, spec-driven approaches may be a better _first_ step.

---

## The JSONL Advantage: Compact and Queryable

Every beads issue is stored as a single line of JSON in `.beads/issues.jsonl`:

```json
{"id":"mission-house-ogp","title":"Implement myschool.edu.au scraper","description":"Create Puppeteer-based scraper...","status":"closed","priority":1,"close_reason":"NAPLAN scraper implemented in server.js","dependencies":[{"depends_on_id":"mission-house-5mv"}]}
```

Compare this to a typical markdown task file that might span dozens of lines with headers, descriptions, and nested checklists for the same information.

### Why Compact Matters

```mermaid
flowchart LR
    subgraph "Verbose MD Files"
        A1[Read file 1] --> A2[Read file 2]
        A2 --> A3[Read file 3...]
        A3 --> A4[Parse all prose]
        A4 --> A5[Build mental model]
        A5 --> A6[Tokens consumed: 📈]
    end

    subgraph "Single JSONL"
        B1[Read issues.jsonl] --> B2[Parse structured data]
        B2 --> B3[Query with bd commands]
        B3 --> B4[Tokens consumed: 📉]
    end

    style A6 fill:#ff6b6b,color:#fff
    style B4 fill:#4ade80,color:#000
```

The AI gets structured data it can query, not prose it must interpret:

- **`bd ready`** - What's unblocked and highest priority?
- **`bd blocked`** - What's waiting on other work?
- **`bd show <id>`** - Full details on one issue
- **`bd stats`** - Project health at a glance

### Close Reasons: Implementation Memory

When you close an issue, you document what was actually built:

```bash
bd close mission-house-ogp --reason="NAPLAN scraper implemented in server.js, handles terms acceptance and score extraction"
```

This is not just status — it’s ground truth.

Specs capture intent.
Close reasons capture reality.

### Real Example: Session Continuity

Here's what happened when I resumed work on NAPLAN scoring after a break:

**Session 1 (ended with):**

```bash
bd close mission-house-ogp --reason="NAPLAN scores integration complete: scraper implemented in server.js"
```

**Session 2 (started with):**

```bash
> bd ready

mission-house-6t1 [P2] [task] open - Display NAPLAN scores in UI
  └─ Blocked by: mission-house-ogp (closed), mission-house-0ch (closed)
  └─ All blockers resolved - ready to work!
```

Claude immediately knew:

1. The scraper was done (from ogp's close reason)
2. The schema was updated (from 0ch's close reason)
3. The next logical step was UI display

**No manual context re-establishment was needed**, because dependencies and implementation details were already encoded.

---

## The Hierarchy: Epics → Features → Tasks

We organized Mission House using a three-level hierarchy:

```mermaid
flowchart TB
    subgraph Epics["Epics (Strategic Goals)"]
        E1["House Comparison App<br/>mission-house-1ow"]
        E2["Data Comparison Page<br/>mission-house-tfz"]
    end

    subgraph Features["Features (User-Facing)"]
        F1["Data Entry Page<br/>mission-house-a6u"]
        F2["Data View Page<br/>mission-house-ng2"]
        F3["JSON Database<br/>mission-house-2e6"]
        F4["Radar Chart<br/>mission-house-xsq"]
        F5["NAPLAN Integration<br/>mission-house-9d1"]
    end

    subgraph Tasks["Tasks (Implementation)"]
        T1["Frontend Setup"]
        T2["URL Form"]
        T3["Web Scraper"]
        T4["Google Maps API"]
        T5["School Lookups"]
        T6["Train Station Finder"]
        T7["Chart Library Setup"]
        T8["NAPLAN Scraper"]
    end

    E1 --> F1
    E1 --> F2
    E1 --> F3
    E2 --> F4
    F5 --> T8

    F1 --> T1
    F1 --> T2
    F1 --> T3
    F2 --> T4
    F2 --> T5
    F2 --> T6
    F4 --> T7

    style Epics fill:#7c3aed,color:#fff
    style Features fill:#2563eb,color:#fff
    style Tasks fill:#059669,color:#fff
```

### Why This Structure Works

| Level       | Purpose                           | Typical Count    | Lifetime |
| ----------- | --------------------------------- | ---------------- | -------- |
| **Epic**    | Strategic goal, multiple sessions | 2-5 per project  | Weeks    |
| **Feature** | User-facing capability            | 5-15 per epic    | Days     |
| **Task**    | Single implementation unit        | 3-10 per feature | Hours    |

The AI works at the **task level** but understands the **feature and epic context**.

---

## Real Issues from Mission House

Let me show you actual issues from our project to illustrate different patterns:

### Pattern 1: Task with Clear Dependencies

```json
{
  "id": "mission-house-73p",
  "title": "Calculate Flinders Street Station travel time",
  "description": "Calculate travel time to Flinders Street Station during peak hours on a working day from: (a) the nearest train station, (b) the property address directly.",
  "status": "closed",
  "priority": 2,
  "issue_type": "task",
  "close_reason": "Implemented MapsService.getTravelToFlinders() with peak hour scheduling. Calculates transit, driving, walking routes from property and via nearest station",
  "dependencies": [
    {
      "depends_on_id": "mission-house-utk",
      "type": "blocks"
    }
  ]
}
```

**What the AI learned from this:**

- Can't calculate commute until "Find nearest train station" (utk) is done
- Implementation went into `MapsService.getTravelToFlinders()`
- Peak hour scheduling was added
- Multiple route types were implemented

### Pattern 2: Bug with Acceptance Criteria

```json
{
  "id": "mission-house-v4e",
  "title": "Fix naplan score web scraping logic",
  "description": "Naplan score web scraping not working as expected. Check the requirements document",
  "acceptance_criteria": "Naplan score written in json file as in the requirements document",
  "status": "closed",
  "priority": 0,
  "issue_type": "bug",
  "close_reason": "Implemented naplan_quality metric: added benchmark constants, quality calculation function, and UI display in both hub-spoke view and compare page radar chart"
}
```

**Priority 0 (P0)** is the highest priority level. The AI knew to work on this first.

### Pattern 3: Tombstone (Deleted Issue)

```json
{
  "id": "mission-house-ck6",
  "title": "Implement spider/radar chart visualization",
  "status": "tombstone",
  "deleted_at": "2026-01-17T23:15:21.909135+11:00",
  "deleted_by": "batch delete",
  "delete_reason": "batch delete",
  "original_type": "task"
}
```

Tombstones preserve history while removing clutter. The AI knows this was deleted and won't try to work on it.

---

## beads vs. agent-os (an SDD Framework)

Spec-Driven Development (SDD) is a methodology - different tools implement it differently. Let's compare beads to [agent-os](https://buildermethods.com/agent-os/workflow), one popular SDD framework.

_Note: This comparison is specific to agent-os. Other SDD implementations may work differently._

### Two Different Philosophies

**agent-os** follows a six-phase workflow:

1. Plan Product → 2. Shape Spec → 3. Write Spec → 4. Create Tasks → 5. Implement → 6. Orchestrate

It uses layered context (Standards/Product/Specs) in markdown files. Tasks are _derived from specs_.

**beads** is task-first:

1. Create issues → 2. Add dependencies → 3. Run `bd ready` → 4. Implement

No ongoing spec phase was required. A lightweight requirements document seeded the task graph, after which dependencies were tracked as explicit graph edges rather than implied through prose.

```mermaid
flowchart TB
    subgraph AgentOS["agent-os (SDD)"]
        S1["Plan Product"]
        S2["Write Specs"]
        S3["Derive Tasks"]
        S4["Interpret Priority"]
        S5["Implement"]

        S1 --> S2 --> S3 --> S4 --> S5
    end

    subgraph Beads["beads (Task-First)"]
        B1["Create Issues"]
        B2["Add Dependencies"]
        B3["bd ready"]
        B4["Implement"]

        B1 --> B2 --> B3 --> B4
    end

    style S2 fill:#7c3aed,color:#fff
    style S4 fill:#fbbf24,color:#000
    style B3 fill:#4ade80,color:#000
```

### Comparison Table (agent-os vs beads)

| Aspect             | agent-os                        | beads                       |
| ------------------ | ------------------------------- | --------------------------- |
| **Philosophy**     | Spec-first                      | Task-first                  |
| **Persistence**    | ✅ MD files in git              | ✅ JSONL in git             |
| **Context layers** | Standards/Product/Specs         | Flat issue list             |
| **Task creation**  | Derived from specs              | Created directly            |
| **Dependencies**   | Implicit in spec narrative      | Explicit graph edges        |
| **"What's next?"** | Derived from spec phase         | `bd ready` computes it      |
| **Upfront design** | Required (spec phases)          | Optional                    |
| **Best for**       | Complex features needing design | Iterative, fast-moving work |

### When to Use Which

**Use agent-os (or similar SDD frameworks) when:**

1. **Complex features** - You need to think through architecture before coding
2. **Team alignment** - Specs help communicate intent to other humans
3. **Stakeholder buy-in** - Non-technical people need to review plans
4. **Regulated industries** - Formal specs may be required

**Use beads when:**

1. **Fast iteration** - You want to jump straight to tasks
2. **Clear requirements** - You already know what to build
3. **Dependency-heavy work** - Many tasks blocking each other
4. **Solo or AI-assisted** - Less need for human-readable specs

### Can You Use Both?

Yes. You could:

- Use SDD's planning phases to think through architecture
- Export tasks to beads for execution with graph-based tracking
- Keep high-level context in a README, detailed execution in beads

**My approach:** For Mission House, I skipped formal specs and went straight to beads. The requirements doc was enough context - I didn't need a full SDD workflow for a personal project.

---

## The Drawbacks: What Didn't Work

Let me be honest about the challenges:

### 1. Learning Curve

```mermaid
flowchart LR
    A[Day 1] -->|"What's bd dep add?"| B[Day 2]
    B -->|"Why is this blocked?"| C[Day 3]
    C -->|"Aha! Dependencies!"| D[Day 4+]
    D -->|"Smooth sailing"| E[Productive]

    style A fill:#ff6b6b,color:#fff
    style B fill:#fbbf24,color:#000
    style C fill:#fbbf24,color:#000
    style D fill:#4ade80,color:#000
```

The CLI commands take time to internalize. `bd dep add A B` means "A depends on B" (B blocks A) - I got this backwards several times.

### 2. Sync Conflicts

When working across multiple branches or machines, sync conflicts can occur:

```bash
> bd list
💡 Tip: Run 'bd sync' to resolve sync conflict
```

The fix is usually simple (`bd sync --from-main`), but it's an extra step that spec documents don't have.

### 3. Over-Granularity Temptation

It's tempting to create a task for everything:

```bash
# Too granular - don't do this
bd create --title="Add import statement for React"
bd create --title="Create empty component file"
bd create --title="Add basic JSX structure"
```

**Better:** One task for "Create React component for X with basic structure"

### 4. Daemon Startup Delays

Occasionally the beads daemon takes time to start:

```bash
> bd list
Warning: Daemon took too long to start (>5s). Running in direct mode.
```

Not a blocker, but noticeable.

### 5. No Visual Dashboard

If you want a Kanban board or burndown chart, you'll need external tools. beads is CLI-first by design.

---

## Advanced Features We Used

### Bulk Operations

When we had duplicate issues, we cleaned up with:

```bash
bd delete mission-house-ck6 mission-house-d1s mission-house-hqs --reason="batch delete"
```

This created tombstones preserving the history.

### Priority System

beads uses P0-P4 priorities:

| Priority | Meaning  | Our Usage     |
| -------- | -------- | ------------- |
| P0       | Critical | Blocking bugs |
| P1       | High     | Core features |
| P2       | Medium   | Most tasks    |
| P3       | Low      | Nice-to-haves |
| P4       | Backlog  | Future ideas  |

### Close Reasons

Always close with a reason:

```bash
bd close mission-house-qvs --reason="Added Google Maps API with Places and Geometry libraries. MapsService provides geocoding, directions, nearest station search, and autocomplete"
```

This becomes searchable context for future sessions.

---

## Project Timeline Visualization

Here's how our project actually progressed:

```mermaid
gantt
    title Mission House Development Timeline
    dateFormat  YYYY-MM-DD HH:mm
    axisFormat %H:%M

    section Day 1 (Jan 17)
    Epic Creation           :2026-01-17 17:50, 5m
    Frontend Setup          :2026-01-17 17:55, 15m
    Data Entry Page         :2026-01-17 18:10, 20m
    Data View Page          :2026-01-17 18:30, 45m
    Hub-Spoke UI            :2026-01-17 19:15, 30m

    section Day 1 Evening
    Comparison Page Epic    :2026-01-17 23:05, 5m
    Radar Chart             :2026-01-17 23:10, 10m
    Chart Integration       :2026-01-17 23:20, 5m

    section Day 2 (Jan 19)
    NAPLAN Feature          :2026-01-19 13:43, 6m
    NAPLAN Bug Fix          :2026-01-19 17:33, 41m
```

**Total active development time:** ~3 hours across 2 days

---

## Key Commands Cheat Sheet

```bash
# Planning
bd create --title="..." --type=epic|feature|task --priority=0-4
bd dep add <issue> <depends-on>

# Working
bd ready                          # What can I work on?
bd update <id> --status=in_progress
bd show <id>                      # Full issue details

# Completing
bd close <id> --reason="..."
bd close <id1> <id2> <id3>        # Bulk close

# Maintenance
bd sync --from-main               # Resolve conflicts
bd doctor                         # Health check
bd stats                          # Project overview
```

---

## Final Thoughts

beads and SDD frameworks like agent-os represent different philosophies:

- **SDD frameworks** say: "Think first, spec it out, then derive tasks"
- **beads** says: "Create tasks directly, let the graph handle prioritization"

Neither is universally better. SDD frameworks shine when you need upfront design and human-readable documentation. beads shines when you want to move fast with automatic dependency resolution.

What makes beads unique:

1. **Task-first workflow** - Skip straight to issue creation
2. **Graph-based dependencies** - Explicit edges, not prose to interpret
3. **Automatic prioritization** - `bd ready` computes what's next via graph traversal
4. **Compact JSONL** - High signal-to-noise ratio as projects grow

The Mission House project went from idea to working app in about 3 hours of active development, spread across multiple sessions. The graph kept track of what was blocked, what was ready, and what was done - no spec documents required.

Choose the approach that fits your project. Or use both.

---

## Resources

- [beads GitHub Repository](https://github.com/steveyegge/beads)
- [Mission House Demo](https://koustubh25.github.io/mission-house/)
- [Mission House Source](https://github.com/koustubh25/mission-house)
- [Claude Code](https://claude.ai/claude-code)

---

_Thanks for reading! If you try beads on your next AI-assisted project, I'd love to hear how it goes._

---

**Tags:** #ai #claude #devtools #productivity #projectmanagement #webdev
