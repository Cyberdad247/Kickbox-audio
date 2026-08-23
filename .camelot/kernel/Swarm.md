# Swarm Topology
- Concurrency: Max 5 parallel microVM workers.
- Isolation: Copy-on-Write (CoW) git worktrees.
- Engine: SmolVM / WasmEdge sandboxed execution.
- Memory: Shared vector stores mapped to SurrealDB / SQLite WAL2.
