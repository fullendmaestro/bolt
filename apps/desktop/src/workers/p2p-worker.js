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
  } catch (err) {
    console.error('readDriveJSON error:', err)
    return null
  }
}

async function writeDriveJSON(drive, filePath, data) {
  await drive.put(filePath, b4a.from(JSON.stringify(data, null, 2)))
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

// ── MIME type helper ──────────────────────────────────────

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  return types[ext] || 'application/octet-stream'
}

// Pipe a bare-fs readable into a Hyperdrive writable, returning a Promise
function pipeToHyperdrive(sourceStream, driveWriteStream) {
  return new Promise((resolve, reject) => {
    sourceStream.on('error', reject)
    driveWriteStream.on('error', reject)
    driveWriteStream.on('finish', resolve)
    driveWriteStream.on('close', resolve)
    sourceStream.pipe(driveWriteStream)
  })
}

// ── Channel Initialization (for channel owners) ────────────

async function initChannel(name, description, avatarPath) {
  try {
    if (ownDrive) {
      // Already initialized — return existing key
      send({ type: 'channel-initialized', publicKey: ownChannelKey, name })
      return
    }

    ownDrive = new Hyperdrive(store)
    await ownDrive.ready()

    ownChannelKey = b4a.toString(ownDrive.key, 'hex')

    // Write avatar to drive if provided
    let avatarDrivePath = ''
    if (avatarPath) {
      try {
        const ext = path.extname(avatarPath).toLowerCase() || '.jpg'
        avatarDrivePath = '/assets/avatar' + ext
        const readStream = fs.createReadStream(avatarPath)
        const writeStream = ownDrive.createWriteStream(avatarDrivePath)
        await pipeToHyperdrive(readStream, writeStream)
      } catch (avatarErr) {
        console.error('[initChannel] Avatar upload failed:', avatarErr.message)
        avatarDrivePath = ''
      }
    }

    // Write initial metadata
    const metadata = {
      name,
      description,
      avatar: avatarDrivePath,
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

async function uploadVideo(filePath, title, duration, thumbnailPath) {
  try {
    if (!ownDrive) {
      // Auto-initialize the channel if not done
      await initChannel('My Bolt Node', 'Personal sports channel', null)
    }

    const videoId = generateVideoId()
    const filename = path.basename(filePath)
    const drivePath = '/videos/' + videoId + '/' + filename

    // Memory-safe streaming upload: pipe directly from OS file → Hyperdrive
    const stat = fs.statSync(filePath)
    const readStream = fs.createReadStream(filePath)
    const writeStream = ownDrive.createWriteStream(drivePath)
    await pipeToHyperdrive(readStream, writeStream)

    // Upload thumbnail if provided
    let thumbnailDrivePath = undefined
    if (thumbnailPath) {
      try {
        const thumbExt = path.extname(thumbnailPath).toLowerCase() || '.jpg'
        thumbnailDrivePath = '/videos/' + videoId + '/thumb' + thumbExt
        const thumbRead = fs.createReadStream(thumbnailPath)
        const thumbWrite = ownDrive.createWriteStream(thumbnailDrivePath)
        await pipeToHyperdrive(thumbRead, thumbWrite)
      } catch (thumbErr) {
        console.error('[uploadVideo] Thumbnail upload failed:', thumbErr.message)
        thumbnailDrivePath = undefined
      }
    }

    const videoEntry = {
      id: videoId,
      title,
      timestamp: new Date().toISOString(),
      sizeBytes: stat.size,
      duration: duration || '0:00',
      filename,
      drivePath,
      isLive: false,
      ...(thumbnailDrivePath ? { thumbnailPath: thumbnailDrivePath } : {})
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
    // Always set CORS headers first (covers preflight and all responses)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    try {
      // URL format:
      //   /stream/<channelKey>/video/<videoId>          → video file
      //   /stream/<channelKey>/assets/<filename>        → image asset
      //   /stream/<channelKey>/<videoId>               → legacy video (backward compat)
      const parts = req.url.split('/').filter(Boolean)

      if (parts[0] !== 'stream' || parts.length < 3) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const channelKey = parts[1]
      const drive = joinedDrives.get(channelKey)
      if (!drive) {
        res.statusCode = 404
        res.end('Channel not found')
        return
      }

      // ── Asset request: /stream/<channelKey>/assets/<filename> ──
      if (parts[2] === 'assets' && parts[3]) {
        const assetDrivePath = '/assets/' + parts[3]
        const assetBuf = await drive.get(assetDrivePath)
        if (!assetBuf) {
          res.statusCode = 404
          res.end('Asset not found')
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', getMimeType(parts[3]))
        res.setHeader('Content-Length', assetBuf.byteLength)
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.end(assetBuf)
        return
      }

      // ── Thumbnail request: /stream/<channelKey>/videos/<videoId>/thumb.<ext> ──
      if (parts[2] === 'videos' && parts[4] && parts[4].startsWith('thumb')) {
        const thumbDrivePath = '/videos/' + parts[3] + '/' + parts[4]
        const thumbBuf = await drive.get(thumbDrivePath)
        if (!thumbBuf) {
          res.statusCode = 404
          res.end('Thumbnail not found')
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', getMimeType(parts[4]))
        res.setHeader('Content-Length', thumbBuf.byteLength)
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.end(thumbBuf)
        return
      }

      // ── Video stream request ──
      // Support both /stream/<channelKey>/<videoId> and /stream/<channelKey>/video/<videoId>
      const videoId = parts[2] === 'video' ? parts[3] : parts[2]

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

      const totalSize = video.sizeBytes || 0
      const contentType = getMimeType(video.filename || video.drivePath)

      // ── RFC 7233 Partial Content (range requests for seeking) ──
      const rangeHeader = req.headers['range'] || req.headers['Range']
      if (rangeHeader && totalSize > 0) {
        const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10)
          // Clamp end to totalSize-1 per RFC 7233 §2.1
          const end = rangeMatch[2]
            ? Math.min(parseInt(rangeMatch[2], 10), totalSize - 1)
            : totalSize - 1

          if (start > end || start >= totalSize) {
            res.statusCode = 416 // Range Not Satisfiable
            res.setHeader('Content-Range', 'bytes */' + totalSize)
            res.end()
            return
          }

          const chunkSize = end - start + 1

          res.statusCode = 206
          res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + totalSize)
          res.setHeader('Accept-Ranges', 'bytes')
          res.setHeader('Content-Length', String(chunkSize))
          res.setHeader('Content-Type', contentType)

          const stream = drive.createReadStream(video.drivePath, { start, length: chunkSize })
          stream.on('error', (err) => {
            console.error('[streamServer] Range stream error:', err.message)
            if (!res.headersSent) {
              res.statusCode = 500
              res.end('Stream error')
            }
          })
          stream.pipe(res)
          return
        }
      }

      // ── Full (non-range) response ──
      res.statusCode = 200
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Type', contentType)
      if (totalSize > 0) {
        res.setHeader('Content-Length', String(totalSize))
      }

      const stream = drive.createReadStream(video.drivePath)
      stream.on('error', (err) => {
        console.error('[streamServer] Full stream error:', err.message)
        if (!res.headersSent) {
          res.statusCode = 500
          res.end('Stream error')
        }
      })
      stream.pipe(res)
    } catch (err) {
      console.error('[streamServer] Unhandled error:', err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    }
  })

  streamServer.listen(0, '127.0.0.1', () => {
    STREAM_PORT = streamServer.address().port
    console.log('[Bolt] Stream server listening on http://127.0.0.1:' + STREAM_PORT)
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

// ── Download & Seed ────────────────────────────────────────

async function downloadVideo(channelKey, videoId, destinationPath) {
  try {
    const drive = joinedDrives.get(channelKey)
    if (!drive) {
      send({ type: 'error', message: 'Channel not joined', command: 'download-video' })
      return
    }

    const metadata = await readDriveJSON(drive, '/metadata.json')
    if (!metadata) {
      send({ type: 'error', message: 'Channel metadata not found', command: 'download-video' })
      return
    }

    const video = (metadata.videos || []).find((v) => v.id === videoId)
    if (!video) {
      send({ type: 'error', message: 'Video not found in channel', command: 'download-video' })
      return
    }

    const totalBytes = video.sizeBytes || 0
    let bytesReceived = 0

    const readStream = drive.createReadStream(video.drivePath)
    const writeStream = fs.createWriteStream(destinationPath)

    readStream.on('error', (err) => {
      console.error('[downloadVideo] Read error:', err.message)
      writeStream.destroy()
      send({ type: 'error', message: 'Download failed: ' + err.message, command: 'download-video' })
    })

    writeStream.on('error', (err) => {
      console.error('[downloadVideo] Write error:', err.message)
      readStream.destroy()
      send({ type: 'error', message: 'Download write failed: ' + err.message, command: 'download-video' })
    })

    readStream.on('data', (chunk) => {
      bytesReceived += chunk.byteLength || chunk.length || 0
      const percent = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0
      send({ type: 'download-progress', videoId, channelKey, percent, bytesReceived, totalBytes })
    })

    writeStream.on('finish', () => {
      // Corestore has now cached all blocks — this node is seeding!
      send({ type: 'download-complete', videoId, channelKey, destinationPath })
      console.log('[downloadVideo] Complete. Now seeding:', destinationPath)
    })

    readStream.pipe(writeStream)
  } catch (err) {
    send({ type: 'error', message: err.message, command: 'download-video' })
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
        await initChannel(msg.name, msg.description, msg.avatarPath || null)
        break
      case 'upload-video':
        await uploadVideo(msg.filePath, msg.title, msg.duration, msg.thumbnailPath || null)
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
      case 'download-video':
        await downloadVideo(msg.channelKey, msg.videoId, msg.destinationPath)
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
