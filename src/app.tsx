import { signal, effect, computed } from '@preact/signals'
import { requestPort } from './serial';
import './app.css'

interface Message {
  x: number;
  y: number;
  z: number;
}

interface RawVelocity {
  x: number;
  y: number;
}

const portSignal = signal<SerialPort | undefined>(undefined);
const windowSignal = signal<string>("");
const messagesSignal = signal<Message[]>([]);
const velocitiesSignal = signal<RawVelocity[]>([]);
const dataSignal = computed(() => velocitiesSignal.value.map(v => Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2))))

const vX = signal(0);
const vY = signal(0);
const aX = signal(0);
const aY = signal(0);

effect(async () => {
  const port = portSignal.value;
  if (port && port.readable) {
    const reader = port.readable.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const incoming = new TextDecoder().decode(value);
      windowSignal.value = windowSignal.peek() + incoming;
      console.log(windowSignal.peek());
      processWindow();
    }
  }
  function processWindow() {
    const inputs = windowSignal.value.split("\n");
    const last = inputs.pop()!;
    const messages = inputs.map(parseMessage);
    const velocities = messages.map(getVelocity);
    messagesSignal.value = [...messagesSignal.peek(), ...messages];
    velocitiesSignal.value = [...velocitiesSignal.peek(), ...velocities];
    windowSignal.value = last;
  }
  function parseMessage(str: string) {
    const matched = str.match(/x = ([0-9A-F]{4})y = ([0-9A-F]{4})z = ([0-9A-F]{4})/);
    if (!matched) throw "invalid message format";
    const [_, x, y, z] = matched;
    return {
      x: toAcceleration(x),
      y: toAcceleration(y),
      z: toAcceleration(z)
    }
  } 
  function toAcceleration(hex: string) {
    const raw = new Int16Array([Number.parseInt(hex, 16)])[0];
    return ((raw / 16384) * 9.8) | 0;
  }
  function getVelocity(curr: Message) {
    const { x, y } = curr;
    const currVx = vX.value + (aX.value + x) * 0.1;
    const currVy = vY.value + (aY.value + y) * 0.1;
    vX.value = currVx;
    vY.value = currVy;
    return { x: currVx, y: currVy };
  }
})

export function App() {
  return (
    <>
      <h1>Speed graph</h1>
      <div class="card">
        <button onClick={async () => {
          const port = await requestPort();
          await port.open({ baudRate: 115200 });
          portSignal.value = port;
        }}>
          Request Serial Port
        </button>
        &nbsp;&nbsp;
        <button onClick={() => {
          messagesSignal.value = [];
        }}>
          Clear
        </button>
      </div>
      <svg width="830" height="400">
        {[...Array((300 / (10 * 3)) + 1)].map((_, i) => {
          return <>
            <text
              x="25"
              y={50 + i * 30}
              fill="#666"
              alignment-baseline="middle"
              text-anchor="end" 
            >
              {30 - (i * 3)}
            </text>
            <line
              stroke="#444"
              strokeWidth="0.5"
              x1="30"
              y1={50 + i * 30}
              x2="830"
              y2={50 + i * 30}
            />
          </>;
        })}
        <line
          stroke="#666"
          strokeWidth="0.5"
          x1="30"
          y1="350"
          x2="830"
          y2="350"
        />
        <polyline
          points={dataSignal.value.slice(-80).map((v, idx) => `${idx * 10 + 30},${350 - (v * 10)}`).join(" ")}
          stroke="hsla(170, 70%, 57%)"
          fill="none"
        />
      </svg>
      <pre>{JSON.stringify(velocitiesSignal.value.slice(-1)[0])}</pre>
    </>
  )
}
