import 'dotenv/config';
import mongoose from 'mongoose';
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/linepulse';
try { await mongoose.connect(uri); console.log('MongoDB connection verified. The initial demo uses deterministic in-memory simulation state; persistence models are next in the implementation roadmap.'); } catch (error) { console.error('Seed check failed:', error.message); process.exitCode = 1; } finally { await mongoose.disconnect().catch(() => {}); }
