# Start here in Claude Code

## First prompt

Paste the contents of `PASTE_THIS_INTO_CLAUDE.txt`.

## After Claude assesses the project

Approve only one focused improvement at a time. A useful prompt pattern is:

```text
Follow CLAUDE.md and FILE_MAP.md. Implement only this change: [one exact behavior].

Read only [target page], [target page script], and shared files that are truly required. Preserve all existing flows. Test the changed flow in the browser, check the console, and report the exact files changed.
```

## Recommended improvement order

1. Fix any demo-blocking defect Claude finds.
2. Improve one Smart Request interaction.
3. Improve one receiver queue interaction.
4. Improve one freight explanation or decision interaction.
5. Final accessibility, mobile, console, and reset-data validation.

Do not ask Claude to rebuild the whole application or add live integrations during the one-week prototype.
