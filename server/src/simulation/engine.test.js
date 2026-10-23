import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine, SeededRandom } from './engine.js';

test('seeded random generator is reproducible', () => { const a = new SeededRandom(42), b = new SeededRandom(42); assert.equal(a.next(), b.next()); assert.equal(a.next(), b.next()); });
test('reset creates four virtual stations and paused status', () => { const e = new SimulationEngine(); assert.equal(e.machines.length, 4); assert.equal(e.status, 'PAUSED'); });
test('fault injection validates station and duration', () => { const e = new SimulationEngine(); assert.throws(() => e.injectFault({ station: 'Capping Station', type: 'CAPPER_FAILURE', durationSeconds: 2 }), /Duration/); assert.throws(() => e.injectFault({ station: 'unknown', type: 'CAPPER_FAILURE', durationSeconds: 10 }), /Unknown station/); });
test('fault can be cleared and creates recovery event', () => { const e = new SimulationEngine(); const f = e.injectFault({ station: 'Capping Station', type: 'CAPPER_FAILURE', durationSeconds: 20 }); e.clearFault(f.id); assert.equal(e.activeFaults.length, 0); assert.ok(e.events.some(x => x.category === 'RECOVERY')); });
test('paused simulation clock does not advance', () => { const e = new SimulationEngine(); e.tick(5); assert.equal(e.clockSeconds, 0); });
test('running simulation produces bounded buffers and telemetry', () => { const e = new SimulationEngine(); e.status = 'RUNNING'; e.tick(50); assert.ok(e.telemetry.length > 0); assert.ok(e.buffers.every((v, i) => v >= 0 && v <= e.machines[i].bufferCapacity)); });
test('invalid scenario is rejected', () => { const e = new SimulationEngine(); assert.throws(() => e.applyScenario('nope'), /Unknown scenario/); });
