# Staged: In-Memory File System

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min.

Paths are unix-style, `/`-separated, always absolute. The root is `/`.

## Stage 1 — Files & directories

- `mkdir(path)` — create a directory and any missing parents.
- `addFile(path, content)` — create/overwrite a file; parent dirs must exist (else error).
- `readFile(path)` → content or error if missing / is a directory.

## Stage 2 — Listing

- `ls(path)` → if a file, return `[basename]`; if a directory, return immediate child names sorted ascending.
- `exists(path)` → boolean.

## Stage 3 — Move, copy, delete

- `rm(path)` — remove a file or a directory (recursively).
- `mv(src, dst)` and `cp(src, dst)` — move/copy a file or directory subtree. `cp` is a deep copy; mutating the copy must not affect the source.

## Stage 4 — Search & sizing

- `find(root, namePattern)` → all paths under `root` whose basename matches a `*` glob pattern, sorted ascending.
- `size(path)` → bytes for a file (content length), or the recursive sum for a directory.

## Acceptance

Keep all prior operations working. Common traps: parent-existence checks, deep-copy independence, recursive size.
