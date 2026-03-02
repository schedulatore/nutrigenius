import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log("🚀 Migrazione database...\n");

  const tables = [
    "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'utente', created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL, weight REAL, height REAL, age INTEGER, gender TEXT, activity TEXT, goal TEXT, target_weight REAL, budget REAL DEFAULT 80, allergies TEXT DEFAULT '[]', bmr REAL, tdee REAL, target_calories INTEGER, macro_prot INTEGER, macro_carb INTEGER, macro_fat INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS foods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, calories REAL NOT NULL, protein REAL DEFAULT 0, carbs REAL DEFAULT 0, fat REAL DEFAULT 0, category TEXT, price REAL DEFAULT 0, unit TEXT DEFAULT 'kg', created_by TEXT, is_default INTEGER DEFAULT 1)",
    "CREATE TABLE IF NOT EXISTS diary_entries (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, food_id INTEGER, food_name TEXT NOT NULL, portion REAL DEFAULT 100, calories REAL NOT NULL, protein REAL DEFAULT 0, carbs REAL DEFAULT 0, fat REAL DEFAULT 0, meal_type TEXT DEFAULT 'altro', entry_date TEXT NOT NULL, entry_time TEXT, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS meal_plans (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, day_name TEXT NOT NULL, meal_type TEXT NOT NULL, meal_name TEXT NOT NULL, meal_desc TEXT, foods_json TEXT NOT NULL, portions_json TEXT NOT NULL, total_calories REAL DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS shopping_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, food_id INTEGER, food_name TEXT NOT NULL, category TEXT, quantity REAL DEFAULT 0, unit TEXT DEFAULT 'kg', price REAL DEFAULT 0, checked INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS weight_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, weight REAL NOT NULL, log_date TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS user_stats (user_id TEXT PRIMARY KEY, xp INTEGER DEFAULT 0, days_tracked INTEGER DEFAULT 0, last_tracked_date TEXT, streak INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
  ];

  for (const sql of tables) {
    const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    try { await db.execute(sql); console.log("  ✅ " + name); }
    catch (e) { console.error("  ❌ " + name + ": " + e.message); }
  }

  console.log("\n📦 Alimenti...");
  const count = await db.execute("SELECT COUNT(*) as c FROM foods");
  if (count.rows[0].c === 0) {
    const foods = [
      [1,"Petto di pollo",165,31,0,3.6,"Carne",8.5,"kg"],
      [2,"Riso integrale",362,7.5,76,2.7,"Cereali",2.5,"kg"],
      [3,"Broccoli",34,2.8,7,0.4,"Verdura",2.0,"kg"],
      [4,"Salmone",208,20,0,13,"Pesce",18,"kg"],
      [5,"Uova (1 unita)",78,6,0.6,5,"Proteine",0.3,"pz"],
      [6,"Avocado",160,2,9,15,"Frutta",1.5,"pz"],
      [7,"Pane integrale",247,13,41,3.4,"Cereali",2.8,"kg"],
      [8,"Yogurt greco",59,10,3.6,0.4,"Latticini",1.2,"pz"],
      [9,"Banana",89,1.1,23,0.3,"Frutta",1.5,"kg"],
      [10,"Spinaci",23,2.9,3.6,0.4,"Verdura",3.0,"kg"],
      [11,"Pasta integrale",348,14,64,2.5,"Cereali",1.8,"kg"],
      [12,"Tonno in scatola",116,26,0,1,"Pesce",2.5,"pz"],
      [13,"Mozzarella",280,22,2.2,17,"Latticini",1.5,"pz"],
      [14,"Pomodori",18,0.9,3.9,0.2,"Verdura",2.5,"kg"],
      [15,"Mandorle",579,21,22,50,"Frutta secca",12,"kg"],
      [16,"Lenticchie",352,25,60,1,"Legumi",3.0,"kg"],
      [17,"Patate dolci",86,1.6,20,0.1,"Verdura",2.5,"kg"],
      [18,"Olio d oliva",119,0,0,14,"Condimenti",8,"L"],
      [19,"Parmigiano (30g)",110,10,0,7.5,"Latticini",18,"kg"],
      [20,"Quinoa",368,14,64,6,"Cereali",6,"kg"],
      [21,"Ceci",364,19,61,6,"Legumi",2.5,"kg"],
      [22,"Zucchine",17,1.2,3.1,0.3,"Verdura",2.0,"kg"],
      [23,"Mela",52,0.3,14,0.2,"Frutta",2.5,"kg"],
      [24,"Tacchino",135,30,0,1,"Carne",9,"kg"],
      [25,"Fiocchi d avena",389,17,66,7,"Cereali",3.0,"kg"],
    ];
    for (const f of foods) {
      await db.execute({ sql: "INSERT INTO foods (id,name,calories,protein,carbs,fat,category,price,unit,is_default) VALUES (?,?,?,?,?,?,?,?,?,1)", args: f });
    }
    console.log("  ✅ " + foods.length + " alimenti");
  } else {
    console.log("  ⏭️  Gia presenti");
  }

  await db.execute("CREATE INDEX IF NOT EXISTS idx_diary ON diary_entries(user_id, entry_date)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_email ON users(email)");
  console.log("\n🎉 Migrazione OK!\n");
}

migrate().catch(e => { console.error("❌ " + e.message); process.exit(1); });
