# Counselors Skill

Fan out a prompt to multiple AI coding agents in parallel and synthesize their responses. Built on [aarondfrancis/counselors](https://github.com/aarondfrancis/counselors).

## Prerequisites

```bash
npm install -g counselors
counselors init
```

## Usage

```
/counselors review the auth flow for security issues
/counselors is this database migration safe to run?
/counselors review my recent changes for bugs
```

If invoked without arguments, the skill will ask what you want reviewed.

## How it works

1. **Gathers context** — finds relevant files, recent git changes, and related code
2. **Lists agents** — runs `counselors ls` and asks you to pick which agents to consult
3. **Assembles a prompt** — writes a structured review request to `./agents/counselors/`
4. **Dispatches in parallel** — sends to all selected agents simultaneously via `counselors run`
5. **Synthesizes results** — reads all responses and presents consensus, disagreements, risks, and a recommendation

## Submodule

The `counselors/` subdirectory is a git submodule pointing to the upstream repo for reference and installation.
