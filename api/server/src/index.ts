
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { projectRouter } from './routes/projects';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.send('OK'));

// Routes
app.use('/api/projects', projectRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
