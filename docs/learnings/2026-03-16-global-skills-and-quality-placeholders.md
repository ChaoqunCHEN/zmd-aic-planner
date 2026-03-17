# Shared global skills and placeholder quality skills

- Global skills for this environment should be created in `~/.agent/skills`; `~/agent-skills`, `~/.codex/skills`, and `~/.claude/skills` are symlinks to that canonical directory.
- The current shared `code-review` and `simplify-code` skills are placeholder scaffolds, so workflows that reference them should treat them as optional quality aids and fall back to direct review and simplification when needed.
