require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));

(async () => {
  try {
    const username = (await ask("New administrator username: ")).trim();
    const password = await ask("New administrator password (minimum 12 characters): ");

    if (!username || password.length < 12) {
      throw new Error("Username is required and password must be at least 12 characters.");
    }

    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const hash = await bcrypt.hash(password, 12);
    await db.execute(
      "INSERT INTO app_users (username, password_hash, app_role) VALUES (?, ?, 'ADMIN')",
      [username, hash]
    );

    console.log("Administrator account created.");
    await db.end();
  } catch (e) {
    console.error("Could not create administrator:", e.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();