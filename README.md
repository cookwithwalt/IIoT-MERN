# LinePulse — Software-Simulated IIoT

LinePulse models a four-station packaging line to demonstrate virtual telemetry, finite-buffer production flow, fault propagation, incident investigation, and production-loss analysis. All readings are simulated; no physical hardware is required.

## Project status

Repository initialization is in progress. The implementation will use a MERN modular monolith: React/Vite client, Express/Node server, MongoDB/Mongoose persistence, and Socket.IO updates.

## Stations

1. Conveyor Infeed
2. Filling Station
3. Capping Station
4. Quality Inspection

## Engineering principle

The backend simulation is authoritative. Machine state, sensor readings, incidents, and production metrics must be derived from the simulation model, not hardcoded dashboard data.
