import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">AISura</h1>
        <p className="text-muted-foreground">UI Overhaul in progress</p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => setCount(c => c + 1)}
        >
          Count: {count}
        </button>
      </div>
    </div>
  )
}

export default App
