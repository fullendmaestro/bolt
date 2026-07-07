# Bolt Sports

Bolt Sports is a decentralized, peer-to-peer (P2P) sports streaming and content sharing platform built on Holepunch (Pear runtime) and Electron. It utilizes a schema-first Inter-Process Communication (IPC) architecture and an append-only distributed ledger for robust media synchronization across localized nodes.

## Core Architecture
- **Pear Runtime & Holepunch:** True P2P swarm connectivity using DHT-based discovery. No centralized servers are required for finding peers or routing media.
- **Autobase & Corestore:** Deterministic multi-writer linearization handles decentralized chat and event feeds, synchronized securely using Hypercore.
- **Hyperblobs & BlobServer:** Videos, avatars, and thumbnails are sharded and distributed on the P2P network, served efficiently to the local browser via an integrated HTTP range-request server.
- **Schema-First IPC (hrpc):** Strict backward/forward compatible communication between the Electron UI and the Bare worker, automatically generated using `hyperschema`.

## Development

You can run multiple instances of the app locally to test P2P connectivity on your machine.

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Run Multi-Peer Development Environment:**
   ```bash
   pnpm run dev:peers
   ```
   *This uses Turborepo in TUI mode to safely stagger and launch three isolated peer instances side-by-side.*
