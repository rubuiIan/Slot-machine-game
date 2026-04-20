// Slot machine game
const prompt = require("prompt-sync")();
const { loginMenu } = require("./login");
const db = require("./database");

// Slot machine configuration
const ROWS = 3;
const COLS = 3;

// Symbol frequency 
const SYMBOLS_COUNT = {
    "A": 2,
    "B": 4,
    "C": 6,
    "D": 8
};

// Symbol payout values
const SYMBOLS_VALUES = {
    "A": 5,
    "B": 4,
    "C": 3,
    "D": 2
};

// Ask user to deposit money
const deposit = () => {
    while (true) {
        const depositAmount = prompt("Enter a deposit amount: ");
        const numberDepositAmount = parseFloat(depositAmount);

        if (isNaN(numberDepositAmount) || numberDepositAmount <= 0) {
            console.log("Invalid deposit amount, try again.");
        } else {
            return numberDepositAmount;
        }
    }
};

// Ask user for number of lines to bet on 
const getNumberOfLines = () => {
    while (true) {
        const lines = prompt("Enter the number of lines to bet on (1-3): ");
        const numberOfLines = parseFloat(lines);

        if (isNaN(numberOfLines) || numberOfLines <= 0 || numberOfLines > 3) {
            console.log("Invalid number of lines try again.");
        } else {
            return numberOfLines;
        }
    }
};

// Ask user how much to bet per line
const getBet = (balance, lines) => {
    while (true) {
        const bet = prompt("Enter the bet per line: ");
        const numberBet = parseFloat(bet);

        if (isNaN(numberBet) || numberBet <= 0 || numberBet > balance / lines) {
            console.log("Invalid bet, try again.");
        } else {
            return numberBet;
        }
    }
};

// Spin the slot machine and generate random symbols
const spin = () => {
    const symbols = [];
    for (const [symbol, count] of Object.entries(SYMBOLS_COUNT)) {
        for (let i = 0; i < count; i++) {
            symbols.push(symbol);
        }
    }

    const reels = [];
    for (let i = 0; i < COLS; i++) {
        reels.push([]);
        const reelSymbols = [...symbols];
        for (let j = 0; j < ROWS; j++) {
            const randomIndex = Math.floor(Math.random() * reelSymbols.length);
            const selectedSymbol = reelSymbols[randomIndex];
            reels[i].push(selectedSymbol);
            reelSymbols.splice(randomIndex, 1);
        }
    }

    return reels;
};

// Convert the reels into rows
const transpose = (reels) => {
    const rows = [];
    for (let i = 0; i < ROWS; i++) {
        rows.push([]);
        for (let j = 0; j < COLS; j++) {
            rows[i].push(reels[j][i]);
        }
    }
    return rows;
};

// Print the slot machine rows
const printRows = (rows) => {
    for (const row of rows) {
        let rowString = "";
        for (const [i, symbol] of row.entries()) {
            rowString += symbol;
            if (i != row.length - 1) {
                rowString += " | ";
            }
        }
        console.log(rowString);
    }
};

// Calculate the winnings
const getWinnings = (rows, bet, lines) => {
    let winnings = 0;
    for (let row = 0; row < lines; row++) {
        const symbols = rows[row];
        let allSame = true;
        for (const symbol of symbols) {
            if (symbol != symbols[0]) {
                allSame = false;
                break;
            }
        }
        if (allSame) {
            winnings += bet * SYMBOLS_VALUES[symbols[0]];
        }
    }
    return winnings;
};

// Save balance to database
const saveBalance = (username, balance) => {
    db.run("UPDATE users SET balance = ? WHERE username = ?", [balance, username], (err) => {
        if (err) console.log("Error saving balance.");
    });
};

// Main game loop
const game = (username, startingBalance) => {
    let balance = startingBalance;

    // If no saved balance, ask for a deposit
    if (balance <= 0) {
        balance = deposit();
    } else {
        console.log(`Welcome back! Your saved balance is $${balance}`);
    }

    while (true) {
        console.log(`\nYou have a balance of $${balance}`);
        const numberOfLines = getNumberOfLines();
        const bet = getBet(balance, numberOfLines);
        balance -= bet * numberOfLines;

        const reels = spin();
        const rows = transpose(reels);
        printRows(rows);

        const winnings = getWinnings(rows, bet, numberOfLines);
        balance += winnings;
        console.log(`You won $${winnings}!`);

        // Save balance to DB after every round
        saveBalance(username, balance);

        if (balance <= 0) {
            console.log("You ran out of money 😔!");
            saveBalance(username, 0);
            break;
        }

        const playAgain = prompt("Do you want to play again? (y/n): ");
        if (playAgain != "y") break;
    }

    console.log(`\nYou're leaving with $${balance}. See you next time!`);
};

// Entry point — login first, then start game with user's saved balance
loginMenu((username) => {
    db.get("SELECT balance FROM users WHERE username = ?", [username], (err, row) => {
        if (err || !row) {
            console.log("Error loading your balance. Starting fresh.");
            game(username, 0);
        } else {
            game(username, row.balance);
        }
    });
});