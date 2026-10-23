# Architecture

LinePulse is a modular-monolith teaching application. The React/Vite client reads the Express REST API and subscribes to Socket.IO. A single backend simulation engine is the authoritative owner of simulated clock, station states, finite buffers, faults, telemetry, events and metrics.

```mermaid
flowchart LR
  UI[React dashboard] <-->|REST / Socket.IO| API[Express API]
  API <--> SIM[Simulation engine]
  SIM --> FLOW[Finite-buffer production flow]
  SIM --> SENS[Virtual sensor model]
  SIM --> FAULT[Fault injection and propagation]
  SIM --> EVENTS[Event and metric records]
  API --> DB[(MongoDB - optional connection)]
```

All telemetry is synthetic. The current baseline stores active demo state in memory; MongoDB connection is optional and durable model persistence is not yet wired into every route.
