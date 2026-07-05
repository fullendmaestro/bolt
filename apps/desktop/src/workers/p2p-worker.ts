declare const Bare: any;

// @ts-ignore - Exposes Bare global context variables
const PearRuntime = require('pear-runtime')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const goodbye = require('graceful-goodbye')
const FramedStream = require('framed-stream')
const path = require('bare-path')

const pipe = new FramedStream(Bare.IPC)

const updaterConfig = {
    dir: Bare.argv[2],
    app: Bare.argv[3],
    updates: Bare.argv[4] !== 'false',
    version: Bare.argv[5],
    upgrade: Bare.argv[6],
    name: Bare.argv[7]
}

const store = new Corestore(path.join(updaterConfig.dir, 'bolt-runtime/corestore'))
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })

swarm.on('connection', (connection: any) => store.replicate(connection))
pipe.on('data', async (data: Buffer) => {
    const msg = JSON.parse(data.toString())

    if (msg.type === 'join-sports-room') {
        const topic = Buffer.alloc(32, msg.roomId)
        const discovery = swarm.join(topic, { client: true, server: true })

        discovery.flushed().then(() => {
            pipe.write(JSON.stringify({ type: 'room-joined', roomId: msg.roomId }))
        })
    }
})

goodbye(async () => {
    await swarm.destroy()
    await pear.close()
    await store.close()
})

pipe.write(JSON.stringify({ type: 'worker-ready' }))