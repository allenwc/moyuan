---
name: moyuan
description: >-
  This skill should be used when an AI agent needs to create, query, or modify
  novel character-relationship graphs in 墨缘 (Moyuan) — for example adding
  novels/characters/relations, reading a novel's full graph, or bulk-syncing a
  graph state. It wraps the 墨缘 CLI, which talks to the Moyuan REST API
  (CloudBase PostgreSQL-backed). Use it whenever the user asks to operate on Moyuan novel
  data through the API or CLI rather than the browser UI.
---

# 墨缘 (Moyuan) CLI Skill

## Purpose

墨缘 is a novel character-relationship graph app. This skill lets an AI agent
operate on Moyuan data (novels, characters, relations) through the **墨剑 CLI**,
which calls the Moyuan REST API. The CLI prints JSON to stdout, making it easy
to parse and chain.

This skill lives in the repository (not in `.codebuddy`) because it is used to
**maintain the code and data**, not distributed as an end-user add-on. If it is
ever shared, it is published as an npm package (`moyuan-skill`) and installed via
`npx moyuan-skill`, which copies it into the user-level `~/.codebuddy/skills/`.

## When to use

- The user wants to inspect or edit a Moyuan novel, its characters, or relations.
- The user asks to "add a character / build a relationship graph / export the
  graph" and expects the change to persist to the cloud (CloudBase).
- The user references the Moyuan API, CLI, or "skill" explicitly.

Do **not** use this skill for purely visual/UI edits that the browser app already
handles without persistence.

## Prerequisites

The CLI must be run from the **repository root** (where `package.json` and `cli/`
live). Two environment variables control the target API:

- `MOYUAN_API_URL` — base URL of the API. Default `http://localhost:3000/api`
  (local Vercel dev). For production use `https://<your-vercel-domain>/api`.
- `MOYUAN_API_KEY` — the API key (matches server `MOYUAN_API_KEY`). Required;
  requests without it return `401`.

Run commands with either:

```bash
npm run cli -- <subcommand> [options]
# or via the bundled wrapper (from anywhere inside the repo):
bash skill/scripts/moyuan.sh <subcommand> [options]
```

Dependencies must be installed (`npm install`) so that `tsx` and the workspace
package `@moyuan/core` resolve.

## Command reference

All commands output JSON to stdout. Errors go to stderr as `[<status>] <message>`.

### Novels
- `novel list` — list all novels.
- `novel create --title <t> [--author <a>] [--synopsis <s>] [--theme <color>]`
- `novel get <id>` — full graph (novel + characters + relations) for one novel.
- `novel update <id> [--title] [--author] [--synopsis] [--theme]`
- `novel delete <id>` — delete novel and its characters/relations.

### Characters
- `character add <novelId> --name <n> [--alias] [--role] [--faction] [--color] [--note] [-x 0] [-y 0]`
- `character update <novelId> <charId> [--name] [--alias] [--role] [--faction] [--color] [--note] [-x] [-y]`
- `character remove <novelId> <charId>` — deletes the character and its relations.

### Relations
- `relation add <novelId> --source <charId> --target <charId> --type <type> [--direction one-way|mutual] [--note]`
  - `--type` one of: `kin` `friend` `enemy` `master` `lover` `master-servant` `sect` `other`
- `relation update <novelId> <relId> [--source] [--target] [--type] [--direction] [--note]`
- `relation remove <novelId> <relId>`

### Graph & sync
- `graph <id>` — print the full graph JSON for a novel.
- `reconcile <id> [--file <path.json>]` — submit a complete novel state
  (`{ "novel": {...}, "characters": [...], "relations": [...] }`). When the novel
  does not yet exist it is created. Reads from `--file` or, if omitted, stdin.

## Workflow tips

1. To read the current state before editing, run `graph <id>` and parse the JSON.
2. To build a graph programmatically, assemble the full state object and pipe it
   into `reconcile <id>` via stdin or `--file`. This is the most reliable way to
   create many characters/relations at once and keep the cloud in sync.
3. For single incremental edits (e.g. add one character), prefer the dedicated
   `character add` / `relation add` subcommands.
4. Capture the returned `id` from `novel create` / `character add` / `relation add`
   to build relations that reference them.

See `references/api.md` for the full REST endpoint list and request/response shapes.
