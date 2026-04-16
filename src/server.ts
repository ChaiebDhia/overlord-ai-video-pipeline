import express from 'express';
import cors from 'cors';
import { runPipeline } from './pipeline';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/output', express.static(path.join(process.cwd(), 'output')));

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // A tiny unique ID for the session/socket room
  const clientId = req.body.clientId; 

  try {
    // Overriding console.log temporarily for this request to emit progress
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog(...args);
      if (clientId) {
        io.emit('progress', args.join(' ')); // Broadcast to simplicity or fix roomId logic
      }
    };

    const videoPath = await runPipeline(prompt, 1);
    
    // Restore console.log
    console.log = originalLog;

    res.json({ success: true, videoUrl: `/output/${path.basename(videoPath as string)}` });
  } catch (error: any) {
    if (clientId) io.to(clientId).emit('error', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('You can now use the Web Interface to generate videos.');
});
