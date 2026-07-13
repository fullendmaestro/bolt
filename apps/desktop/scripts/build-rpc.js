const HRPCBuilder = require('hrpc')
const Hyperschema = require('hyperschema')
const path = require('path')

const SCHEMA_DIR = path.join(__dirname, '..', 'src', 'shared', 'spec', 'hyperschema')
const HRPC_DIR = path.join(__dirname, '..', 'src', 'shared', 'spec', 'hrpc')

// register schema
const schema = Hyperschema.from(SCHEMA_DIR)
const schemaNs = schema.namespace('bolt')

// ── Requests (Main -> Worker) ──
schemaNs.register({
  name: 'join-channel-request',
  fields: [{ name: 'channelKey', type: 'string' }]
})
schemaNs.register({
  name: 'channel-response',
  fields: [{ name: 'channelKey', type: 'string' }]
})

schemaNs.register({
  name: 'empty-request',
  fields: []
})
schemaNs.register({
  name: 'init-worker-request',
  fields: [
    { name: 'ownedChannels', type: 'string', array: true }
  ]
})

schemaNs.register({
  name: 'init-worker-response',
  fields: [
    { name: 'success', type: 'bool' }
  ]
})

schemaNs.register({
  name: 'get-feed-response',
  fields: [{ name: 'itemsJson', type: 'string' }]
})

schemaNs.register({
  name: 'init-channel-request',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'avatarPath', type: 'string' },
    { name: 'isDelegate', type: 'bool' },
    { name: 'delegateDescription', type: 'string' }
  ]
})
schemaNs.register({
  name: 'init-channel-response',
  fields: [
    { name: 'publicKey', type: 'string' },
    { name: 'name', type: 'string' }
  ]
})

schemaNs.register({
  name: 'upload-video-request',
  fields: [
    { name: 'filePath', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'duration', type: 'string' },
    { name: 'thumbnailPath', type: 'string' },
    { name: 'channelKey', type: 'string' },
    { name: 'videoType', type: 'string' },
    { name: 'opponentId', type: 'string' },
    { name: 'score', type: 'string' },
    { name: 'transcriptPath', type: 'string' },
    { name: 'eventsJson', type: 'string' }
  ]
})
schemaNs.register({
  name: 'upload-video-response',
  fields: [{ name: 'videoJson', type: 'string' }]
})

schemaNs.register({
  name: 'get-uploads-request',
  fields: [{ name: 'channelKey', type: 'string' }]
})
schemaNs.register({
  name: 'get-uploads-response',
  fields: [{ name: 'channelJson', type: 'string' }]
})

schemaNs.register({
  name: 'get-channels-request',
  fields: []
})
schemaNs.register({
  name: 'get-channels-response',
  fields: [{ name: 'channelsJson', type: 'string' }]
})

schemaNs.register({
  name: 'start-stream-request',
  fields: [
    { name: 'channelKey', type: 'string' },
    { name: 'videoId', type: 'string' }
  ]
})
schemaNs.register({
  name: 'start-stream-response',
  fields: [
    { name: 'url', type: 'string' },
    { name: 'channelKey', type: 'string' },
    { name: 'videoId', type: 'string' }
  ]
})

schemaNs.register({
  name: 'inject-event-request',
  fields: [{ name: 'eventJson', type: 'string' }]
})
schemaNs.register({
  name: 'success-response',
  fields: [{ name: 'success', type: 'bool' }]
})

schemaNs.register({
  name: 'download-video-request',
  fields: [
    { name: 'channelKey', type: 'string' },
    { name: 'videoId', type: 'string' },
    { name: 'destinationPath', type: 'string' }
  ]
})
schemaNs.register({
  name: 'download-video-response',
  fields: [{ name: 'destinationPath', type: 'string' }]
})

schemaNs.register({
  name: 'rag-query-request',
  fields: [
    { name: 'workspaceId', type: 'string' },
    { name: 'query', type: 'string' }
  ]
})
schemaNs.register({
  name: 'rag-query-response',
  fields: [{ name: 'resultsJson', type: 'string' }]
})

// ── Server Events (Worker -> Main) ──
schemaNs.register({
  name: 'channel-event',
  fields: [{ name: 'eventJson', type: 'string' }]
})
schemaNs.register({
  name: 'upload-progress',
  fields: [
    { name: 'videoId', type: 'string' },
    { name: 'percent', type: 'uint' }
  ]
})
schemaNs.register({
  name: 'download-progress',
  fields: [
    { name: 'videoId', type: 'string' },
    { name: 'channelKey', type: 'string' },
    { name: 'percent', type: 'uint' },
    { name: 'bytesReceived', type: 'uint' },
    { name: 'totalBytes', type: 'uint' }
  ]
})
schemaNs.register({
  name: 'error-event',
  fields: [
    { name: 'message', type: 'string' },
    { name: 'command', type: 'string' }
  ]
})

Hyperschema.toDisk(schema)

// Load and build interface
const builder = HRPCBuilder.from(SCHEMA_DIR, HRPC_DIR)
const ns = builder.namespace('bolt')

// Register commands
ns.register({
  name: 'joinChannel',
  request: { name: '@bolt/join-channel-request', stream: false },
  response: { name: '@bolt/channel-response', stream: false }
})
ns.register({
  name: 'leaveChannel',
  request: { name: '@bolt/join-channel-request', stream: false },
  response: { name: '@bolt/channel-response', stream: false }
})
ns.register({
  name: 'initWorker',
  request: { name: '@bolt/init-worker-request', stream: false },
  response: { name: '@bolt/init-worker-response', stream: false }
})
ns.register({
  name: 'getFeed',
  request: { name: '@bolt/empty-request', stream: false },
  response: { name: '@bolt/get-feed-response', stream: false }
})
ns.register({
  name: 'initChannel',
  request: { name: '@bolt/init-channel-request', stream: false },
  response: { name: '@bolt/init-channel-response', stream: false }
})
ns.register({
  name: 'uploadVideo',
  request: { name: '@bolt/upload-video-request', stream: false },
  response: { name: '@bolt/upload-video-response', stream: false }
})
ns.register({
  name: 'getUploads',
  request: { name: '@bolt/get-uploads-request', stream: false },
  response: { name: '@bolt/get-uploads-response', stream: false }
})
ns.register({
  name: 'getChannels',
  request: { name: '@bolt/get-channels-request', stream: false },
  response: { name: '@bolt/get-channels-response', stream: false }
})
ns.register({
  name: 'startStream',
  request: { name: '@bolt/start-stream-request', stream: false },
  response: { name: '@bolt/start-stream-response', stream: false }
})
ns.register({
  name: 'injectEvent',
  request: { name: '@bolt/inject-event-request', stream: false },
  response: { name: '@bolt/success-response', stream: false }
})
ns.register({
  name: 'downloadVideo',
  request: { name: '@bolt/download-video-request', stream: false },
  response: { name: '@bolt/download-video-response', stream: false }
})
ns.register({
  name: 'ragQuery',
  request: { name: '@bolt/rag-query-request', stream: false },
  response: { name: '@bolt/rag-query-response', stream: false }
})

// Send-only commands (Worker -> Main)
ns.register({
  name: 'workerReady',
  request: { name: '@bolt/empty-request', send: true }
})
ns.register({
  name: 'channelEvent',
  request: { name: '@bolt/channel-event', send: true }
})
ns.register({
  name: 'uploadProgress',
  request: { name: '@bolt/upload-progress', send: true }
})
ns.register({
  name: 'downloadProgress',
  request: { name: '@bolt/download-progress', send: true }
})
ns.register({
  name: 'errorEvent',
  request: { name: '@bolt/error-event', send: true }
})

// Save interface to disk
HRPCBuilder.toDisk(builder)
