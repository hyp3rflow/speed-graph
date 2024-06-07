import { useEffect, useState } from 'preact/hooks'
import { signal, effect } from '@preact/signals'
import './app.css'

const portsSignal = signal<SerialPort[]>([]);
effect(() => console.log(portsSignal.value))

function refreshPorts() {
  navigator.serial.getPorts().then(ports => {
    portsSignal.value = ports;
  })
}

export function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    refreshPorts();
    navigator.serial.addEventListener("connect", refreshPorts);
    navigator.serial.addEventListener("disconnect", refreshPorts);
    return () => {
      navigator.serial.removeEventListener("connect", refreshPorts);
      navigator.serial.removeEventListener("disconnect", refreshPorts);
    }
  }, []);

  return (
    <>
      <h1>Vite + Preact</h1>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/app.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the Vite and Preact logos to learn more
      </p>
    </>
  )
}
