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
const td = () => new Date().toISOString().split("T")[0];

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === "production") app.use(express.static(path.join(__dirname, "../client/dist")));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ error: "Token mancante" });
  try { req.user = jwt.verify(h.split(" ")[1], SECRET); next(); }
  catch (e) { res.status(401).json({ error: "Token non valido" }); }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Campi obbligatori" });
    const exists = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (exists.rows.length) return res.status(409).json({ error: "Email gia registrata" });
    const id = uid(); const hash = await bcrypt.hash(password, 10);
    await db.execute({ sql: "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)", args: [id, name, email, hash] });
    await db.execute({ sql: "INSERT INTO user_stats (user_id) VALUES (?)", args: [id] });
    const token = jwt.sign({ id, email, role: "utente" }, SECRET, { expiresIn: "30d" });
    res.status(201).json({ user: { id, name, email, role: "utente" }, token });
  } catch (e) { res.status(500).json({ error: "Errore registrazione" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await db.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });
    if (!r.rows.length) return res.status(401).json({ error: "Credenziali non valide" });
    const u = r.rows[0]; const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenziali non valide" });
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, SECRET, { expiresIn: "30d" });
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, token });
  } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try { const r = await db.execute({ sql: "SELECT id, name, email, role FROM users WHERE id = ?", args: [req.user.id] }); res.json(r.rows[0] || null); } catch (e) { res.status(500).json({ error: "Errore" }); }
});
app.patch("/api/auth/me", auth, async (req, res) => {
  try { await db.execute({ sql: "UPDATE users SET name = ? WHERE id = ?", args: [req.body.name, req.user.id] }); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: "Errore" }); }
});

app.get("/api/profile", auth, async (req, res) => {
  try { const r = await db.execute({ sql: "SELECT * FROM profiles WHERE user_id = ?", args: [req.user.id] }); res.json(r.rows[0] || null); } catch (e) { res.status(500).json({ error: "Errore" }); }
});
app.post("/api/profile", auth, async (req, res) => {
  try {
    const p = req.body; const allerg = JSON.stringify(p.allergies || []);
    const exists = await db.execute({ sql: "SELECT id FROM profiles WHERE user_id = ?", args: [req.user.id] });
    if (exists.rows.length) {
      await db.execute({ sql: "UPDATE profiles SET weight=?,height=?,age=?,gender=?,activity=?,goal=?,target_weight=?,budget=?,allergies=?,bmr=?,tdee=?,target_calories=?,macro_prot=?,macro_carb=?,macro_fat=? WHERE user_id=?", args: [p.weight,p.height,p.age,p.gender,p.activity,p.goal,p.target_weight,p.budget,allerg,p.bmr,p.tdee,p.target_calories,p.macro_prot,p.macro_carb,p.macro_fat,req.user.id] });
    } else {
      await db.execute({ sql: "INSERT INTO profiles (id,user_id,weight,height,age,gender,activity,goal,target_weight,budget,allergies,bmr,tdee,target_calories,macro_prot,macro_carb,macro_fat) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", args: [uid(),req.user.id,p.weight,p.height,p.age,p.gender,p.activity,p.goal,p.target_weight,p.budget,allerg,p.bmr,p.tdee,p.target_calories,p.macro_prot,p.macro_carb,p.macro_fat] });
    }
    const r = await db.execute({ sql: "SELECT * FROM profiles WHERE user_id = ?", args: [req.user.id] }); res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: "Errore profilo" }); }
});

app.get("/api/foods", auth, async (req, res) => { try { const r = await db.execute({ sql: "SELECT * FROM foods WHERE is_default = 1 OR created_by = ? ORDER BY category, name", args: [req.user.id] }); res.json(r.rows); } catch (e) { res.status(500).json({ error: "Errore" }); } });
app.post("/api/foods", auth, async (req, res) => { try { const f = req.body; await db.execute({ sql: "INSERT INTO foods (name,calories,protein,carbs,fat,category,price,unit,created_by,is_default) VALUES (?,?,?,?,?,?,?,?,?,0)", args: [f.name,f.calories,f.protein||0,f.carbs||0,f.fat||0,f.category||"Altro",f.price||0,f.unit||"kg",req.user.id] }); const r = await db.execute("SELECT * FROM foods WHERE rowid = last_insert_rowid()"); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json({ error: "Errore" }); } });
app.delete("/api/foods/:id", auth, async (req, res) => { try { await db.execute({ sql: "DELETE FROM foods WHERE id=? AND created_by=?", args: [req.params.id, req.user.id] }); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: "Errore" }); } });

app.get("/api/diary/today", auth, async (req, res) => { try { const r = await db.execute({ sql: "SELECT * FROM diary_entries WHERE user_id=? AND entry_date=? ORDER BY entry_time DESC", args: [req.user.id, td()] }); res.json(r.rows); } catch (e) { res.status(500).json({ error: "Errore" }); } });
app.post("/api/diary", auth, async (req, res) => {
  try { const d = req.body; const id = uid(); const time = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
    await db.execute({ sql: "INSERT INTO diary_entries (id,user_id,food_id,food_name,portion,calories,protein,carbs,fat,meal_type,entry_date,entry_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", args: [id,req.user.id,d.food_id||null,d.food_name,d.portion||100,d.calories,d.protein||0,d.carbs||0,d.fat||0,d.meal_type||"altro",td(),time] });
    const s = await db.execute({ sql: "SELECT * FROM user_stats WHERE user_id=?", args: [req.user.id] });
    if (s.rows.length && s.rows[0].last_tracked_date !== td()) { const prev=s.rows[0]; const y=new Date(Date.now()-86400000).toISOString().split("T")[0]; const streak=prev.last_tracked_date===y?(prev.streak||0)+1:1; await db.execute({ sql: "UPDATE user_stats SET days_tracked=days_tracked+1,xp=xp+15,last_tracked_date=?,streak=? WHERE user_id=?", args: [td(),streak,req.user.id] }); }
    res.status(201).json({ id, food_name:d.food_name, portion:d.portion, calories:d.calories, protein:d.protein, carbs:d.carbs, fat:d.fat, meal_type:d.meal_type, entry_date:td(), entry_time:time });
  } catch (e) { res.status(500).json({ error: "Errore" }); }
});
app.put("/api/diary/:id", auth, async (req, res) => { try { const d=req.body; await db.execute({ sql: "UPDATE diary_entries SET food_name=?,portion=?,calories=?,protein=?,carbs=?,fat=?,meal_type=? WHERE id=? AND user_id=?", args: [d.food_name,d.portion,d.calories,d.protein||0,d.carbs||0,d.fat||0,d.meal_type||"altro",req.params.id,req.user.id] }); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: "Errore" }); } });
app.delete("/api/diary/:id", auth, async (req, res) => { try { await db.execute({ sql: "DELETE FROM diary_entries WHERE id=? AND user_id=?", args: [req.params.id, req.user.id] }); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: "Errore" }); } });
app.get("/api/diary/stats/weekly", auth, async (req, res) => { try { const r = await db.execute({ sql: "SELECT entry_date, SUM(calories) as cal, SUM(protein) as prot, SUM(carbs) as carb, SUM(fat) as fat FROM diary_entries WHERE user_id=? AND entry_date >= date('now','-7 days') GROUP BY entry_date ORDER BY entry_date", args: [req.user.id] }); res.json(r.rows); } catch (e) { res.status(500).json({ error: "Errore" }); } });

const DIST = { colazione: 0.25, pranzo: 0.35, cena: 0.30, spuntino: 0.10 };
const MEAL_DB = {
  colazione: [
    { name:"Porridge Proteico", desc:"Fiocchi d'avena, yogurt greco, banana", foods:[25,8,9], bp:[60,150,100] },
    { name:"Colazione Classica", desc:"Pane integrale, uova, mela", foods:[7,5,23], bp:[50,120,150] },
    { name:"Colazione Light", desc:"Yogurt greco, mandorle, banana", foods:[8,15,9], bp:[200,20,100] },
    { name:"Toast Avocado", desc:"Pane integrale, avocado, uova", foods:[7,6,5], bp:[60,80,60] },
    { name:"Overnight Oats", desc:"Fiocchi d'avena, banana, mandorle", foods:[25,9,15], bp:[50,100,15] },
    { name:"Bowl Energetico", desc:"Yogurt greco, mela, fiocchi d'avena", foods:[8,23,25], bp:[200,150,30] },
  ],
  pranzo: [
    { name:"Bowl Pollo & Riso", desc:"Pollo, riso integrale, broccoli", foods:[1,2,3], bp:[150,80,150] },
    { name:"Pasta Mediterranea", desc:"Pasta integrale, pomodori, parmigiano", foods:[11,14,19], bp:[80,150,30] },
    { name:"Insalata Quinoa", desc:"Quinoa, salmone, spinaci", foods:[20,4,10], bp:[80,120,100] },
    { name:"Bowl Tacchino", desc:"Tacchino, patate dolci, zucchine", foods:[24,17,22], bp:[150,200,150] },
    { name:"Pasta Tonno", desc:"Pasta integrale, tonno, pomodori", foods:[11,12,14], bp:[80,100,100] },
    { name:"Riso e Lenticchie", desc:"Riso integrale, lenticchie, spinaci", foods:[2,16,10], bp:[80,60,100] },
    { name:"Pollo Quinoa Bowl", desc:"Pollo, quinoa, zucchine", foods:[1,20,22], bp:[150,70,150] },
    { name:"Salmone e Riso", desc:"Salmone, riso integrale, broccoli", foods:[4,2,3], bp:[130,80,150] },
  ],
  cena: [
    { name:"Salmone & Verdure", desc:"Salmone, spinaci, patate dolci", foods:[4,10,17], bp:[150,100,150] },
    { name:"Zuppa di Legumi", desc:"Lenticchie, zucchine, pomodori", foods:[16,22,14], bp:[80,200,150] },
    { name:"Tacchino Griglia", desc:"Tacchino, zucchine, olio EVO", foods:[24,22,18], bp:[150,200,10] },
    { name:"Pollo Light", desc:"Pollo, spinaci, pomodori", foods:[1,10,14], bp:[150,150,100] },
    { name:"Ceci e Verdure", desc:"Ceci, zucchine, pomodori, olio EVO", foods:[21,22,14,18], bp:[70,200,100,10] },
    { name:"Omelette Ricca", desc:"Uova, spinaci, mozzarella", foods:[5,10,13], bp:[180,100,40] },
    { name:"Salmone Leggero", desc:"Salmone, broccoli, quinoa", foods:[4,3,20], bp:[130,150,50] },
  ],
  spuntino: [
    { name:"Frutta Secca Mix", desc:"Mandorle, banana", foods:[15,9], bp:[25,100] },
    { name:"Yogurt e Frutta", desc:"Yogurt greco, mela", foods:[8,23], bp:[150,150] },
    { name:"Avocado Toast Mini", desc:"Pane integrale, avocado", foods:[7,6], bp:[30,50] },
    { name:"Mela e Mandorle", desc:"Mela, mandorle", foods:[23,15], bp:[150,15] },
    { name:"Yogurt Proteico", desc:"Yogurt greco, fiocchi d'avena", foods:[8,25], bp:[150,20] },
  ],
};

function calcMC(fm, fids, portions) { let c=0; for(let i=0;i<fids.length;i++){const f=fm[fids[i]];if(f)c+=f.calories*portions[i]/100;} return Math.round(c); }
function scaleMeal(meal, fm, tgt) { const base=calcMC(fm,meal.foods,meal.bp); if(base<=0)return{portions:meal.bp,cal:0}; const r=Math.max(0.5,Math.min(2.0,tgt/base)); const p=meal.bp.map(x=>Math.round(x*r)); return{portions:p,cal:calcMC(fm,meal.foods,p)}; }
function pickMeal(type, excl) { const arr=MEAL_DB[type]; const av=excl?arr.filter(m=>m.name!==excl):arr; const pool=av.length>0?av:arr; return pool[Math.floor(Math.random()*pool.length)]; }

async function rebuildShopping(userId) {
  const plans = await db.execute({ sql: "SELECT * FROM meal_plans WHERE user_id=?", args: [userId] });
  const allF = await db.execute("SELECT * FROM foods WHERE is_default=1");
  const fm = {}; for (const f of allF.rows) fm[f.id] = f;
  await db.execute({ sql: "DELETE FROM shopping_items WHERE user_id=? AND is_manual=0", args: [userId] });
  const agg = {};
  for (const row of plans.rows) {
    const fids = JSON.parse(row.foods_json), portions = JSON.parse(row.portions_json);
    for (let i=0; i<fids.length; i++) { const f=fm[fids[i]]; if(f){if(!agg[f.id])agg[f.id]={...f,qty:0}; agg[f.id].qty+=portions[i];} }
  }
  for (const item of Object.values(agg)) {
    await db.execute({ sql: "INSERT INTO shopping_items (id,user_id,food_id,food_name,category,quantity,unit,price,is_manual) VALUES (?,?,?,?,?,?,?,?,0)", args: [uid(),userId,item.id,item.name,item.category,item.qty,item.unit,item.price] });
  }
}

app.get("/api/mealplan", auth, async (req, res) => {
  try { const r = await db.execute({ sql: "SELECT * FROM meal_plans WHERE user_id=?", args: [req.user.id] }); const plan = {};
    for (const row of r.rows) { if(!plan[row.day_name])plan[row.day_name]={}; plan[row.day_name][row.meal_type]={id:row.id,name:row.meal_name,desc:row.meal_desc,foods:JSON.parse(row.foods_json),portions:JSON.parse(row.portions_json),total_calories:row.total_calories}; }
    res.json(plan); } catch(e){res.status(500).json({error:"Errore"});}
});

app.post("/api/mealplan/generate", auth, async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM meal_plans WHERE user_id=?", args: [req.user.id] });
    const prof=(await db.execute({sql:"SELECT * FROM profiles WHERE user_id=?",args:[req.user.id]})).rows[0];
    const tgt=prof?.target_calories||2000;
    const allF=await db.execute("SELECT * FROM foods WHERE is_default=1"); const fm={}; for(const f of allF.rows)fm[f.id]=f;
    const days=["Lunedi","Martedi","Mercoledi","Giovedi","Venerdi","Sabato","Domenica"]; const plan={};
    for(const day of days){plan[day]={};
      for(const type of ["colazione","pranzo","cena","spuntino"]){
        const tc=Math.round(tgt*DIST[type]); const meal=pickMeal(type); const{portions,cal}=scaleMeal(meal,fm,tc); const mid=uid();
        await db.execute({sql:"INSERT INTO meal_plans (id,user_id,day_name,meal_type,meal_name,meal_desc,foods_json,portions_json,total_calories) VALUES (?,?,?,?,?,?,?,?,?)",args:[mid,req.user.id,day,type,meal.name,meal.desc,JSON.stringify(meal.foods),JSON.stringify(portions),cal]});
        plan[day][type]={id:mid,name:meal.name,desc:meal.desc,foods:meal.foods,portions,total_calories:cal};
      }
    }
    await rebuildShopping(req.user.id); res.json(plan);
  } catch(e){console.error("Mealplan:",e.message);res.status(500).json({error:"Errore"});}
});

app.post("/api/mealplan/regen-meal", auth, async (req, res) => {
  try {
    const{day,mealType,excludeName}=req.body;
    const prof=(await db.execute({sql:"SELECT * FROM profiles WHERE user_id=?",args:[req.user.id]})).rows[0];
    const tgt=prof?.target_calories||2000; const tc=Math.round(tgt*(DIST[mealType]||0.25));
    const allF=await db.execute("SELECT * FROM foods WHERE is_default=1"); const fm={}; for(const f of allF.rows)fm[f.id]=f;
    await db.execute({sql:"DELETE FROM meal_plans WHERE user_id=? AND day_name=? AND meal_type=?",args:[req.user.id,day,mealType]});
    const meal=pickMeal(mealType,excludeName); const{portions,cal}=scaleMeal(meal,fm,tc); const mid=uid();
    await db.execute({sql:"INSERT INTO meal_plans (id,user_id,day_name,meal_type,meal_name,meal_desc,foods_json,portions_json,total_calories) VALUES (?,?,?,?,?,?,?,?,?)",args:[mid,req.user.id,day,mealType,meal.name,meal.desc,JSON.stringify(meal.foods),JSON.stringify(portions),cal]});
    await rebuildShopping(req.user.id);
    const shop=await db.execute({sql:"SELECT * FROM shopping_items WHERE user_id=? ORDER BY category,food_name",args:[req.user.id]});
    res.json({meal:{id:mid,name:meal.name,desc:meal.desc,foods:meal.foods,portions,total_calories:cal},shopping:shop.rows});
  } catch(e){console.error("RegenMeal:",e.message);res.status(500).json({error:"Errore"});}
});

app.get("/api/shopping", auth, async (req,res)=>{try{const r=await db.execute({sql:"SELECT * FROM shopping_items WHERE user_id=? ORDER BY category,food_name",args:[req.user.id]});res.json(r.rows);}catch(e){res.status(500).json({error:"Errore"});}});
app.patch("/api/shopping/:id/toggle", auth, async (req,res)=>{try{await db.execute({sql:"UPDATE shopping_items SET checked=CASE WHEN checked=0 THEN 1 ELSE 0 END WHERE id=? AND user_id=?",args:[req.params.id,req.user.id]});res.json({ok:true});}catch(e){res.status(500).json({error:"Errore"});}});
app.post("/api/shopping", auth, async (req,res)=>{try{const{food_name,category,quantity,unit,price}=req.body;const id=uid();await db.execute({sql:"INSERT INTO shopping_items (id,user_id,food_name,category,quantity,unit,price,is_manual) VALUES (?,?,?,?,?,?,?,1)",args:[id,req.user.id,food_name,category||"Altro",quantity||1,unit||"pz",price||0]});res.status(201).json({id,food_name,category:category||"Altro",quantity:quantity||1,unit:unit||"pz",price:price||0,checked:0,is_manual:1});}catch(e){res.status(500).json({error:"Errore"});}});
app.put("/api/shopping/:id", auth, async (req,res)=>{try{const{food_name,category,quantity,unit,price}=req.body;await db.execute({sql:"UPDATE shopping_items SET food_name=?,category=?,quantity=?,unit=?,price=? WHERE id=? AND user_id=?",args:[food_name,category||"Altro",quantity||1,unit||"pz",price||0,req.params.id,req.user.id]});res.json({ok:true});}catch(e){res.status(500).json({error:"Errore"});}});
app.delete("/api/shopping/:id", auth, async (req,res)=>{try{await db.execute({sql:"DELETE FROM shopping_items WHERE id=? AND user_id=?",args:[req.params.id,req.user.id]});res.json({ok:true});}catch(e){res.status(500).json({error:"Errore"});}});

app.get("/api/weight", auth, async (req,res)=>{try{const r=await db.execute({sql:"SELECT * FROM weight_log WHERE user_id=? ORDER BY log_date DESC LIMIT 30",args:[req.user.id]});res.json(r.rows);}catch(e){res.status(500).json({error:"Errore"});}});
app.post("/api/weight", auth, async (req,res)=>{try{const{weight}=req.body;const ex=await db.execute({sql:"SELECT id FROM weight_log WHERE user_id=? AND log_date=?",args:[req.user.id,td()]});if(ex.rows.length){await db.execute({sql:"UPDATE weight_log SET weight=? WHERE id=?",args:[weight,ex.rows[0].id]});}else{await db.execute({sql:"INSERT INTO weight_log (id,user_id,weight,log_date) VALUES (?,?,?,?)",args:[uid(),req.user.id,weight,td()]});}await db.execute({sql:"UPDATE profiles SET weight=? WHERE user_id=?",args:[weight,req.user.id]});res.json({weight,log_date:td()});}catch(e){res.status(500).json({error:"Errore"});}});

app.get("/api/challenges", auth, async (req,res)=>{try{const r=await db.execute({sql:"SELECT * FROM challenge_progress WHERE user_id=?",args:[req.user.id]});res.json(r.rows);}catch(e){res.status(500).json({error:"Errore"});}});
app.post("/api/challenges/:id/progress", auth, async (req,res)=>{try{const{progress}=req.body;const ex=await db.execute({sql:"SELECT * FROM challenge_progress WHERE user_id=? AND challenge_id=?",args:[req.user.id,req.params.id]});if(ex.rows.length){await db.execute({sql:"UPDATE challenge_progress SET progress=? WHERE user_id=? AND challenge_id=?",args:[progress,req.user.id,req.params.id]});}else{await db.execute({sql:"INSERT INTO challenge_progress (id,user_id,challenge_id,progress) VALUES (?,?,?,?)",args:[uid(),req.user.id,req.params.id,progress]});}res.json({ok:true});}catch(e){res.status(500).json({error:"Errore"});}});

app.get("/api/dashboard", auth, async (req,res)=>{
  try{const profile=await db.execute({sql:"SELECT * FROM profiles WHERE user_id=?",args:[req.user.id]});
  const todayDiary=await db.execute({sql:"SELECT * FROM diary_entries WHERE user_id=? AND entry_date=? ORDER BY entry_time DESC",args:[req.user.id,td()]});
  const weekly=await db.execute({sql:"SELECT entry_date,SUM(calories) as cal,SUM(protein) as prot,SUM(carbs) as carb,SUM(fat) as fat FROM diary_entries WHERE user_id=? AND entry_date>=date('now','-7 days') GROUP BY entry_date ORDER BY entry_date",args:[req.user.id]});
  const weight=await db.execute({sql:"SELECT * FROM weight_log WHERE user_id=? ORDER BY log_date DESC LIMIT 7",args:[req.user.id]});
  const stats=await db.execute({sql:"SELECT * FROM user_stats WHERE user_id=?",args:[req.user.id]});
  const shop=await db.execute({sql:"SELECT SUM(price*quantity/1000) as total FROM shopping_items WHERE user_id=?",args:[req.user.id]});
  res.json({profile:profile.rows[0]||null,todayEntries:todayDiary.rows,weeklyStats:weekly.rows,weightLog:weight.rows,stats:stats.rows[0]||{xp:0,days_tracked:0,streak:0},shoppingTotal:shop.rows[0]?shop.rows[0].total||0:0});}catch(e){res.status(500).json({error:"Errore"});}
});

if(process.env.NODE_ENV==="production"){app.get("*",(req,res)=>{res.sendFile(path.join(__dirname,"../client/dist/index.html"));});}
app.listen(PORT,()=>{console.log("🥗 NutriGenius v3 on port "+PORT);});
