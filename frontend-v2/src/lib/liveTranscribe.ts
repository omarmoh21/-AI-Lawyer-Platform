// Live speech-to-text: captures mic audio as PCM-16k, streams it over a
// WebSocket to the backend proxy (/api/transcribe/stream → ElevenLabs realtime),
// and reports partial (interim) and final (committed) transcripts as they arrive.

const WS_URL = `${(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(
  /^http/,
  'ws',
)}/api/transcribe/stream`

const TARGET_RATE = 16000
const FLUSH_SAMPLES = 3200 // ~200ms at 16kHz — batch frames to cut WS overhead

export interface LiveHandlers {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (message: string) => void
}

export interface LiveSession {
  stop: () => Promise<void>
}

// AudioWorklet that forwards each input frame (Float32) to the main thread.
const WORKLET = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input && input[0]) this.port.postMessage(input[0].slice(0))
    return true
  }
}
registerProcessor('pcm-processor', PCMProcessor)
`

function downsample(buffer: Float32Array, inRate: number): Float32Array {
  if (inRate === TARGET_RATE) return buffer
  const ratio = inRate / TARGET_RATE
  const outLength = Math.floor(buffer.length / ratio)
  const result = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) result[i] = buffer[Math.floor(i * ratio)]
  return result
}

function floatToPCM16(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out.buffer
}

function base64FromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function startLiveTranscription(handlers: LiveHandlers): Promise<LiveSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  const ws = new WebSocket(WS_URL)
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'partial') handlers.onPartial(msg.text ?? '')
      else if (msg.type === 'final') handlers.onFinal(msg.text ?? '')
      else if (msg.type === 'error') handlers.onError(msg.message ?? 'خطأ في التفريغ')
    } catch {
      /* ignore malformed frames */
    }
  }

  // Wait for the socket to open (or fail) before wiring up audio.
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error('تعذّر الاتصال بخدمة التفريغ'))
  })

  const audioContext = new AudioContext({ sampleRate: TARGET_RATE })
  await audioContext.audioWorklet.addModule(
    URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })),
  )

  const source = audioContext.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(audioContext, 'pcm-processor')
  const mute = audioContext.createGain()
  mute.gain.value = 0 // keep the graph running without echoing mic to speakers

  let pending: Float32Array[] = []
  let pendingLength = 0

  node.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (ws.readyState !== WebSocket.OPEN) return
    const frame = downsample(event.data, audioContext.sampleRate)
    pending.push(frame)
    pendingLength += frame.length
    if (pendingLength < FLUSH_SAMPLES) return

    const merged = new Float32Array(pendingLength)
    let offset = 0
    for (const chunk of pending) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    pending = []
    pendingLength = 0
    ws.send(JSON.stringify({ audio: base64FromBuffer(floatToPCM16(merged)) }))
  }

  source.connect(node)
  node.connect(mute)
  mute.connect(audioContext.destination)

  const stop = async (): Promise<void> => {
    node.port.onmessage = null
    try {
      source.disconnect()
      node.disconnect()
      mute.disconnect()
    } catch {
      /* already torn down */
    }
    stream.getTracks().forEach((track) => track.stop())
    try {
      await audioContext.close()
    } catch {
      /* already closed */
    }
    // Ask the backend to commit the final segment, then close shortly after
    // so the last committed transcript has time to arrive.
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
      await new Promise((r) => setTimeout(r, 800))
      ws.close()
    }
  }

  return { stop }
}
