import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// צריך להמיר __dirname כי ב-ESM אין אותו
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// תיקיית הצ'אטים
const CHATS_DIR = path.join(__dirname, 'chats');

// פונקציות עזר
function getChatFilePath(chatName) {
      return path.join(CHATS_DIR, `${chatName}.json`);
}


app.use(express.json());

// ---- CORS middleware ----
app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") return res.sendStatus(200);
      next();
});
// -------------------------

// נקודת API לשמירת הודעות
app.post('/save', async (req, res) => {
      try {
            const chatName = req.body.chat || 'default_chat';
            const sender = (req.body.sender || 'UNKNOWN').toUpperCase();
            const text = req.body.text || '';

            if (!text) {
                  return res.status(400).json({ error: 'No text provided' });
            }

            await fs.mkdir(CHATS_DIR, { recursive: true });
            const chatFilePath = getChatFilePath(chatName);

            // בדיקה אם הצ'אט כבר קיים
            let messages = [];
            const exists = await fs.access(chatFilePath).then(() => true).catch(() => false);

            if (exists) {
                  // קיים - טען הודעות קיימות
                  const content = await fs.readFile(chatFilePath, 'utf8');
                  messages = JSON.parse(content);
            }

            // הוסף את ההודעה החדשה
            messages.push({ sender, text });

            // שמור את כל ההודעות מחדש
            await fs.writeFile(chatFilePath, JSON.stringify(messages, null, 2), 'utf8');

            console.log(`Saved message to ${chatFilePath}: ${sender}: ${text}`);
            res.status(200).json({ success: true });

      } catch (err) {
            console.error('Server error:', err);
            res.status(500).json({ error: 'Server error' });
      }
});


// GET /chats - מחזיר רשימת כל הצ'אטים
app.get('/chats', async (req, res) => {
      try {
            await fs.mkdir(CHATS_DIR, { recursive: true });
            const files = await fs.readdir(CHATS_DIR);
            const chats = files
                  .filter(f => f.endsWith('.json'))
                  .map(f => ({ name: f.replace('.json', '') }));
            res.json(chats);
      } catch (err) {
            console.error('Error reading chats directory:', err);
            res.status(500).json({ error: 'Server error reading chats' });
      }
});

// GET /chat/:name - מחזיר את ההודעות של צ'אט מסוים
app.get('/chat/:name', async (req, res) => {
      try {
            const filePath = getChatFilePath(req.params.name);
            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            if (!exists) return res.json([]); // אם אין קובץ – מחזירים ריק

            const content = await fs.readFile(filePath, 'utf8');
            if (!content.trim()) {
                  // אם הקובץ ריק
                  return res.json([]);
            }

            let messages;
            try {
                  messages = JSON.parse(content);
            } catch (parseErr) {
                  console.error("JSON parse failed, resetting file:", parseErr);
                  // אם התוכן לא תקין – נאתחל אותו
                  messages = [];
                  await fs.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf8');
            }

            res.json(messages);
      } catch (err) {
            console.error('Error reading chat file:', err);
            res.status(500).json({ error: 'Server error reading chat file' });
      }
});

app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
});