import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || "nutrigenius-dev-secret";
const uid = () => uuidv4().split("-")[0];
const today = () => new Date().toISOString().split("T")[0];

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === "production") app.use(express.static(path.join(__dirname, "../client/dist")));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Token mancante" });
  try { req.user = jwt.verify(h.split(" ")[1], SECRET); next(); } catch { res.status(401).json({ error: "Token non valido" }); }
}

// AUTH
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Campi obbligatori" });
    const exists = await db.execute({ sql: "SELECT id FROM users WHERE email=?", args: [email] });
    if (exists.rows.length) return res.status(409).json({ error: "Email già registrata" });
    const id = uid();
    await db.execute({ sql: "INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)", args: [id, name, email, await bcrypt.hash(password, 10)] });
    await db.execute({ sql: "INSERT INTO user_stats (user_id) VALUES (?)", args: [id] });
    const token = jwt.sign({ id, email, role: "utente" }, SECRET, { expiresIn: "30d" });
    res.status(201).json({ user: { id, name, email, role: "utente" }, token });
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore registrazione" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await db.execute({ sql: "SELECT * FROM users WHERE email=?", args: [email] });
    if (!r.rows.length) return res.status(401).json({ error: "Credenziali non valide" });
    const u = r.rows[0];
    if (!await bcrypt.compare(password, u.password_hash)) return res.status(401).json({ error: "Credenziali non valide" });
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, SECRET, { expiresIn: "30d" });
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, token });
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore login" }); }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT id,name,email,role,created_at FROM users WHERE id=?", args: [req.user.id] });
  res.json(r.rows[0] || null);
});

// PROFILE
app.get("/api/profile", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM profiles WHERE user_id=?", args: [req.user.id] });
  res.json(r.rows[0] || null);
});

app.post("/api/profile", auth, async (req, res) => {
  try {
    const p = req.body;
    const exists = await db.execute({ sql: "SELECT id FROM profiles WHERE user_id=?", args: [req.user.id] });
    if (exists.rows.length) {
      await db.execute({ sql: "UPDATE profiles SET weight=?,height=?,age=?,gender=?,activity=?,goal=?,target_weight=?,budget=?,allergies=?,bmr=?,tdee=?,target_calories=?,macro_prot=?,macro_carb=?,macro_fat=? WHERE user_id=?",
        args: [p.weight,p.height,p.age,p.gender,p.activity,p.goal,p.target_weight,p.budget,JSON.stringify(p.allergies||[]),p.bmr,p.tdee,p.target_calories,p.macro_prot,p.macro_carb,p.macro_fat,req.user.id] });
    } else {
      await db.execute({ sql: "INSERT INTO profiles (id,user_id,weight,height,age,gender,activity,goal,target_weight,budget,allergies,bmr,tdee,target_calories,macro_prot,macro_carb,macro_fat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        args: [uid(),req.user.id,p.weight,p.height,p.age,p.gender,p.activity,p.goal,p.target_weight,p.budget,JSON.stringify(p.allergies||[]),p.bmr,p.tdee,p.target_calories,p.macro_prot,p.macro_carb,p.macro_fat] });
    }
    const r = await db.execute({ sql: "SELECT * FROM profiles WHERE user_id=?", args: [req.user.id] });
    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore profilo" }); }
});

// FOODS
app.get("/api/foods", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM foods WHERE is_default=1 OR created_by=? ORDER BY category,name", args: [req.user.id] });
  res.json(r.rows);
});
app.get("/api/foods/search", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM foods WHERE (is_default=1 OR created_by=?) AND name LIKE ? LIMIT 20", args: [req.user.id, `%${req.query.q||""}%`] });
  res.json(r.rows);
});

// DIARY
app.get("/api/diary/today", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM diary_entries WHERE user_id=? AND entry_date=? ORDER BY entry_time DESC", args: [req.user.id, today()] });
  res.json(r.rows);
});

app.post("/api/diary", auth, async (req, res) => {
  try {
    const d = req.body; const id = uid();
    const time = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    await db.execute({ sql: "INSERT INTO diary_entries (id,user_id,food_id,food_name,portion,calories,protein,carbs,fat,meal_type,entry_date,entry_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [id,req.user.id,d.food_id||null,d.food_name,d.portion||100,d.calories,d.protein||0,d.carbs||0,d.fat||0,d.meal_type||"altro",today(),time] });
    const s = await db.execute({ sql: "SELECT * FROM user_stats WHERE user_id=?", args: [req.user.id] });
    if (s.rows.length && s.rows[0].last_tracked_date !== today()) {
      const prev = s.rows[0]; const yesterday = new Date(Date.now()-86400000).toISOString().split("T")[0];
      const streak = prev.last_tracked_date === yesterday ? prev.streak + 1 : 1;
      await db.execute({ sql: "UPDATE user_stats SET days_tracked=days_tracked+1, xp=xp+15, last_tracked_date=?, streak=? WHERE user_id=?", args: [today(),streak,req.user.id] });
    }
    res.status(201).json({ id, food_name:d.food_name, portion:d.portion, calories:d.calories, protein:d.protein, carbs:d.carbs, fat:d.fat, entry_date:today(), entry_time:time });
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore" }); }
});

app.delete("/api/diary/:id", auth, async (req, res) => {
  await db.execute({ sql: "DELETE FROM diary_entries WHERE id=? AND user_id=?", args: [req.params.id, req.user.id] }); res.json({ ok: true });
});

app.get("/api/diary/stats/weekly", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT entry_date,SUM(calories) as cal,SUM(protein) as prot,SUM(carbs) as carb,SUM(fat) as fat FROM diary_entries WHERE user_id=? AND entry_date>=date('now','-7 days') GROUP BY entry_date ORDER BY entry_date", args: [req.user.id] });
  res.json(r.rows);
});

// MEAL PLAN
const MEALS = {
  colazione: [
    { name:"Colazione Proteica", foods:[25,8,9], portions:[60,1,1], desc:"Porridge con yogurt e banana" },
    { name:"Colazione Classica", foods:[7,5,23], portions:[50,2,1], desc:"Pane con uova e mela" },
    { name:"Colazione Light", foods:[8,15,9], portions:[1,20,0.5], desc:"Yogurt con mandorle e banana" },
  ],
  pranzo: [
    { name:"Bowl Proteico", foods:[1,2,3], portions:[150,80,100], desc:"Pollo con riso e broccoli" },
    { name:"Pasta Mediterranea", foods:[11,14,19], portions:[80,100,30], desc:"Pasta pomodoro e parmigiano" },
    { name:"Insalata Quinoa", foods:[20,4,10], portions:[80,100,50], desc:"Quinoa salmone spinaci" },
  ],
  cena: [
    { name:"Cena Leggera", foods:[4,10,17], portions:[150,100,150], desc:"Salmone spinaci patate dolci" },
    { name:"Zuppa Legumi", foods:[16,22,14], portions:[80,150,100], desc:"Lenticchie zucchine pomodoro" },
    { name:"Pollo Griglia", foods:[24,22,18], portions:[150,200,1], desc:"Tacchino zucchine grigliate" },
  ],
  spuntino: [
    { name:"Spuntino Energetico", foods:[15,9], portions:[30,1], desc:"Mandorle e banana" },
    { name:"Spuntino Proteico", foods:[8,23], portions:[1,1], desc:"Yogurt greco e mela" },
  ],
};

app.get("/api/mealplan", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM meal_plans WHERE user_id=?", args: [req.user.id] });
  const plan = {};
  r.rows.forEach(row => { if (!plan[row.day_name]) plan[row.day_name] = {}; plan[row.day_name][row.meal_type] = { name:row.meal_name, desc:row.meal_desc, foods:JSON.parse(row.foods_json), portions:JSON.parse(row.portions_json), total_calories:row.total_calories }; });
  res.json(plan);
});

app.post("/api/mealplan/generate", auth, async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM meal_plans WHERE user_id=?", args: [req.user.id] });
    const allFoods = await db.execute("SELECT * FROM foods WHERE is_default=1");
    const fm = {}; allFoods.rows.forEach(f => fm[f.id] = f);
    const days = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
    const plan = {};
    for (const day of days) {
      plan[day] = {};
      for (const type of ["colazione","pranzo","cena","spuntino"]) {
        const arr = MEALS[type]; const meal = arr[Math.floor(Math.random()*arr.length)];
        let tc = 0; meal.foods.forEach((fId,i) => { const f=fm[fId]; if(f) tc += Math.round(f.calories*meal.portions[i]/100); });
        await db.execute({ sql: "INSERT INTO meal_plans (id,user_id,day_name,meal_type,meal_name,meal_desc,foods_json,portions_json,total_calories) VALUES (?,?,?,?,?,?,?,?,?)",
          args: [uid(),req.user.id,day,type,meal.name,meal.desc,JSON.stringify(meal.foods),JSON.stringify(meal.portions),tc] });
        plan[day][type] = { name:meal.name, desc:meal.desc, foods:meal.foods, portions:meal.portions, total_calories:tc };
      }
    }
    // Shopping list
    await db.execute({ sql: "DELETE FROM shopping_items WHERE user_id=?", args: [req.user.id] });
    const agg = {};
    Object.values(plan).forEach(day => Object.values(day).forEach(meal => { meal.foods.forEach((fId,i) => { const f=fm[fId]; if(f){if(!agg[f.id])agg[f.id]={...f,qty:0};agg[f.id].qty+=meal.portions[i];} }); }));
    for (const item of Object.values(agg)) {
      await db.execute({ sql: "INSERT INTO shopping_items (id,user_id,food_id,food_name,category,quantity,unit,price) VALUES (?,?,?,?,?,?,?,?)",
        args: [uid(),req.user.id,item.id,item.name,item.category,item.qty,item.unit,item.price] });
    }
    res.json(plan);
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore" }); }
});

// SHOPPING
app.get("/api/shopping", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM shopping_items WHERE user_id=? ORDER BY category,food_name", args: [req.user.id] }); res.json(r.rows);
});
app.patch("/api/shopping/:id/toggle", auth, async (req, res) => {
  await db.execute({ sql: "UPDATE shopping_items SET checked=CASE WHEN checked=0 THEN 1 ELSE 0 END WHERE id=? AND user_id=?", args: [req.params.id,req.user.id] }); res.json({ ok:true });
});

// WEIGHT
app.get("/api/weight", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM weight_log WHERE user_id=? ORDER BY log_date DESC LIMIT 30", args: [req.user.id] }); res.json(r.rows);
});
app.post("/api/weight", auth, async (req, res) => {
  const { weight } = req.body;
  const exists = await db.execute({ sql: "SELECT id FROM weight_log WHERE user_id=? AND log_date=?", args: [req.user.id,today()] });
  if (exists.rows.length) await db.execute({ sql: "UPDATE weight_log SET weight=? WHERE id=?", args: [weight,exists.rows[0].id] });
  else await db.execute({ sql: "INSERT INTO weight_log (id,user_id,weight,log_date) VALUES (?,?,?,?)", args: [uid(),req.user.id,weight,today()] });
  await db.execute({ sql: "UPDATE profiles SET weight=? WHERE user_id=?", args: [weight,req.user.id] });
  res.json({ weight, log_date:today() });
});

// CHAT
app.get("/api/chat", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM chat_messages WHERE user_id=? ORDER BY created_at ASC LIMIT 100", args: [req.user.id] }); res.json(r.rows);
});
app.post("/api/chat", auth, async (req, res) => {
  try {
    const { message } = req.body; const uId=uid(), aId=uid();
    await db.execute({ sql: "INSERT INTO chat_messages (id,user_id,role,message) VALUES (?,?,'user',?)", args: [uId,req.user.id,message] });
    const prof = (await db.execute({ sql: "SELECT * FROM profiles WHERE user_id=?", args: [req.user.id] })).rows[0] || {};
    const td = (await db.execute({ sql: "SELECT SUM(calories) as cal,SUM(protein) as prot FROM diary_entries WHERE user_id=? AND entry_date=?", args: [req.user.id,today()] })).rows[0] || {};
    const low = message.toLowerCase(); let resp;
    if (low.includes("calorie")||low.includes("kcal")) resp=`Oggi: ${td.cal||0} kcal su ${prof.target_calories||"?"} target. ${(td.cal||0)<(prof.target_calories||2000)?"Hai margine! 💪":"Vicino al target!"}`;
    else if (low.includes("peso")) resp=`Peso: ${prof.weight||"?"} kg → obiettivo ${prof.target_weight||"?"} kg. Piano: ${prof.goal||"mantenimento"}.`;
    else if (low.includes("macro")||low.includes("proteine")) resp=`Target: ${prof.macro_prot||"?"}g prot, ${prof.macro_carb||"?"}g carb, ${prof.macro_fat||"?"}g grassi.`;
    else if (low.includes("ricetta")) resp="Idea: Bowl Quinoa Mediterraneo 🥗 - quinoa, pomodorini, feta, olive, olio EVO. ~420 kcal, 20 min!";
    else if (low.includes("motivaz")) resp="Ogni piccolo passo conta! 🌟 Costanza batte perfezione!";
    else resp="Posso aiutarti con: calorie, macro, peso, ricette, motivazione! 😊";
    await db.execute({ sql: "INSERT INTO chat_messages (id,user_id,role,message) VALUES (?,?,'ai',?)", args: [aId,req.user.id,resp] });
    res.json({ userMsg:{id:uId,role:"user",message}, aiMsg:{id:aId,role:"ai",message:resp} });
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore" }); }
});

// DASHBOARD
app.get("/api/dashboard", auth, async (req, res) => {
  try {
    const [profile,todayDiary,weekly,weight,stats,shop] = await Promise.all([
      db.execute({ sql: "SELECT * FROM profiles WHERE user_id=?", args: [req.user.id] }),
      db.execute({ sql: "SELECT * FROM diary_entries WHERE user_id=? AND entry_date=? ORDER BY entry_time DESC", args: [req.user.id,today()] }),
      db.execute({ sql: "SELECT entry_date,SUM(calories) as cal,SUM(protein) as prot,SUM(carbs) as carb,SUM(fat) as fat FROM diary_entries WHERE user_id=? AND entry_date>=date('now','-7 days') GROUP BY entry_date ORDER BY entry_date", args: [req.user.id] }),
      db.execute({ sql: "SELECT * FROM weight_log WHERE user_id=? ORDER BY log_date DESC LIMIT 7", args: [req.user.id] }),
      db.execute({ sql: "SELECT * FROM user_stats WHERE user_id=?", args: [req.user.id] }),
      db.execute({ sql: "SELECT SUM(price*quantity/1000) as total FROM shopping_items WHERE user_id=?", args: [req.user.id] }),
    ]);
    res.json({ profile:profile.rows[0]||null, todayEntries:todayDiary.rows, weeklyStats:weekly.rows, weightLog:weight.rows, stats:stats.rows[0]||{xp:0,days_tracked:0,streak:0}, shoppingTotal:shop.rows[0]?.total||0 });
  } catch (e) { console.error(e); res.status(500).json({ error: "Errore" }); }
});

// SPA
if (process.env.NODE_ENV === "production") app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../client/dist/index.html")));

app.listen(PORT, () => console.log(`🥗 NutriGenius API on port ${PORT}`));
