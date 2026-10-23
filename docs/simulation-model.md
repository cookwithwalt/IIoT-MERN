# Simulation model

The production order is Conveyor Infeed → Filling Station → Capping Station → Quality Inspection. Each station has a finite input buffer. A downstream full buffer blocks its upstream transfer; an empty input buffer starves a station. The server advances simulated time in discrete one-second ticks independent of the browser refresh rate.

Fault types include conveyor jam, filling slowdown, capper failure, high motor load, rejection spike and sensor anomaly. Initiating fault events are distinguished from propagated blocked-state events and recovery events. The model is simplified and is not a calibrated digital twin of a specific factory.

## Metrics

- Throughput = accepted products / simulated minutes.
- Estimated production loss = max(0, expected baseline good output − actual good output).
- Availability approximation = 1 − line downtime ticks / elapsed ticks. This is a demonstration approximation, not standards-certified OEE.
- Full OEE requires consistent planned production time, ideal cycle time, total count and good count; do not interpret missing inputs as zero.
