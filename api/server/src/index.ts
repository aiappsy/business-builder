
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { projectRouter } from './routes/projects';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Fix: Explicitly cast middleware to any to avoid type mismatch between connect and express handlers
app.use(cors() as any);
app.use(express.json() as any);

// Health check
app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Business Builder API Status: Online'));

// Routes
app.use('/api/projects', projectRouter);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
