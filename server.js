require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const db = require('./database');
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

// Rate limiter - max 10 login attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many login attempts. Try again in 15 minutes." }
});

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"], credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname))); 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Register
app.post("/register", async (req, res) => {
    let { username, password } = req.body;

    // Input sanitization
    if (typeof username !== "string" || typeof password !== "string") {
        return res.json({ success: false, message: "Invalid input." });
    }

    username = username.trim();

    if (!username || username.length < 3) {
        return res.json({ success: false, message: "Username must be at least 3 characters." });
    }

    if (!password || password.length < 4) {
        return res.json({ success: false, message: "Password must be at least 4 characters." });
    }

    // Only allow letters and numbers in username
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.json({ success: false, message: "Username can only contain letters, numbers, and underscores." });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (err) return res.json({ success: false, message: "Database error." });
        if (row) return res.json({ success: false, message: "Username already exists." });

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        db.run(
            "INSERT INTO users (username, password, balance) VALUES (?, ?, ?)",
            [username, hashedPassword, 0], (err) => {
                if (err) return res.json({ success: false, message: "Error creating account." });
                res.json({ success: true, message: "Account created successfully!" });
            }
        );
    });
});

// Login (rate limited)
app.post("/login", loginLimiter, async (req, res) => {
    let { username, password } = req.body;

    // Input sanitization
    if (typeof username !== "string" || typeof password !== "string") {
        return res.json({ success: false, message: "Invalid input." });
    }

    username = username.trim();

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (err) return res.json({ success: false, message: "Database error." });
        if (!row) return res.json({ success: false, message: "Invalid credentials." });

        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.json({ success: false, message: "Invalid credentials." });

        req.session.username = username;
        req.session.balance = row.balance;

        res.json({ success: true, username, balance: row.balance });
    });
});

// Get Balance
app.get("/balance", (req, res) => {
    if (!req.session.username) return res.json({ success: false, message: "Not logged in." });

    db.get("SELECT balance FROM users WHERE username = ?", [req.session.username], (err, row) => {
        if (err || !row) return res.json({ success: false, message: "Error fetching balance." });
        res.json({ success: true, balance: row.balance });
    });
});

// Save Balance
app.post("/balance", (req, res) => {
    if (!req.session.username) return res.json({ success: false, message: "Not logged in." });

    let { balance } = req.body;
    balance = parseFloat(balance);

    // Input sanitization
    if (isNaN(balance) || balance < 0) {
        return res.json({ success: false, message: "Invalid balance." });
    }

    db.run("UPDATE users SET balance = ? WHERE username = ?", [balance, req.session.username], (err) => {
        if (err) return res.json({ success: false, message: "Error saving balance." });
        req.session.balance = balance;
        res.json({ success: true });
    });
});

// Logout
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});