/* eslint-disable */
// @ts-nocheck
// ============================================================
// Bolt P2P Worker — Runs inside pear-runtime (Bare)
// This is NOT a Node.js file. It uses Bare globals and bare-* modules.
// Do NOT bundle this with Rollup/Vite.
// ============================================================

const PearRuntime = require('pear-runtime')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const goodbye = require('graceful-goodbye')
const FramedStream = require('framed-stream')
const crypto = require('hypercore-crypto')
const b4a = require('b4a')
const path = require('bare-path')
const fs = require('bare-fs')
const http = require('bare-http1')

// ── IPC pipe to the Electron main process ──────────────────
const pipe = new FramedStream(Bare.IPC)

// ── Parse args from PearRuntime.run() in main/index.ts ─────
const updaterConfig = {
  dir: Bare.argv[2],
  app: Bare.argv[3],
  updates: Bare.argv[4] !== 'false',
  version: Bare.argv[5],
  upgrade: Bare.argv[6],
  name: Bare.argv[7]
}

// ── Initialize core infrastructure ─────────────────────────
const storePath = path.join(updaterConfig.dir, 'bolt-runtime/corestore')
const store = new Corestore(storePath)
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })

// ── State ──────────────────────────────────────────────────
/** @type {Map<string, Hyperdrive>} channelKey -> Hyperdrive instance */
const joinedDrives = new Map()

/** @type {Hyperdrive|null} The user's own channel drive (writable) */
let ownDrive = null

/** @type {string|null} Hex public key of the user's own channel */
let ownChannelKey = null

/** @type {import('bare-http1').Server|null} */
let streamServer = null

let STREAM_PORT = 0

// ── Helpers ────────────────────────────────────────────────
function send(msg) {
  try {
    pipe.write(Buffer.from(JSON.stringify(msg)))
  } catch (err) {
    console.error('Worker send error:', err)
  }
}

function generateVideoId() {
  return b4a.toString(crypto.randomBytes(8), 'hex')
}

async function readDriveJSON(drive, filePath) {
  try {
    const buf = await drive.get(filePath)
    if (!buf) return null
    return JSON.parse(b4a.toString(buf))
  } catch {
    return null
  }
}

async function writeDriveJSON(drive, filePath, data) {
  await drive.put(filePath, Buffer.from(JSON.stringify(data, null, 2)))
}

// ── Swarm connection handler ───────────────────────────────
swarm.on('connection', (connection) => {
  store.replicate(connection)
})

// ── Channel Operations ─────────────────────────────────────

async function joinChannel(channelKey) {
  try {
    if (joinedDrives.has(channelKey)) {
      send({ type: 'channel-joined', channelKey })
      return
    }

    const keyBuf = b4a.from(channelKey, 'hex')
    const drive = new Hyperdrive(store, keyBuf)
    await drive.ready()

    joinedDrives.set(channelKey, drive)

    // Join the swarm on the drive's discovery key
    const discovery = swarm.join(drive.discoveryKey, { client: true, server: true })
    await discovery.flushed()

    // Watch for live events file
    watchChannelEvents(channelKey, drive)

    send({ type: 'channel-joined', channelKey })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'join-channel' })
  }
}

async function leaveChannel(channelKey) {
  try {
    const drive = joinedDrives.get(channelKey)
    if (drive) {
      joinedDrives.delete(channelKey)
      await drive.close()
    }
    send({ type: 'channel-left', channelKey })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'leave-channel' })
  }
}

async function getFeed() {
  try {
    const items = []

    for (const [channelKey, drive] of joinedDrives) {
      const metadata = await readDriveJSON(drive, '/metadata.json')
      if (!metadata) continue

      const channelName = metadata.name || 'Unknown Channel'
      const channelAvatar = metadata.avatar || ''

      for (const video of (metadata.videos || [])) {
        items.push({
          video,
          channelKey,
          channelName,
          channelAvatar
        })
      }
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => {
      const ta = new Date(a.video.timestamp).getTime()
      const tb = new Date(b.video.timestamp).getTime()
      return tb - ta
    })

    send({ type: 'feed-data', items })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'get-feed' })
  }
}

// ── Channel Initialization (for channel owners) ────────────

async function initChannel(name, description) {
  try {
    if (ownDrive) {
      // Already initialized — return existing key
      send({ type: 'channel-initialized', publicKey: ownChannelKey, name })
      return
    }

    ownDrive = new Hyperdrive(store)
    await ownDrive.ready()

    ownChannelKey = b4a.toString(ownDrive.key, 'hex')

    // Write initial metadata
    const metadata = {
      name,
      description,
      avatar: '',
      videos: []
    }
    await writeDriveJSON(ownDrive, '/metadata.json', metadata)

    // Create an empty events file
    await writeDriveJSON(ownDrive, '/events.jsonl', [])

    // Join the swarm so others can discover this channel
    const discovery = swarm.join(ownDrive.discoveryKey, { client: true, server: true })
    await discovery.flushed()

    // Also add to joined drives so we can see our own content
    joinedDrives.set(ownChannelKey, ownDrive)

    send({ type: 'channel-initialized', publicKey: ownChannelKey, name })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'init-channel' })
  }
}

// ── Video Upload ───────────────────────────────────────────

async function uploadVideo(filePath, title, duration) {
  try {
    if (!ownDrive) {
      // Auto-initialize the channel if not done
      await initChannel('My Bolt Node', 'Personal sports channel')
    }

    const videoId = generateVideoId()
    const filename = path.basename(filePath)
    const drivePath = '/videos/' + videoId + '/' + filename

    // Read the file and write to the Hyperdrive
    const fileData = fs.readFileSync(filePath)
    await ownDrive.put(drivePath, fileData)

    const stat = fs.statSync(filePath)

    const videoEntry = {
      id: videoId,
      title,
      timestamp: new Date().toISOString(),
      sizeBytes: stat.size,
      duration: duration || '0:00',
      filename,
      drivePath,
      isLive: false
    }

    // Update metadata
    const metadata = (await readDriveJSON(ownDrive, '/metadata.json')) || {
      name: 'My Bolt Node',
      description: '',
      avatar: '',
      videos: []
    }
    metadata.videos.unshift(videoEntry)
    await writeDriveJSON(ownDrive, '/metadata.json', metadata)

    send({ type: 'upload-complete', video: videoEntry })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'upload-video' })
  }
}

async function getUploads() {
  try {
    if (!ownDrive) {
      send({ type: 'uploads-data', channel: null })
      return
    }

    const metadata = await readDriveJSON(ownDrive, '/metadata.json')
    send({
      type: 'uploads-data',
      channel: metadata
        ? {
            publicKey: ownChannelKey,
            name: metadata.name,
            description: metadata.description,
            avatar: metadata.avatar,
            videos: metadata.videos || []
          }
        : null
    })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'get-uploads' })
  }
}

// ── Streaming HTTP Server ──────────────────────────────────

function startStreamServer() {
  if (streamServer) return

  streamServer = http.createServer(async (req, res) => {
    try {
      // Parse URL: /stream/<channelKey>/<videoId>
      const parts = req.url.split('/').filter(Boolean)

      if (parts[0] !== 'stream' || parts.length < 3) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const channelKey = parts[1]
      const videoId = parts[2]

      const drive = joinedDrives.get(channelKey)
      if (!drive) {
        res.statusCode = 404
        res.end('Channel not found')
        return
      }

      // Read metadata to find the video path
      const metadata = await readDriveJSON(drive, '/metadata.json')
      if (!metadata) {
        res.statusCode = 404
        res.end('Channel metadata not found')
        return
      }

      const video = (metadata.videos || []).find((v) => v.id === videoId)
      if (!video) {
        res.statusCode = 404
        res.end('Video not found')
        return
      }

      // Read the full video from the drive
      const data = await drive.get(video.drivePath)
      if (!data) {
        res.statusCode = 404
        res.end('Video data not found in drive')
        return
      }

      // Handle Range requests for video seeking
      const rangeHeader = req.headers.range
      const totalSize = data.length

      if (rangeHeader) {
        const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10)
          const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1
          const chunkSize = end - start + 1

          res.statusCode = 206
          res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + totalSize)
          res.setHeader('Accept-Ranges', 'bytes')
          res.setHeader('Content-Length', chunkSize)
          res.setHeader('Content-Type', 'video/mp4')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(data.slice(start, end + 1))
          return
        }
      }

      // Full response
      res.statusCode = 200
      res.setHeader('Content-Length', totalSize)
      res.setHeader('Content-Type', 'video/mp4')
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(data)
    } catch (err) {
      console.error('Stream server error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  streamServer.listen(0, '127.0.0.1', () => {
    STREAM_PORT = streamServer.address().port
    console.log('Bolt stream server listening on http://127.0.0.1:' + STREAM_PORT)
  })
}

async function startStream(channelKey, videoId) {
  try {
    // Ensure the streaming server is running and wait for it to bind
    if (!streamServer) {
      await new Promise((resolve) => {
        startStreamServer()
        streamServer.once('listening', resolve)
      })
    }

    const url = 'http://127.0.0.1:' + STREAM_PORT + '/stream/' + channelKey + '/' + videoId
    send({ type: 'stream-url', url, channelKey, videoId })
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'start-stream' })
  }
}

// ── Channel Event Watching (Task 4: AI Context) ────────────

const eventWatchers = new Map()

function watchChannelEvents(channelKey, drive) {
  if (eventWatchers.has(channelKey)) return

  let lastEventCount = 0

  const interval = setInterval(async () => {
    try {
      const events = await readDriveJSON(drive, '/events.jsonl')
      if (!events || !Array.isArray(events)) return

      // Send only new events
      if (events.length > lastEventCount) {
        const newEvents = events.slice(lastEventCount)
        for (const evt of newEvents) {
          send({
            type: 'channel-event',
            event: { ...evt, channelKey }
          })
        }
        lastEventCount = events.length
      }
    } catch {
      // Silently ignore — the file may not exist yet
    }
  }, 3000) // Poll every 3 seconds

  eventWatchers.set(channelKey, interval)
}

async function injectEvent(event) {
  try {
    if (!ownDrive) {
      send({ type: 'error', message: 'No channel initialized', command: 'inject-event' })
      return
    }

    const events = (await readDriveJSON(ownDrive, '/events.jsonl')) || []
    events.push({ ...event, channelKey: ownChannelKey })
    await writeDriveJSON(ownDrive, '/events.jsonl', events)
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'inject-event' })
  }
}

// ── IPC Message Handler ────────────────────────────────────

pipe.on('data', async (data) => {
  let msg = null
  try {
    msg = JSON.parse(data.toString())
  } catch {
    return
  }

  try {
    switch (msg.type) {
      case 'join-channel':
        await joinChannel(msg.channelKey)
        break
      case 'leave-channel':
        await leaveChannel(msg.channelKey)
        break
      case 'get-feed':
        await getFeed()
        break
      case 'init-channel':
        await initChannel(msg.name, msg.description)
        break
      case 'upload-video':
        await uploadVideo(msg.filePath, msg.title, msg.duration)
        break
      case 'get-uploads':
        await getUploads()
        break
      case 'start-stream':
        await startStream(msg.channelKey, msg.videoId)
        break
      case 'inject-event':
        await injectEvent(msg.event)
        break
      default:
        console.log('Unknown command:', msg.type)
    }
  } catch (err) {
    send({ type: 'error', message: err.message, command: msg.type })
  }
})

// ── Graceful Shutdown ──────────────────────────────────────

goodbye(async () => {
  // Clear event watchers
  for (const interval of eventWatchers.values()) {
    clearInterval(interval)
  }
  eventWatchers.clear()

  // Close stream server
  if (streamServer) {
    streamServer.close()
  }

  // Close all drives
  for (const drive of joinedDrives.values()) {
    try { await drive.close() } catch {}
  }
  if (ownDrive) {
    try { await ownDrive.close() } catch {}
  }

  await swarm.destroy()
  await pear.close()
  await store.close()
})

// ── Signal readiness ───────────────────────────────────────
send({ type: 'worker-ready' })
