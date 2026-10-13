import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import electron from 'electron'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5173, strictPort: true } })

await server.listen()

const env = { ...process.env }

delete env.ELECTRON_RUN_AS_NODE
const child = spawn(electron, ['.', '--dev'], { cwd: root, stdio: 'inherit', env })
let stopping = false

async function stop(code) {
  if (stopping) return

  stopping = true
  child.kill()
  await server.close()
  process.exit(code)
}

child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`)
  void stop(1)
})
child.on('exit', (code) => void stop(code ?? 0))
process.on('SIGINT', () => void stop(0))
process.on('SIGTERM', () => void stop(0))
