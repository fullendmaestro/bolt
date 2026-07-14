# Bolt P2P ⚡️

A decentralized, peer-to-peer sports streaming platform built on the Holepunch stack. Bolt completely removes central servers, allowing creators to broadcast, users to watch, and the community to seed streams locally without relying on centralized server.

---

## 🛠️ Tech Stack

* **Frontend:** React, Tailwind CSS, Shadcn UI, Vite.


* **Desktop Environment:** Electron.


* **P2P Backend:** Pear Runtime, Bare, Corestore, Hyperswarm, Autobase.


* **Local AI:** LLaMA 3.2 / QVAC SDK.


* **IPC/RPC:** HRPC (Hyperschema RPC) for seamless communication between Electron and the isolated Pear worker.



---

## 🚀 Getting Started

### Prerequisites

* Node.js (v20+)


* `pnpm` (v10.33.4+)



### Installation & Running

1. Install dependencies across the monorepo:
```bash
pnpm install
```

2. Build the initial worker and RPC bindings (this creates `worker.js` and other necessary compiled files):
```bash
pnpm run build
```

3. Run the standard development environment:
```bash
pnpm run dev
```


3. **Testing the Swarm Locally:**
To test peer-to-peer connections on a single machine, use the included Turborepo script to spin up multiple isolated instances (Seeder, Peer-1, Peer-2):
```bash
pnpm run dev:peers

```


Or to preview the built application with multiple peers:
```bash
pnpm run preview:peers

```



### Clearing Data

If you need to wipe your local Corestore and channel data to start fresh:

```bash
pnpm run clean:data

```

---

## 🏗️ Architecture

Bolt runs a **Pear Runtime worker** in the background that handles all Holepunch networking, keeping the heavy P2P lifting separate from the UI thread. The frontend (React) talks to the Main Process (Electron), which communicates with the Worker via a custom `HRPC` protocol over Bare IPC.