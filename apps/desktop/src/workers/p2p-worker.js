/* eslint-disable */
// @ts-nocheck
Bare.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err) })
Bare.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection at:', promise, 'reason:', reason) })


const PearRuntime = require('pear-runtime')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const goodbye = require('graceful-goodbye')
const b4a = require('b4a')
const path = require('bare-path')
const fs = require('bare-fs')
const crypto = require('hypercore-crypto')

const HRPC = require('../shared/spec/hrpc/index.js')
const Hyperblobs = require('hyperblobs')
const BlobServer = require('hypercore-blob-server')
const Autobase = require('autobase')
const BlindPeering = require('blind-peering')

const {
  loadModel,
  transcribe,
  ragIngest,
  ragSearch,
  plugins,
  registerPlugin,
  PARAKEET_TDT_0_6B_V3_Q8_0,
  GTE_LARGE_FP16
} = require('@qvac/bare-sdk')

async function initAI() {
  try {
    const parakeetModule = await import('@qvac/bare-sdk/parakeet-transcription/plugin');
    const embeddingsModule = await import('@qvac/bare-sdk/llamacpp-embedding/plugin');

    const parakeet = parakeetModule.parakeetPlugin || parakeetModule.default || parakeetModule;
    const embeddings = embeddingsModule.embeddingsPlugin || embeddingsModule.default || embeddingsModule;

    plugins([
      parakeet,
      embeddings
    ]);

    console.log("P2P Worker plugins registered successfully!");
  } catch (err) {
    console.error("Failed to initialize AI plugins:", err);
  }
}

const pipe = Bare.IPC
const rpc = new HRPC(pipe)

const updaterConfig = {
  dir: Bare.argv[2],
  app: Bare.argv[3],
  updates: Bare.argv[4] !== 'false',
  version: Bare.argv[5],
  upgrade: Bare.argv[6],
  name: Bare.argv[7]
}

const store = new Corestore(updaterConfig.dir)
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })

// ── State ──
let blobServer = null
let STREAM_PORT = 0
let transcribeModelId = null
let embedModelId = null
const channels = new Map() // channelKey (hex) -> { baseCore, autobase, blobsCore, blobs, metadata, videos, events }
const ownedChannels = new Set()

// ── Blind Peering ──
// For testing, we connect to a local blind-peer-cli if it exists.
// We use a dummy key here or pass it in. If none, blind-peering just stays inactive.
const relayKey = (typeof Bare !== 'undefined' && Bare.env && Bare.env.BLIND_PEER_KEY) || '0000000000000000000000000000000000000000000000000000000000000000'
const blindPeers = [b4a.from(relayKey, 'hex')]
const blinds = new BlindPeering(swarm, blindPeers)

// ── Swarm ──
swarm.on('connection', (connection) => {
  store.replicate(connection)
})

// ── App Lifecycle ──
Bare.on('suspend', async () => {
  await swarm.suspend()
  pipe.unref()
})

Bare.on('resume', async () => {
  await swarm.resume()
  pipe.ref()
})

// ── Swarm Stats Interval ──
setInterval(() => {
  if (rpc && rpc.channelEvent) {
    try {
      rpc.channelEvent({ eventJson: JSON.stringify({ type: 'swarm-stats', count: swarm.connections.size }) })
    } catch (e) { }
  }
}, 2000)

// ── HTTP Blob Server ──
async function startBlobServer() {
  blobServer = new BlobServer(store.session(), { sandbox: false })
  await blobServer.listen(0, '127.0.0.1')
  STREAM_PORT = blobServer.port
  console.log('[Bolt Worker] Blob Server listening on port', STREAM_PORT)
}

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

// ── RPC Handlers ──

async function loadChannel(channelKey) {
  if (channels.has(channelKey)) return;

  const baseCore = store.get({ key: b4a.from(channelKey, 'hex') })
  await baseCore.ready()

  const autobase = new Autobase(store, baseCore.key, {
    valueEncoding: 'json',
    open: (viewStore) => viewStore.get({ name: 'channel-view', valueEncoding: 'json' }),
    apply: async (nodes, view) => {
      for (const { value } of nodes) {
        if (value) await view.append(value)
      }
    }
  })
  await autobase.ready()

  blinds.addAutobase(autobase)

  const isOwned = ownedChannels.has(channelKey)
  swarm.join(baseCore.discoveryKey, { client: true, server: isOwned })

  const channelData = {
    baseCore,
    autobase,
    blobsCore: null,
    blobs: null,
    metadata: { name: 'Loading...', description: '', videos: [] },
    videos: [],
    events: []
  }
  channels.set(channelKey, channelData)

  const stream = autobase.view.createReadStream({ live: true })
  stream.on('data', (msg) => processAutobaseNode(channelKey, channelData, msg))

  autobase.update()
}

rpc.onInitWorker(async (req) => {
  const channelsToLoad = new Set()

  try {
    const appStateCore = store.get({ name: 'bolt-app-state' })
    await appStateCore.ready()
    const savedChannels = await appStateCore.getUserData('owned-channels')
    if (savedChannels) {
      const parsed = JSON.parse(savedChannels.toString())
      parsed.forEach(k => { ownedChannels.add(k); channelsToLoad.add(k); })
    }
  } catch (err) {
    console.error('Failed to load owned channels', err)
  }

  if (req.ownedChannels) {
    req.ownedChannels.forEach(k => { ownedChannels.add(k); channelsToLoad.add(k); })
  }

  await Promise.all(Array.from(channelsToLoad).map(k => loadChannel(k)))

  return { success: true }
})

rpc.onInitChannel(async (req) => {
  const channelNs = crypto.randomBytes(32)
  const baseCore = store.namespace(channelNs).get({ name: 'channel-base' })
  await baseCore.ready()
  const blobsCore = store.namespace(channelNs).get({ name: 'channel-blobs' })
  await blobsCore.ready()

  const autobase = new Autobase(store, baseCore.key, {
    valueEncoding: 'json',
    open: (viewStore) => viewStore.get({ name: 'channel-view', valueEncoding: 'json' }),
    apply: async (nodes, view) => {
      for (const { value } of nodes) {
        if (value) await view.append(value)
      }
    }
  })
  await autobase.ready()

  const blobs = new Hyperblobs(blobsCore)

  const ownChannelKey = b4a.toString(baseCore.key, 'hex')
  const blobsKeyHex = b4a.toString(blobsCore.key, 'hex')
  ownedChannels.add(ownChannelKey)
  const appStateCore = store.get({ name: 'bolt-app-state' })
  await appStateCore.ready()
  await appStateCore.setUserData('owned-channels', Buffer.from(JSON.stringify(Array.from(ownedChannels))))

  let avatarBlob = null
  let avatarExt = ''
  if (req.avatarPath) {
    try {
      const rs = fs.createReadStream(req.avatarPath)
      const ws = blobs.createWriteStream()
      await new Promise((resolve, reject) => {
        ws.on('error', reject)
        ws.on('close', resolve)
        rs.pipe(ws)
      })
      avatarBlob = { key: blobsKeyHex, ...ws.id }
      avatarExt = path.extname(req.avatarPath)
    } catch (err) {
      console.error('Failed to upload avatar:', err)
    }
  }

  const channelData = {
    baseCore,
    autobase,
    blobsCore,
    blobs,
    metadata: { name: req.name, description: req.description, avatarBlob, avatarExt, blobsKey: blobsKeyHex },
    videos: [],
    events: []
  }
  channels.set(ownChannelKey, channelData)

  // Append init msg
  await autobase.append({
    type: 'init',
    name: req.name,
    description: req.description,
    avatarBlob,
    avatarExt,
    blobsKey: blobsKeyHex
  })

  swarm.join(baseCore.discoveryKey, { server: true, client: true })
  swarm.join(blobsCore.discoveryKey, { server: true, client: true })

  blinds.addAutobase(autobase)
  blinds.addCore(blobsCore)

  // Start reading own autobase view
  const stream = autobase.view.createReadStream({ live: true })
  stream.on('data', (msg) => processAutobaseNode(ownChannelKey, channelData, msg))

  // Update autobase to start apply
  autobase.update()

  return { publicKey: ownChannelKey, name: req.name }
})

rpc.onJoinChannel(async (req) => {
  const { channelKey } = req
  await loadChannel(channelKey)
  return { channelKey }
})

async function processAutobaseNode(channelKey, channelData, msg) {
  if (!msg) return

  if (msg.type === 'init') {
    channelData.metadata.name = msg.name
    channelData.metadata.description = msg.description
    channelData.metadata.avatarBlob = msg.avatarBlob
    channelData.metadata.avatarExt = msg.avatarExt
    channelData.metadata.blobsKey = msg.blobsKey
    channelData.metadata.avatarPath = msg.avatarPath || '' // Legacy fallback
    // FIX: Instantiate the blobsCore for joined channels so media can load
    if (!channelData.blobsCore && msg.blobsKey) {
      const blobsCoreKey = b4a.from(msg.blobsKey, 'hex')
      channelData.blobsCore = store.get({ key: blobsCoreKey })
      await channelData.blobsCore.ready()
      channelData.blobs = new Hyperblobs(channelData.blobsCore)

      // Join the swarm to find peers hosting the media
      const isOwned = ownedChannels.has(channelKey)
      swarm.join(channelData.blobsCore.discoveryKey, { client: true, server: isOwned })

      // Keep blobs available if blind peering is active
      if (typeof blinds !== 'undefined') blinds.addCore(channelData.blobsCore)
    }
  } else if (msg.type === 'video') {
    if (!channelData.videos.find(v => v.id === msg.video.id)) {
      channelData.videos.unshift(msg.video)
    }
  } else if (msg.type === 'event') {
    channelData.events.push(msg.event)
    rpc.channelEvent({ eventJson: JSON.stringify({ ...msg.event, channelKey }) })
  }
}

rpc.onLeaveChannel(async (req) => {
  const { channelKey } = req
  if (channels.has(channelKey) && !ownedChannels.has(channelKey)) {
    const channel = channels.get(channelKey)
    if (channel.baseCore) await swarm.leave(channel.baseCore.discoveryKey)
    if (channel.blobsCore) await swarm.leave(channel.blobsCore.discoveryKey)
    if (channel.autobase) await channel.autobase.close()
    await swarm.flush()
    channels.delete(channelKey)
  }
  return { channelKey }
})

rpc.onGetFeed(async () => {
  const items = []
  for (const [channelKey, channel] of channels) {
    if (!channel.metadata.name || channel.metadata.name === 'Loading...') continue

    // 1. Format the Channel Avatar
    let channelAvatar = channel.metadata.avatarPath || ''
    if (channel.blobsCore && channel.metadata.avatarBlob) {
      channelAvatar = blobServer.getLink(b4a.toString(channel.blobsCore.key, 'hex'), {
        blob: channel.metadata.avatarBlob,
        type: getMimeType('dummy' + channel.metadata.avatarExt)
      })
    }

    // 2. Format all Videos in the channel
    for (const v of channel.videos) {
      let thumbnailPath = v.thumbnailPath || ''
      if (channel.blobsCore && v.thumbnailBlob) {
        thumbnailPath = blobServer.getLink(b4a.toString(channel.blobsCore.key, 'hex'), {
          blob: v.thumbnailBlob,
          type: getMimeType('dummy' + v.thumbnailExt)
        })
      }

      const safeVideo = { ...v }
      delete safeVideo.blob
      delete safeVideo.thumbnailBlob
      safeVideo.thumbnailPath = thumbnailPath

      items.push({
        channelKey,
        channelName: channel.metadata.name,
        channelAvatar,
        video: safeVideo
      })
    }
  }

  // Sort from newest to oldest
  items.sort((a, b) => new Date(b.video.timestamp).getTime() - new Date(a.video.timestamp).getTime())

  return { itemsJson: JSON.stringify(items) }
})

rpc.onGetChannels(async () => {
  const owned = []
  const joined = []

  for (const [channelKey, channel] of channels) {
    let avatar = channel.metadata.avatarPath || ''
    if (channel.blobsCore && channel.metadata.avatarBlob) {
      avatar = blobServer.getLink(b4a.toString(channel.blobsCore.key, 'hex'), { blob: channel.metadata.avatarBlob, type: getMimeType('dummy' + channel.metadata.avatarExt) })
    }

    const info = {
      publicKey: channelKey,
      name: channel.metadata.name || 'Loading...',
      description: channel.metadata.description || '',
      avatar,
      isOwned: ownedChannels.has(channelKey)
    }

    if (info.isOwned) owned.push(info)
    else joined.push(info)
  }

  return { channelsJson: JSON.stringify({ owned, joined }) }
})

rpc.onGetUploads(async (req) => {
  const activeChannelKey = req.channelKey || Array.from(ownedChannels).pop()
  if (!activeChannelKey || !channels.has(activeChannelKey)) {
    return { channelJson: JSON.stringify(null) }
  }

  const channel = channels.get(activeChannelKey)
  let avatar = channel.metadata.avatarPath || ''
  if (channel.blobsCore && channel.metadata.avatarBlob) {
    avatar = blobServer.getLink(b4a.toString(channel.blobsCore.key, 'hex'), { blob: channel.metadata.avatarBlob, type: getMimeType('dummy' + channel.metadata.avatarExt) })
  }

  const videos = channel.videos.map(v => {
    let thumbnailPath = v.thumbnailPath || ''
    if (channel.blobsCore && v.thumbnailBlob) {
      thumbnailPath = blobServer.getLink(b4a.toString(channel.blobsCore.key, 'hex'), { blob: v.thumbnailBlob, type: getMimeType('dummy' + v.thumbnailExt) })
    }
    const safeVideo = { ...v }
    delete safeVideo.blob
    delete safeVideo.thumbnailBlob
    return { ...safeVideo, thumbnailPath }
  })

  const channelData = {
    publicKey: activeChannelKey,
    name: channel.metadata.name,
    description: channel.metadata.description,
    avatar,
    videos
  }

  return { channelJson: JSON.stringify(channelData) }
})

rpc.onUploadVideo(async (req) => {
  const activeChannelKey = req.channelKey || Array.from(ownedChannels).pop()
  if (!activeChannelKey) {
    throw new Error('Channel not initialized')
  }

  const channel = channels.get(activeChannelKey)
  if (!channel) throw new Error('Channel not found')
  const videoId = b4a.toString(crypto.randomBytes(8), 'hex')

  const rs = fs.createReadStream(req.filePath)
  const ws = channel.blobs.createWriteStream()

  const totalBytes = fs.statSync(req.filePath).size
  let uploadedBytes = 0

  rs.on('data', chunk => {
    uploadedBytes += chunk.length
    rpc.uploadProgress({
      videoId,
      percent: Math.round((uploadedBytes / totalBytes) * 100),
      bytesReceived: uploadedBytes,
      totalBytes
    })
  })

  await new Promise((resolve, reject) => {
    ws.on('error', reject)
    ws.on('close', resolve)
    rs.pipe(ws)
  })

  const blob = { key: channel.metadata.blobsKey, ...ws.id }

  let thumbnailBlob = null
  let thumbnailExt = ''
  if (req.thumbnailPath) {
    try {
      const rsThumb = fs.createReadStream(req.thumbnailPath)
      const wsThumb = channel.blobs.createWriteStream()
      await new Promise((resolve, reject) => {
        wsThumb.on('error', reject)
        wsThumb.on('close', resolve)
        rsThumb.pipe(wsThumb)
      })
      thumbnailBlob = { key: channel.metadata.blobsKey, ...wsThumb.id }
      thumbnailExt = path.extname(req.thumbnailPath)
    } catch (err) {
      console.error('Failed to upload thumbnail:', err)
    }
  }

  const workspaceId = `rag-${videoId}`

  try {
    if (!transcribeModelId) {
      transcribeModelId = await loadModel({
        modelType: "parakeet",
        modelSrc: PARAKEET_TDT_0_6B_V3_Q8_0,
      })
    }
    if (!embedModelId) {
      embedModelId = await loadModel({ modelSrc: GTE_LARGE_FP16 })
    }

    const transcriptRes = await transcribe({
      modelId: transcribeModelId,
      audioChunk: { type: 'filePath', value: req.filePath }
    })

    if (transcriptRes.text) {
      await ragIngest({
        workspace: workspaceId,
        modelId: embedModelId,
        documents: [transcriptRes.text],
        chunk: true
      })
    }
  } catch (err) {
    console.error('RAG ingest failed during upload:', err)
  }

  const videoEntry = {
    id: videoId,
    title: req.title,
    timestamp: new Date().toISOString(),
    sizeBytes: totalBytes,
    duration: req.duration,
    filename: path.basename(req.filePath),
    blob,
    thumbnailBlob,
    thumbnailExt,
    workspaceId,
    isLive: false
  }

  await channel.autobase.append({
    type: 'video',
    video: videoEntry
  })

  return { videoJson: JSON.stringify(videoEntry) }
})

rpc.onStartStream(async (req) => {
  const { channelKey, videoId } = req
  const channel = channels.get(channelKey)
  if (!channel) throw new Error('Channel not found')

  const video = channel.videos.find(v => v.id === videoId)
  if (!video) throw new Error('Video not found')

  if (!channel.blobsCore) throw new Error('Blobs core not ready')

  const link = blobServer.getLink(b4a.toString(channel.blobsCore.key, 'hex'), { blob: video.blob, type: getMimeType(video.filename) })

  return { url: link, channelKey, videoId }
})

rpc.onInjectEvent(async (req) => {
  const activeChannelKey = req.channelKey || Array.from(ownedChannels).pop()
  if (!activeChannelKey) throw new Error('Channel not initialized')

  const channel = channels.get(activeChannelKey)
  if (!channel) throw new Error('Channel not found')

  const eventData = JSON.parse(req.eventJson)
  await channel.autobase.append({
    type: 'event',
    event: eventData
  })

  return { success: true }
})

rpc.onDownloadVideo(async (req) => {
  const { channelKey, videoId, destinationPath } = req
  const channel = channels.get(channelKey)
  if (!channel) throw new Error('Channel not found')

  const video = channel.videos.find(v => v.id === videoId)
  if (!video) throw new Error('Video not found')

  const totalBytes = video.sizeBytes || 0
  let bytesReceived = 0

  const readStream = channel.blobs.createReadStream(video.blob)
  const writeStream = fs.createWriteStream(destinationPath)

  readStream.on('data', (chunk) => {
    bytesReceived += chunk.length
    const percent = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0
    rpc.downloadProgress({ videoId, channelKey, percent, bytesReceived, totalBytes })
  })

  await new Promise((resolve, reject) => {
    writeStream.on('error', reject)
    writeStream.on('close', resolve)
    readStream.pipe(writeStream)
  })

  return { destinationPath }
})

rpc.onRagQuery(async (req) => {
  const { workspaceId, query } = req
  if (!embedModelId) {
    embedModelId = await loadModel({ modelSrc: GTE_LARGE_FP16 })
  }
  const res = await ragSearch({
    workspace: workspaceId,
    modelId: embedModelId,
    query
  })
  return { resultsJson: JSON.stringify(res.results || []) }
})

// ── Graceful Shutdown ──
goodbye(async () => {
  if (blobServer) await blobServer.close()
  await swarm.destroy()
  await pear.close()
  await store.close()
})

// ── Signal Readiness ──
initAI().then(() => startBlobServer()).then(() => {
  rpc.workerReady({})
}).catch(err => {
  console.error('Failed to start worker server:', err)
  rpc.workerReady({})
})







































