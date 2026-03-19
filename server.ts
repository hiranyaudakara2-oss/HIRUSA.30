import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only .jpg, .jpeg and .png formats are allowed!"));
    }
  },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// In-memory user storage (persisted to JSON for demo)
const DATA_FILE = path.join(process.cwd(), "data.json");
let users: any[] = [];

// Load users from file if it exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    users = JSON.parse(data);
  } catch (err) {
    console.error("Failed to load users data", err);
  }
}

const saveUsers = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Failed to save users data", err);
  }
};

// API Routes
app.post("/api/register", upload.fields([
  { name: "nicFront", maxCount: 1 },
  { name: "nicBack", maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const userData = JSON.parse(req.body.userData);
    
    const newUser = {
      ...userData,
      userId: Math.floor(10000 + Math.random() * 90000).toString(),
      nicFrontUrl: files.nicFront ? `/uploads/${files.nicFront[0].filename}` : null,
      nicBackUrl: files.nicBack ? `/uploads/${files.nicBack[0].filename}` : null,
      createdAt: new Date().toISOString(),
      status: 'pending',
      transactions: []
    };

    users.push(newUser);
    saveUsers();
    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/users", (req, res) => {
  res.json(users);
});

app.delete("/api/users/:nic", (req, res) => {
  const { nic } = req.params;
  users = users.filter(u => u.nic !== nic);
  saveUsers();
  res.status(204).send();
});

app.patch("/api/users/:nic/status", (req, res) => {
  const { nic } = req.params;
  const { status } = req.body;
  const user = users.find(u => u.nic === nic);
  if (user) {
    user.status = status;
    saveUsers();
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.patch("/api/users/:nic/quota", (req, res) => {
  const { nic } = req.params;
  const { quota } = req.body;
  const user = users.find(u => u.nic === nic);
  if (user) {
    user.customQuota = quota;
    saveUsers();
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.post("/api/users/:nic/transaction", (req, res) => {
  const { nic } = req.params;
  const { amount, station } = req.body;
  const user = users.find(u => u.nic === nic);
  if (user) {
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      date: new Date().toLocaleString(),
      amount,
      station: station || 'Endana Pirawumhala'
    };
    const currentQuota = user.customQuota !== undefined ? user.customQuota : getQuota(user.vehicleCategory);
    user.customQuota = Math.max(0, currentQuota - amount);
    user.transactions = [newTransaction, ...(user.transactions || [])];
    saveUsers();
    res.json(user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

function getQuota(cat: string) {
  switch (cat) {
    case 'Motorbike': return 5;
    case 'Van': return 20;
    case 'Bus': return 30;
    case 'Car': return 15;
    case 'Three-Wheeler': return 10;
    case 'Lorry': return 40;
    default: return 0;
  }
}

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
