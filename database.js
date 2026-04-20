const sqlite3 = require("sqlite3").verbose();

const DB_FILE = "users.db";

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

db.serialize(() => {
    // Create table
    db.run(
        `CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT,
            balance INTEGER DEFAULT 0
        )`
    );

    // SELECT after table is guaranteed to exist
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            console.error("Error fetching users:", err.message);
            return;
        }

        console.log("Users:", rows);
    });
});

module.exports = db;