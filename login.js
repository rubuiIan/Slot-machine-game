// Login system for Slot Machine Game (SQLite version)

const prompt = require("prompt-sync")();
const bcrypt = require("bcrypt");
const db = require("./database");

const SALT_ROUNDS = 10;

// Register
const register = (callback) => {
    console.log("\n--- REGISTRATION ---");

    const username = prompt("Enter a username: ");
    const password = prompt("Enter a password: ");

    if (username.length < 3) {
        console.log("Username must be at least 3 characters long.");
        return register(callback);
    }

    if (password.length < 4) {
        console.log("Password must be at least 4 characters long.");
        return register(callback);
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (err) {
            console.log("Database error. Try again.");
            return register(callback);
        }

        if (row) {
            console.log("Username already exists. Try again.");
            return register(callback);
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        db.run(
            "INSERT INTO users (username, password, balance) VALUES (?, ?, ?)",
            [username, hashedPassword, 0],
            (err) => {
                if (err) {
                    console.log("Error creating user.");
                    return;
                }
                console.log("✓ Account created successfully!\n");
                callback(null); // registration done, back to menu
            }
        );
    });
};

// Login
const login = (callback) => {
    console.log("\n--- LOGIN ---");

    const username = prompt("Enter your username: ");
    const password = prompt("Enter your password: ");

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (err) {
            console.log("Database error. Try again.");
            return login(callback);
        }

        if (!row) {
            console.log("Invalid credentials. Try again.");
            return login(callback);
        }

        const match = await bcrypt.compare(password, row.password);

        if (!match) {
            console.log("Invalid credentials. Try again.");
            return login(callback);
        }

        console.log(`✓ Welcome back, ${username}!\n`);
        callback(username); // ✅ pass username back to caller
    });
};

// Main Menu
const loginMenu = (callback) => {
    console.log("\n========================================");
    console.log("    🎰 SLOT MACHINE GAME - LOGIN 🎰");
    console.log("========================================\n");

    const showMenu = () => {
        console.log("1. Login");
        console.log("2. Register");
        console.log("3. Exit\n");

        const choice = prompt("Choose an option (1-3): ");

        if (choice === "1") {
            login(callback); // username passed up via callback
        } else if (choice === "2") {
            register(() => showMenu()); // after register, return to menu
        } else if (choice === "3") {
            console.log("Goodbye!");
            process.exit();
        } else {
            console.log("Invalid choice. Try again.\n");
            showMenu();
        }
    };

    showMenu();
};

module.exports = { loginMenu };