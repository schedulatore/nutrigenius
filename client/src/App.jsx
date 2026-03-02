import { useState, useEffect, useRef, useCallback } from "react";
import api from "./api.js";
import { HealthRing, MacroRing, MiniBarChart, CATS, BADGES, CHALLS, calcBMR, calcTDEE, calcGoalCal, calcMacros, fmtDate } from "./components.jsx";

export default function App() {
const [loading, setLoading] = useState(true);
const [dark, setDark] = useState(() => { const s = localStorage.getItem("ng-dark"); return s !== null ? s === "true" : true; });
const [sbOpen, setSbOpen] = useState(false);
const [page, setPage] = useState("dashboard");
const [user, setUser] = useState(null);
const [authMode, setAuthMode] = useState("login");
const [profile, setProfile] = useState(null);
const [foods, setFoods] = useState([]);
const [todayEntries, setTodayEntries] = useState([]);
const [weeklyStats, setWeeklyStats] = useState([]);
const [mealPlan, setMealPlan] = useState({});
const [shoppingList, setShoppingList] = useState([]);
const [weightLog, setWeightLog] = useState([]);
const [userStats, setUserStats] = useState({ xp: 0, days_tracked: 0, streak: 0 });
const [chatMessages, setChatMessages] = useState([{ role: "ai", message: "Ciao! Sono il tuo coach nutrizionale.\nPosso aiutarti con: calorie, macro, peso, ricette (con link!), consigli, motivazione." }]);
const [showModal, setShowModal] = useState(null);
const [searchFood, setSearchFood] = useState("");
const [chatInput, setChatInput] = useState("");
const [loginForm, setLF] = useState({ email: "", password: "", name: "" });
const [setupForm, setSF] = useState({ weight: 70, height: 170, age: 30, gender: "M", activity: "moderato", goal: "mantenimento", target_weight: 70, budget: 80 });
const [error, setError] = useState("");
const [toast, setToast] = useState("");
const [editingEntry, setEditingEntry] = useState(null);
const [challengeProgress, setChallengeProgress] = useState({});

useEffect(() => { localStorage.setItem("ng-dark", dark); }, [dark]);
const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); }, []);

useEffect(() => { (async () => { if (api.getToken()) { try { const u = await api.getMe(); setUser(u); const p = await api.getProfile(); if (p) { setProfile(p); await loadDash(); } else setAuthMode("setup"); } catch (e) { api.logout(); } } setLoading(false); })(); }, []);

const loadDash = async () => {
  try {
    const [dash, fl, plan, shop, chat] = await Promise.all([api.getDashboard(), api.getFoods(), api.getMealPlan(), api.getShopping(), api.getChatHistory().catch(() => [])]);
    setProfile(dash.profile); setTodayEntries(dash.todayEntries); setWeeklyStats(dash.weeklyStats);
    setWeightLog(dash.weightLog); setUserStats(dash.stats); setFoods(fl); setMealPlan(plan); setShoppingList(shop);
    if (chat.length) setChatMessages(chat);
    try { const cp = await api.getChallenges(); const m = {}; cp.forEach(c => m[c.challenge_id] = c.progress); setChallengeProgress(m); } catch (e) {}
  } catch (e) { console.error(e); }
};

const handleLogin = async () => { try { setError(""); const d = await api.login(loginForm.email, loginForm.password); setUser(d.user); const p = await api.getProfile(); if (p) { setProfile(p); await loadDash(); } else setAuthMode("setup"); } catch (e) { setError(e.message); } };
const handleRegister = async () => { try { setError(""); if (!loginForm.name || !loginForm.email || !loginForm.password) { setError("Compila tutti i campi"); return; } const d = await api.register(loginForm.name, loginForm.email, loginForm.password); setUser(d.user); setAuthMode("setup"); } catch (e) { setError(e.message); } };
const handleSetup = async () => {
  const bmr = calcBMR(setupForm.weight, setupForm.height, setupForm.age, setupForm.gender);
  const tdee = calcTDEE(bmr, setupForm.activity); const tc = calcGoalCal(tdee, setupForm.goal); const m = calcMacros(tc, setupForm.goal);
  try { const p = await api.saveProfile({ ...setupForm, bmr, tdee, target_calories: tc, macro_prot: m.prot, macro_carb: m.carb, macro_fat: m.fat }); setProfile(p); await api.addWeight(setupForm.weight); await api.generateMealPlan(); await loadDash(); setAuthMode("login"); } catch (e) { setError(e.message); }
};
const handleLogout = () => { api.logout(); setUser(null); setProfile(null); };

const addEntry = async (food, portion = 100, mealType = "altro") => {
  try {
    const e = { food_id: food.id, food_name: food.name, portion, calories: Math.round(food.calories * portion / 100), protein: Math.round(food.protein * portion / 100), carbs: Math.round(food.carbs * portion / 100), fat: Math.round(food.fat * portion / 100), meal_type: mealType };
    const saved = await api.addDiaryEntry(e); setTodayEntries(prev => [saved, ...prev]); setShowModal(null); showToast("Aggiunto: " + food.name);
  } catch (e) { console.error(e); }
};
const deleteEntry = async (id) => { try { await api.deleteDiaryEntry(id); setTodayEntries(prev => prev.filter(e => e.id !== id)); showToast("Rimosso"); } catch (e) {} };
const updateEntry = async (id, data) => { try { await api.updateDiaryEntry(id, data); setTodayEntries(prev => prev.map(e => e.id === id ? { ...e, ...data } : e)); setEditingEntry(null); showToast("Modificato"); } catch (e) {} };

const todayCal = todayEntries.reduce((s, e) => s + (e.calories || 0), 0);
const todayProt = todayEntries.reduce((s, e) => s + (e.protein || 0), 0);
const todayCarb = todayEntries.reduce((s, e) => s + (e.carbs || 0), 0);
const todayFat = todayEntries.reduce((s, e) => s + (e.fat || 0), 0);
const shopTotal = shoppingList.reduce((s, i) => s + (i.price * i.quantity / 1000), 0).toFixed(2);
const healthScore = Math.min(100, 50 + Math.min(20, (userStats.days_tracked || 0) * 2) + (todayCal > 0 && profile?.target_calories ? (Math.abs(1 - todayCal / profile.target_calories) < .15 ? 15 : 8) : 0));
const navigate = (p) => { setPage(p); setSbOpen(false); };

if (loading) return (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: dark ? "#0a0a0f" : "#f8f8f5" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: "3rem", marginBottom: 16 }}>🥗</div><div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", color: dark ? "#e8e8ed" : "#1a1a2e" }}>NutriGenius</div></div></div>);

/* ===== AUTH SCREENS ===== */
if (!user || (authMode === "setup" && user)) {
if (authMode === "setup" && user) return (<div className={dark ? "" : "lm"}><div className="lp"><div className="lb2" style={{ maxWidth: 520 }}>
<div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: 12 }}>🧬</div><h1>Profilo Nutrizionale</h1><p>Configuriamo il tuo piano personalizzato</p>
{error && <div className="err">{error}</div>}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
<div><label className="lb">Peso (kg)</label><input className="ip" type="number" value={setupForm.weight} onChange={e => setSF(p => ({ ...p, weight: +e.target.value }))} /></div>
<div><label className="lb">Altezza (cm)</label><input className="ip" type="number" value={setupForm.height} onChange={e => setSF(p => ({ ...p, height: +e.target.value }))} /></div>
<div><label className="lb">Eta</label><input className="ip" type="number" value={setupForm.age} onChange={e => setSF(p => ({ ...p, age: +e.target.value }))} /></div>
<div><label className="lb">Sesso</label><select className="sl" value={setupForm.gender} onChange={e => setSF(p => ({ ...p, gender: e.target.value }))}><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
<div><label className="lb">Attivita</label><select className="sl" value={setupForm.activity} onChange={e => setSF(p => ({ ...p, activity: e.target.value }))}><option value="sedentario">Sedentario</option><option value="leggero">Leggero</option><option value="moderato">Moderato</option><option value="attivo">Attivo</option><option value="molto_attivo">Molto attivo</option></select></div>
<div><label className="lb">Obiettivo</label><select className="sl" value={setupForm.goal} onChange={e => setSF(p => ({ ...p, goal: e.target.value }))}><option value="dimagrimento">Dimagrimento</option><option value="mantenimento">Mantenimento</option><option value="massa">Massa</option></select></div>
<div><label className="lb">Peso Obiettivo</label><input className="ip" type="number" value={setupForm.target_weight} onChange={e => setSF(p => ({ ...p, target_weight: +e.target.value }))} /></div>
<div><label className="lb">Budget/sett (€)</label><input className="ip" type="number" value={setupForm.budget} onChange={e => setSF(p => ({ ...p, budget: +e.target.value }))} /></div>
</div><button className="bt bp" style={{ width: "100%", marginTop: 24, padding: 14 }} onClick={handleSetup}>Genera Piano</button></div></div></div>);

return (<div className={dark ? "" : "lm"}><div className="lp"><div className="lb2">
<div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: 8 }}>🥗</div><h1>NutriGenius</h1><p>Nutrizione intelligente</p>
<div className="tb"><div className={"ti " + (authMode === "login" ? "ac" : "")} onClick={() => { setAuthMode("login"); setError(""); }}>Accedi</div><div className={"ti " + (authMode === "register" ? "ac" : "")} onClick={() => { setAuthMode("register"); setError(""); }}>Registrati</div></div>
{error && <div className="err">{error}</div>}
{authMode === "register" && <div style={{ marginBottom: 16 }}><label className="lb">Nome</label><input className="ip" placeholder="Nome" value={loginForm.name} onChange={e => setLF(p => ({ ...p, name: e.target.value }))} /></div>}
<div style={{ marginBottom: 16 }}><label className="lb">Email</label><input className="ip" type="email" placeholder="email@esempio.com" value={loginForm.email} onChange={e => setLF(p => ({ ...p, email: e.target.value }))} /></div>
<div style={{ marginBottom: 24 }}><label className="lb">Password</label><input className="ip" type="password" placeholder="password" value={loginForm.password} onChange={e => setLF(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? handleLogin() : handleRegister())} /></div>
<button className="bt bp" style={{ width: "100%", padding: 14 }} onClick={authMode === "login" ? handleLogin : handleRegister}>{authMode === "login" ? "Accedi" : "Crea Account"}</button>
</div></div></div>);
}

/* ===== DASHBOARD ===== */
const Dash = () => {
  const wC = weeklyStats.map(d => Math.round(d.cal || 0)), wL = weeklyStats.map(d => fmtDate(d.entry_date));
  return (<div className="ai"><div className="ph"><div className="pt">Buongiorno, {user.name} 👋</div><div className="ps">Riepilogo giornata</div></div>
  <div className="g4" style={{ marginBottom: 24 }}>{[
    { l: "Calorie", v: todayCal, mx: profile?.target_calories, ic: "🔥", cl: "var(--acc)" },
    { l: "Proteine", v: todayProt, mx: profile?.macro_prot, ic: "💪", cl: "var(--bl)", sf: "g" },
    { l: "Spesa", v: "€" + shopTotal, mx: null, u: "/ €" + (profile?.budget || 80), ic: "💰", cl: "var(--or)" },
    { l: "Salute", v: healthScore, mx: 100, ic: "❤️", cl: "var(--pu)" }
  ].map((s, i) => (<div key={i} className="cd"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ fontSize: ".78rem", color: "var(--t2)" }}>{s.l}</span><span style={{ fontSize: "1.2rem" }}>{s.ic}</span></div><div style={{ fontSize: "1.8rem", fontFamily: "'Playfair Display',serif", fontWeight: 700, color: s.cl }}>{s.v}{s.sf || ""}</div>{s.mx && <><div style={{ fontSize: ".75rem", color: "var(--t3)", marginBottom: 8 }}>/ {s.mx}{s.sf || ""}</div><div className="pg"><div className="pb" style={{ width: Math.min(((typeof s.v === "number" ? s.v : 0) / s.mx) * 100, 100) + "%", background: s.cl }} /></div></>}{!s.mx && s.u && <div style={{ fontSize: ".78rem", color: "var(--t3)", marginTop: 4 }}>{s.u}</div>}</div>))}</div>
  <div className="g2">
  <div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Settimana</h3>{wC.length ? <MiniBarChart data={wC} labels={wL} maxVal={profile?.target_calories || 2500} /> : <div style={{ textAlign: "center", padding: 24, color: "var(--t3)" }}>Inizia a registrare!</div>}</div>
  <div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Stato</h3><div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: 12 }}><HealthRing score={healthScore} /><div style={{ display: "flex", gap: 16 }}><MacroRing value={todayProt} max={profile?.macro_prot} label="Prot" color="var(--bl)" /><MacroRing value={todayCarb} max={profile?.macro_carb} label="Carb" color="var(--or)" /><MacroRing value={todayFat} max={profile?.macro_fat} label="Grassi" color="var(--pu)" /></div></div></div>
  <div className="cd"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}><h3 style={{ fontSize: "1rem" }}>Oggi</h3><button className="bt bs bp" onClick={() => setShowModal("addFood")}>+ Aggiungi</button></div>{todayEntries.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: "var(--t3)" }}>Nessun pasto</div> : todayEntries.slice(0, 5).map(e => (<div key={e.id} className="de"><div><div style={{ fontWeight: 600 }}>{e.food_name}</div><div style={{ fontSize: ".75rem", color: "var(--t3)" }}>{e.entry_time} - {e.portion}g</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 600, color: "var(--acc)" }}>{e.calories} kcal</span><div className="ra"><button onClick={() => deleteEntry(e.id)}>🗑️</button></div></div></div>))}</div>
  </div></div>);
};

/* ===== DIET ===== */
const Diet = () => {
  const days = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato", "Domenica"];
  const [sel, setSel] = useState(days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const dp = mealPlan[sel];
  const regen = async () => { try { const p = await api.generateMealPlan(); setMealPlan(p); setShoppingList(await api.getShopping()); showToast("Piano rigenerato!"); } catch (e) {} };
  return (<div className="ai"><div className="ph"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}><div><div className="pt">Piano Dieta</div><div className="ps">{profile?.target_calories} kcal/giorno</div></div><button className="bt bp" onClick={regen}>Rigenera</button></div></div>
  <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>{days.map(d => <button key={d} className={"bt bs " + (sel === d ? "bp" : "")} onClick={() => setSel(d)}>{d.slice(0, 3)}</button>)}</div>
  {dp ? <div className="g2">{[{ k: "colazione", l: "Colazione", ic: "🌅" }, { k: "spuntino", l: "Spuntino", ic: "🍎" }, { k: "pranzo", l: "Pranzo", ic: "☀️" }, { k: "cena", l: "Cena", ic: "🌙" }].map(({ k, l, ic }) => { const meal = dp[k]; if (!meal) return null; return (<div key={k} className="mc" onClick={() => { meal.foods.forEach((fId, i) => { const f = foods.find(x => x.id === fId); if (f) addEntry(f, meal.portions[i], k); }); }}><div style={{ fontSize: "1.5rem" }}>{ic}</div><div style={{ fontWeight: 600 }}>{l}: {meal.name}</div><div style={{ fontSize: ".8rem", color: "var(--t2)" }}>{meal.desc}</div><span className="tg" style={{ marginTop: 8 }}>{meal.total_calories} kcal</span><div style={{ fontSize: ".7rem", color: "var(--t3)", marginTop: 4 }}>Tocca per aggiungere</div></div>); })}</div> : <div className="cd" style={{ textAlign: "center", padding: 40 }}>Clicca Rigenera!</div>}</div>);
};

/* ===== DIARY (editable) ===== */
const Diary = () => {
  const wC = weeklyStats.map(d => Math.round(d.cal || 0)), wL = weeklyStats.map(d => fmtDate(d.entry_date));
  const [ef, setEF] = useState({});
  const startEdit = (e) => { setEditingEntry(e.id); setEF({ food_name: e.food_name, portion: e.portion, calories: e.calories, protein: e.protein || 0, carbs: e.carbs || 0, fat: e.fat || 0 }); };
  return (<div className="ai"><div className="ph"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}><div className="pt">Diario</div><button className="bt bp" onClick={() => setShowModal("addFood")}>+ Aggiungi</button></div></div>
  <div className="cd" style={{ marginBottom: 24 }}><div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16 }}><div style={{ textAlign: "center" }}><div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Playfair Display',serif", color: "var(--acc)" }}>{todayCal}</div><div style={{ fontSize: ".75rem", color: "var(--t3)" }}>/ {profile?.target_calories} kcal</div></div><MacroRing value={todayProt} max={profile?.macro_prot} label="Prot" color="var(--bl)" /><MacroRing value={todayCarb} max={profile?.macro_carb} label="Carb" color="var(--or)" /><MacroRing value={todayFat} max={profile?.macro_fat} label="Grassi" color="var(--pu)" /></div></div>
  <div className="cd" style={{ marginBottom: 24 }}><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Trend</h3>{wC.length ? <MiniBarChart data={wC} labels={wL} maxVal={profile?.target_calories || 2500} /> : <div style={{ textAlign: "center", padding: 24, color: "var(--t3)" }}>Nessun dato</div>}</div>
  <div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Registro</h3>{todayEntries.length === 0 ? <div style={{ textAlign: "center", padding: 32, color: "var(--t3)" }}>Nessun pasto</div> : todayEntries.map(e => (
    editingEntry === e.id ? <div key={e.id} className="cd" style={{ marginBottom: 8, padding: 16, border: "1px solid var(--acc)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div><label className="lb">Nome</label><input className="ip" value={ef.food_name} onChange={ev => setEF(p => ({ ...p, food_name: ev.target.value }))} /></div>
        <div><label className="lb">Porzione (g)</label><input className="ip" type="number" value={ef.portion} onChange={ev => setEF(p => ({ ...p, portion: +ev.target.value }))} /></div>
        <div><label className="lb">Kcal</label><input className="ip" type="number" value={ef.calories} onChange={ev => setEF(p => ({ ...p, calories: +ev.target.value }))} /></div>
        <div><label className="lb">Prot</label><input className="ip" type="number" value={ef.protein} onChange={ev => setEF(p => ({ ...p, protein: +ev.target.value }))} /></div>
        <div><label className="lb">Carb</label><input className="ip" type="number" value={ef.carbs} onChange={ev => setEF(p => ({ ...p, carbs: +ev.target.value }))} /></div>
        <div><label className="lb">Grassi</label><input className="ip" type="number" value={ef.fat} onChange={ev => setEF(p => ({ ...p, fat: +ev.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", gap: 8 }}><button className="bt bp bs" onClick={() => updateEntry(e.id, ef)}>Salva</button><button className="bt bs" onClick={() => setEditingEntry(null)}>Annulla</button></div>
    </div> : <div key={e.id} className="de"><div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{e.food_name}</div><div style={{ fontSize: ".75rem", color: "var(--t3)" }}>{e.entry_time} - {e.portion}g | P{e.protein} C{e.carbs} G{e.fat}</div></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontWeight: 600, color: "var(--acc)" }}>{e.calories} kcal</span><div className="ra"><button onClick={() => startEdit(e)}>✏️</button><button onClick={() => deleteEntry(e.id)}>🗑️</button></div></div></div>
  ))}</div></div>);
};

/* ===== SHOPPING (full CRUD) ===== */
const Shopping = () => {
  const [editId, setEditId] = useState(null);
  const [ef, setEF] = useState({});
  const [af, setAF] = useState({ food_name: "", category: "Altro", quantity: 1, unit: "pz", price: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const grouped = {}; shoppingList.forEach(i => { if (!grouped[i.category]) grouped[i.category] = []; grouped[i.category].push(i); });
  const checked = shoppingList.filter(i => i.checked).length;
  const toggle = async (id) => { await api.toggleShopItem(id); setShoppingList(p => p.map(i => i.id === id ? { ...i, checked: i.checked ? 0 : 1 } : i)); };
  const bp = profile?.budget ? Math.min((parseFloat(shopTotal) / profile.budget) * 100, 100) : 0;
  const addItem = async () => { if (!af.food_name.trim()) return; try { const item = await api.addShopItem(af); setShoppingList(p => [...p, item]); setAF({ food_name: "", category: "Altro", quantity: 1, unit: "pz", price: 0 }); setShowAdd(false); showToast("Aggiunto alla spesa"); } catch (e) {} };
  const delItem = async (id) => { try { await api.deleteShopItem(id); setShoppingList(p => p.filter(i => i.id !== id)); showToast("Rimosso"); } catch (e) {} };
  const startEdit = (i) => { setEditId(i.id); setEF({ food_name: i.food_name, category: i.category, quantity: i.quantity, unit: i.unit, price: i.price }); };
  const saveItem = async (id) => { try { await api.updateShopItem(id, ef); setShoppingList(p => p.map(i => i.id === id ? { ...i, ...ef } : i)); setEditId(null); showToast("Modificato"); } catch (e) {} };

  return (<div className="ai"><div className="ph"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}><div><div className="pt">Spesa</div><div className="ps">{checked}/{shoppingList.length}</div></div><button className="bt bp bs" onClick={() => setShowAdd(!showAdd)}>+ Aggiungi</button></div></div>
  <div className="cd" style={{ marginBottom: 24 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div><div style={{ fontSize: ".78rem", color: "var(--t2)" }}>Budget</div><div style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>€{shopTotal} <span style={{ fontSize: ".9rem", color: "var(--t3)" }}>/ €{profile?.budget}</span></div></div>{parseFloat(shopTotal) > (profile?.budget || 100) && <span className="tg" style={{ background: "rgba(240,96,96,.15)", color: "var(--rd)" }}>Oltre!</span>}</div><div className="pg"><div className="pb" style={{ width: bp + "%", background: bp > 90 ? "var(--rd)" : "var(--grad)" }} /></div></div>

  {showAdd && <div className="cd" style={{ marginBottom: 20 }}><h3 style={{ fontSize: "1rem", marginBottom: 12 }}>Nuovo Articolo</h3>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
    <div style={{ gridColumn: "1/-1" }}><label className="lb">Nome</label><input className="ip" value={af.food_name} onChange={e => setAF(p => ({ ...p, food_name: e.target.value }))} placeholder="Es: Latte, Pane..." /></div>
    <div><label className="lb">Categoria</label><select className="sl" value={af.category} onChange={e => setAF(p => ({ ...p, category: e.target.value }))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
    <div><label className="lb">Quantita</label><input className="ip" type="number" value={af.quantity} onChange={e => setAF(p => ({ ...p, quantity: +e.target.value }))} /></div>
    <div><label className="lb">Unita</label><select className="sl" value={af.unit} onChange={e => setAF(p => ({ ...p, unit: e.target.value }))}><option>pz</option><option>kg</option><option>L</option><option>g</option></select></div>
    <div><label className="lb">Prezzo €/kg</label><input className="ip" type="number" step="0.1" value={af.price} onChange={e => setAF(p => ({ ...p, price: +e.target.value }))} /></div>
  </div><div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="bt bp bs" onClick={addItem}>Aggiungi</button><button className="bt bs" onClick={() => setShowAdd(false)}>Annulla</button></div></div>}

  <div className="cd">{CATS.filter(c => grouped[c]).map(c => (<div key={c} style={{ marginBottom: 20 }}><div className="sc-h">{c}</div>{grouped[c].map(item => (
    editId === item.id ? <div key={item.id} style={{ padding: 12, background: "var(--bg3)", borderRadius: 8, marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div><label className="lb">Nome</label><input className="ip" value={ef.food_name} onChange={e => setEF(p => ({ ...p, food_name: e.target.value }))} /></div>
        <div><label className="lb">Qty</label><input className="ip" type="number" value={ef.quantity} onChange={e => setEF(p => ({ ...p, quantity: +e.target.value }))} /></div>
        <div><label className="lb">Prezzo</label><input className="ip" type="number" step="0.1" value={ef.price} onChange={e => setEF(p => ({ ...p, price: +e.target.value }))} /></div>
        <div><label className="lb">Unita</label><select className="sl" value={ef.unit} onChange={e => setEF(p => ({ ...p, unit: e.target.value }))}><option>pz</option><option>kg</option><option>L</option><option>g</option></select></div>
      </div><div style={{ display: "flex", gap: 8 }}><button className="bt bp bs" onClick={() => saveItem(item.id)}>Salva</button><button className="bt bs" onClick={() => setEditId(null)}>Annulla</button></div>
    </div> : <div key={item.id} className={"si " + (item.checked ? "chk" : "")}>
      <div className={"ck " + (item.checked ? "on" : "")} onClick={() => toggle(item.id)}>{item.checked ? "✓" : ""}</div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{item.food_name}</div><div style={{ fontSize: ".75rem", color: "var(--t3)" }}>{item.quantity} {item.unit}</div></div>
      <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--or)" }}>€{(item.price * item.quantity / 1000).toFixed(2)}</div>
      <div className="ra"><button onClick={() => startEdit(item)}>✏️</button><button onClick={() => delItem(item.id)}>🗑️</button></div>
    </div>
  ))}</div>))}{shoppingList.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "var(--t3)" }}>Genera un piano!</div>}</div></div>);
};

/* ===== COACH ===== */
const Coach = () => {
  const chatEnd = useRef(null);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  const send = async () => { if (!chatInput.trim()) return; const msg = chatInput.trim(); setChatInput("");
    setChatMessages(p => [...p, { role: "user", message: msg }]);
    try { const r = await api.sendChat(msg); setChatMessages(p => [...p, { role: "ai", message: r.aiMsg.message }]); } catch (e) { setChatMessages(p => [...p, { role: "ai", message: "Errore, riprova!" }]); } };
  const renderMsg = (text) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((p, i) => p.match(/^https?:\/\//) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p.length > 50 ? p.slice(0, 50) + "..." : p}</a> : p);
  };
  return (<div className="ai"><div className="ph"><div className="pt">Coach AI</div><div className="ps">Chiedi ricette, consigli, motivazione</div></div>
  <div className="cd" style={{ height: "calc(100vh - 220px)", display: "flex", flexDirection: "column" }}><div className="cm" style={{ flex: 1 }}>{chatMessages.map((m, i) => <div key={i} className={"msg " + (m.role === "user" ? "u" : "a")}>{renderMsg(m.message)}</div>)}<div ref={chatEnd} /></div>
  <div style={{ display: "flex", gap: 8, marginTop: 12 }}><input className="ip" placeholder="Scrivi... (ricette, calorie, motivazione)" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} /><button className="bt bp" onClick={send}>Invia</button></div></div></div>);
};

/* ===== CHEF AI (with recipe links) ===== */
const Chef = () => {
  const [sel, setSel] = useState([]); const [recipe, setRecipe] = useState(null);
  const tog = (f) => setSel(p => p.find(x => x.id === f.id) ? p.filter(x => x.id !== f.id) : [...p, f]);
  const gen = () => { if (sel.length < 2) return;
    const name = sel[0].name + " con " + sel.slice(1).map(f => f.name.toLowerCase()).join(" e ");
    const searchQ = encodeURIComponent(name);
    setRecipe({ name, ingredients: sel.map(f => f.name + " (100g)"), cal: Math.round(sel.reduce((s, f) => s + f.calories, 0) * 1.5 / sel.length), time: Math.round(15 + Math.random() * 30), steps: ["Prepara e lava gli ingredienti", "Taglia a pezzetti uniformi", "Cuoci in padella con olio EVO", "Condisci con sale, pepe e spezie a piacere", "Impiatta e servi caldo"],
      links: [
        { label: "Giallozafferano", url: "https://www.giallozafferano.it/ricerca-ricette/" + searchQ + "/" },
        { label: "Cucchiaio d'Argento", url: "https://www.cucchiaio.it/ricerca/?q=" + searchQ },
        { label: "Fattoincasa", url: "https://www.fattoincasadabenedetta.it/?s=" + searchQ },
      ]
    });
  };
  return (<div className="ai"><div className="ph"><div className="pt">Chef AI</div><div className="ps">Seleziona ingredienti e genera ricette</div></div>
  <div className="g2"><div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Ingredienti ({sel.length} selezionati)</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{foods.map(f => <button key={f.id} className={"bt bs " + (sel.find(x => x.id === f.id) ? "bp" : "")} onClick={() => tog(f)}>{f.name}</button>)}</div>{sel.length >= 2 && <button className="bt bp" style={{ width: "100%", marginTop: 16 }} onClick={gen}>Genera Ricetta</button>}{sel.length === 1 && <div style={{ textAlign: "center", marginTop: 12, fontSize: ".85rem", color: "var(--t3)" }}>Seleziona almeno 2 ingredienti</div>}</div>
  {recipe && <div className="cd as" style={{ border: "1px solid var(--bdr2)" }}><h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", marginBottom: 12 }}>{recipe.name}</h3>
  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><span className="tg">{recipe.cal} kcal</span><span className="tg" style={{ background: "rgba(96,160,240,.15)", color: "var(--bl)" }}>{recipe.time} min</span></div>
  <div style={{ fontSize: ".85rem", color: "var(--t2)" }}><strong>Ingredienti:</strong><ul style={{ paddingLeft: 16, margin: "8px 0" }}>{recipe.ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul><strong>Preparazione:</strong><ol style={{ paddingLeft: 16, marginTop: 8 }}>{recipe.steps.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}</ol></div>
  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--bdr)" }}><div style={{ fontSize: ".8rem", fontWeight: 600, marginBottom: 8, color: "var(--t2)" }}>Cerca ricette simili sul web:</div>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{recipe.links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="bt bs bp" style={{ textDecoration: "none" }}>🔗 {l.label}</a>)}</div></div>
  </div>}</div></div>);
};

/* ===== CHALLENGES (richer) ===== */
const Chall = () => {
  const cats = [...new Set(CHALLS.map(c => c.category))];
  const [selCat, setSelCat] = useState("Tutte");
  const filtered = selCat === "Tutte" ? CHALLS : CHALLS.filter(c => c.category === selCat);
  const incProgress = async (c) => { const curr = challengeProgress[c.id] || 0; if (curr >= c.target) return; const next = curr + 1;
    setChallengeProgress(p => ({ ...p, [c.id]: next }));
    try { await api.updateChallengeProgress(c.id, next); if (next >= c.target) showToast("🏆 Sfida completata: " + c.name + "!"); } catch (e) {} };

  return (<div className="ai"><div className="ph"><div className="pt">Sfide</div><div className="ps">Completa sfide per guadagnare XP</div></div>
  <div className="cd" style={{ marginBottom: 24, textAlign: "center" }}><div style={{ fontSize: "2rem", fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{userStats.days_tracked < 7 ? "Principiante" : userStats.days_tracked < 30 ? "Intermedio" : userStats.days_tracked < 90 ? "Esperto" : "Maestro"}</div><div style={{ color: "var(--t3)", marginTop: 4 }}>{userStats.days_tracked} giorni • {userStats.xp || 0} XP • {userStats.streak} streak</div></div>
  <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>Badge</h3><div className="g4" style={{ marginBottom: 32 }}>{BADGES.map(b => (<div key={b.id} className={"bg " + (userStats.days_tracked >= b.req ? "ea" : "lk")}><div style={{ fontSize: "1.8rem" }}>{b.icon}</div><div><div style={{ fontWeight: 600, fontSize: ".9rem" }}>{b.name}</div><div style={{ fontSize: ".72rem", color: "var(--t3)" }}>{b.desc}</div></div></div>))}</div>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}><h3 style={{ fontSize: "1rem" }}>Sfide Attive</h3>
  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><button className={"bt bs " + (selCat === "Tutte" ? "bp" : "")} onClick={() => setSelCat("Tutte")}>Tutte</button>{cats.map(c => <button key={c} className={"bt bs " + (selCat === c ? "bp" : "")} onClick={() => setSelCat(c)}>{c}</button>)}</div></div>
  <div className="g2">{filtered.map(c => { const prog = challengeProgress[c.id] || 0; const done = prog >= c.target;
    return (<div key={c.id} className={"cc " + (done ? "done" : "")}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><span style={{ fontSize: "1.5rem" }}>{c.icon}</span><div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: ".75rem", color: "var(--t3)" }}>{c.desc}</div></div><span className="tg">{c.xp} XP</span></div>
    <div className="pg"><div className="pb" style={{ width: (prog / c.target) * 100 + "%" }} /></div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}><span style={{ fontSize: ".78rem", color: "var(--t3)" }}>{prog}/{c.target}</span>
    {!done && <button className="bt bs bp" onClick={() => incProgress(c)}>+1 Progresso</button>}
    {done && <span style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--acc)" }}>Completata! ✓</span>}</div></div>); })}</div></div>);
};

/* ===== PROFILE (editable) ===== */
const Profile = () => {
  const [editing, setEditing] = useState(false);
  const [pf, setPF] = useState(null);
  const [editName, setEditName] = useState("");
  const [newWeight, setNewWeight] = useState("");

  const startEditProfile = () => { setPF({ weight: profile?.weight || 70, height: profile?.height || 170, age: profile?.age || 30, gender: profile?.gender || "M", activity: profile?.activity || "moderato", goal: profile?.goal || "mantenimento", target_weight: profile?.target_weight || 70, budget: profile?.budget || 80 }); setEditName(user.name); setEditing(true); };
  const saveProfile = async () => {
    try {
      if (editName !== user.name) { await api.updateName(editName); setUser(u => ({ ...u, name: editName })); }
      const bmr = calcBMR(pf.weight, pf.height, pf.age, pf.gender); const tdee = calcTDEE(bmr, pf.activity); const tc = calcGoalCal(tdee, pf.goal); const m = calcMacros(tc, pf.goal);
      const saved = await api.saveProfile({ ...pf, bmr, tdee, target_calories: tc, macro_prot: m.prot, macro_carb: m.carb, macro_fat: m.fat });
      setProfile(saved); setEditing(false); showToast("Profilo aggiornato!");
    } catch (e) { console.error(e); }
  };
  const logWeight = async () => { if (!newWeight) return; try { await api.addWeight(+newWeight); setProfile(p => ({ ...p, weight: +newWeight })); setNewWeight(""); showToast("Peso registrato!"); } catch (e) {} };

  return (<div className="ai"><div className="ph"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div className="pt">Profilo</div>{!editing && <button className="bt bp bs" onClick={startEditProfile}>Modifica</button>}</div></div>
  {editing ? <div className="cd" style={{ marginBottom: 24 }}>
    <h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Modifica Profilo</h3>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ gridColumn: "1/-1" }}><label className="lb">Nome</label><input className="ip" value={editName} onChange={e => setEditName(e.target.value)} /></div>
      <div><label className="lb">Peso (kg)</label><input className="ip" type="number" value={pf.weight} onChange={e => setPF(p => ({ ...p, weight: +e.target.value }))} /></div>
      <div><label className="lb">Altezza (cm)</label><input className="ip" type="number" value={pf.height} onChange={e => setPF(p => ({ ...p, height: +e.target.value }))} /></div>
      <div><label className="lb">Eta</label><input className="ip" type="number" value={pf.age} onChange={e => setPF(p => ({ ...p, age: +e.target.value }))} /></div>
      <div><label className="lb">Sesso</label><select className="sl" value={pf.gender} onChange={e => setPF(p => ({ ...p, gender: e.target.value }))}><option value="M">M</option><option value="F">F</option></select></div>
      <div><label className="lb">Attivita</label><select className="sl" value={pf.activity} onChange={e => setPF(p => ({ ...p, activity: e.target.value }))}><option value="sedentario">Sedentario</option><option value="leggero">Leggero</option><option value="moderato">Moderato</option><option value="attivo">Attivo</option><option value="molto_attivo">Molto attivo</option></select></div>
      <div><label className="lb">Obiettivo</label><select className="sl" value={pf.goal} onChange={e => setPF(p => ({ ...p, goal: e.target.value }))}><option value="dimagrimento">Dimagrimento</option><option value="mantenimento">Mantenimento</option><option value="massa">Massa</option></select></div>
      <div><label className="lb">Peso target (kg)</label><input className="ip" type="number" value={pf.target_weight} onChange={e => setPF(p => ({ ...p, target_weight: +e.target.value }))} /></div>
      <div><label className="lb">Budget/sett (€)</label><input className="ip" type="number" value={pf.budget} onChange={e => setPF(p => ({ ...p, budget: +e.target.value }))} /></div>
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}><button className="bt bp" onClick={saveProfile}>Salva Modifiche</button><button className="bt" onClick={() => setEditing(false)}>Annulla</button></div>
  </div> : <div className="g2" style={{ marginBottom: 24 }}>
    <div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Dati Personali</h3>{[{ l: "Nome", v: user.name }, { l: "Email", v: user.email }, { l: "Peso", v: (profile?.weight || "?") + " kg" }, { l: "Altezza", v: (profile?.height || "?") + " cm" }, { l: "Eta", v: (profile?.age || "?") + " anni" }].map((x, i) => (<div key={i} style={{ marginBottom: 12 }}><span className="lb">{x.l}</span><div style={{ fontWeight: 600 }}>{x.v}</div></div>))}</div>
    <div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Piano Nutrizionale</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{[{ l: "Target kcal", v: profile?.target_calories || "?" }, { l: "Obiettivo", v: profile?.goal || "" }, { l: "Proteine", v: (profile?.macro_prot || "?") + "g" }, { l: "Carboidrati", v: (profile?.macro_carb || "?") + "g" }, { l: "Grassi", v: (profile?.macro_fat || "?") + "g" }, { l: "Budget", v: "€" + (profile?.budget || "") + "/sett" }].map((x, i) => (<div key={i}><div className="lb">{x.l}</div><div style={{ fontWeight: 600 }}>{x.v}</div></div>))}</div></div>
  </div>}

  <div className="cd" style={{ marginBottom: 24 }}><h3 style={{ fontSize: "1rem", marginBottom: 12 }}>Registra Peso</h3>
  <div style={{ display: "flex", gap: 8 }}><input className="ip" type="number" step="0.1" placeholder="Es: 72.5" value={newWeight} onChange={e => setNewWeight(e.target.value)} style={{ maxWidth: 200 }} /><button className="bt bp bs" onClick={logWeight}>Registra</button></div></div>

  <div className="g2">
  <div className="cd"><h3 style={{ fontSize: "1rem", marginBottom: 16 }}>Tema</h3><div className="theme-toggle" onClick={() => setDark(!dark)}><span>☀️</span><div className="toggle-track"><div className="toggle-thumb" style={{ left: dark ? 22 : 2 }} /></div><span>🌙</span><span style={{ fontSize: ".85rem", color: "var(--t2)" }}>{dark ? "Dark" : "Light"}</span></div></div>
  <div className="cd"><button className="bt bd" style={{ width: "100%" }} onClick={handleLogout}>Esci dall'account</button></div>
  </div></div>);
};

/* ===== ADD FOOD MODAL (with custom food creation + portion) ===== */
const AddFoodModal = () => {
  const [tab, setTab] = useState("search");
  const [portion, setPortion] = useState(100);
  const [selFood, setSelFood] = useState(null);
  const [cf, setCF] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, category: "Altro", price: 0, unit: "kg" });
  const filtered = foods.filter(f => f.name.toLowerCase().includes(searchFood.toLowerCase()));

  const addCustom = async () => { if (!cf.name.trim() || !cf.calories) return;
    try { const saved = await api.addFood(cf); setFoods(p => [...p, saved]); showToast("Alimento creato: " + cf.name); setCF({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, category: "Altro", price: 0, unit: "kg" }); setTab("search"); } catch (e) {} };

  return (<div className="ov" onClick={() => setShowModal(null)}><div className="md" onClick={e => e.stopPropagation()}>
  <h2>Aggiungi Alimento</h2>
  <div className="tb" style={{ marginBottom: 16 }}><div className={"ti " + (tab === "search" ? "ac" : "")} onClick={() => setTab("search")}>Cerca</div><div className={"ti " + (tab === "custom" ? "ac" : "")} onClick={() => setTab("custom")}>Crea Nuovo</div></div>

  {tab === "search" && <>{selFood ? <div>
    <div style={{ marginBottom: 16, padding: 16, background: "var(--bg2)", borderRadius: 12 }}><div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{selFood.name}</div><div style={{ fontSize: ".8rem", color: "var(--t3)", marginTop: 4 }}>{selFood.calories} kcal/100g | P{selFood.protein} C{selFood.carbs} G{selFood.fat}</div></div>
    <label className="lb">Porzione (grammi)</label><input className="ip" type="number" value={portion} onChange={e => setPortion(+e.target.value)} style={{ marginBottom: 8 }} />
    <div style={{ fontSize: ".85rem", color: "var(--t2)", marginBottom: 16 }}>= {Math.round(selFood.calories * portion / 100)} kcal | P{Math.round(selFood.protein * portion / 100)}g C{Math.round(selFood.carbs * portion / 100)}g G{Math.round(selFood.fat * portion / 100)}g</div>
    <div style={{ display: "flex", gap: 8 }}><button className="bt bp" style={{ flex: 1 }} onClick={() => { addEntry(selFood, portion); setSelFood(null); setPortion(100); }}>Aggiungi</button><button className="bt" onClick={() => { setSelFood(null); setPortion(100); }}>Indietro</button></div>
  </div> : <>
    <input className="ip" placeholder="Cerca alimento..." value={searchFood} onChange={e => setSearchFood(e.target.value)} style={{ marginBottom: 16 }} />
    <div style={{ maxHeight: 350, overflowY: "auto" }}>{filtered.map(f => (<div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--bdr)", cursor: "pointer" }} onClick={() => setSelFood(f)}><div><div style={{ fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: ".72rem", color: "var(--t3)" }}>{f.category}{f.created_by ? " (custom)" : ""}</div></div><div style={{ textAlign: "right" }}><div style={{ fontWeight: 600, color: "var(--acc)" }}>{f.calories} kcal</div><div style={{ fontSize: ".7rem", color: "var(--t3)" }}>P{f.protein} C{f.carbs} G{f.fat}</div></div></div>))}{filtered.length === 0 && <div style={{ textAlign: "center", padding: 24, color: "var(--t3)" }}>Nessun risultato. Crea un alimento custom!</div>}</div>
  </>}</>}

  {tab === "custom" && <div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div style={{ gridColumn: "1/-1" }}><label className="lb">Nome alimento</label><input className="ip" value={cf.name} onChange={e => setCF(p => ({ ...p, name: e.target.value }))} placeholder="Es: Hummus, Tofu..." /></div>
      <div><label className="lb">Calorie/100g</label><input className="ip" type="number" value={cf.calories} onChange={e => setCF(p => ({ ...p, calories: +e.target.value }))} /></div>
      <div><label className="lb">Proteine (g)</label><input className="ip" type="number" value={cf.protein} onChange={e => setCF(p => ({ ...p, protein: +e.target.value }))} /></div>
      <div><label className="lb">Carboidrati (g)</label><input className="ip" type="number" value={cf.carbs} onChange={e => setCF(p => ({ ...p, carbs: +e.target.value }))} /></div>
      <div><label className="lb">Grassi (g)</label><input className="ip" type="number" value={cf.fat} onChange={e => setCF(p => ({ ...p, fat: +e.target.value }))} /></div>
      <div><label className="lb">Categoria</label><select className="sl" value={cf.category} onChange={e => setCF(p => ({ ...p, category: e.target.value }))}>{CATS.map(c => <option key={c}>{c}</option>)}</select></div>
      <div><label className="lb">Prezzo €/kg</label><input className="ip" type="number" step="0.1" value={cf.price} onChange={e => setCF(p => ({ ...p, price: +e.target.value }))} /></div>
    </div>
    <button className="bt bp" style={{ width: "100%", marginTop: 16 }} onClick={addCustom}>Crea e Aggiungi al Database</button>
  </div>}

  <button className="bt" style={{ width: "100%", marginTop: 12 }} onClick={() => setShowModal(null)}>Chiudi</button></div></div>);
};

/* ===== MAIN LAYOUT ===== */
const pages = { dashboard: Dash, diet: Diet, diary: Diary, shopping: Shopping, coach: Coach, chef: Chef, challenges: Chall, profile: Profile };
const Page = pages[page] || Dash;

return (<div className={dark ? "" : "lm"} style={{ minHeight: "100vh", background: "var(--bg0)", transition: "background .4s, color .4s" }}><div className="ly">
<button className="hb" onClick={() => setSbOpen(!sbOpen)}>{sbOpen ? "✕" : "☰"}</button>
<div className={"mbo " + (sbOpen ? "sh" : "")} onClick={() => setSbOpen(false)} />
<nav className={"sb " + (sbOpen ? "op" : "")}>
<div className="logo"><div className="logo-i">🥗</div><div className="logo-t">NutriGenius</div></div>
<div className="ns">Menu</div>
{[{ id: "dashboard", ic: "📊", l: "Dashboard" }, { id: "diet", ic: "🥗", l: "Dieta" }, { id: "diary", ic: "📔", l: "Diario" }, { id: "shopping", ic: "🛒", l: "Spesa" }].map(x => (<div key={x.id} className={"ni " + (page === x.id ? "ac" : "")} onClick={() => navigate(x.id)}><span className="ic">{x.ic}</span>{x.l}</div>))}
<div className="ns">Extra</div>
{[{ id: "chef", ic: "👨‍🍳", l: "Chef AI" }, { id: "coach", ic: "🧠", l: "Coach" }, { id: "challenges", ic: "🏆", l: "Sfide" }].map(x => (<div key={x.id} className={"ni " + (page === x.id ? "ac" : "")} onClick={() => navigate(x.id)}><span className="ic">{x.ic}</span>{x.l}</div>))}
<div style={{ flex: 1 }} />
<div className="theme-toggle" onClick={() => setDark(!dark)}><span>{dark ? "🌙" : "☀️"}</span><div className="toggle-track"><div className="toggle-thumb" style={{ left: dark ? 22 : 2 }} /></div><span style={{ fontSize: ".8rem", color: "var(--t2)" }}>{dark ? "Dark" : "Light"}</span></div>
<div className="ni" onClick={() => navigate("profile")}><span className="ic">👤</span>{user.name}</div></nav>
<main className="mn"><Page /></main></div>
{page !== "coach" && <button className="fab" onClick={() => setShowModal("addFood")}>+</button>}
{showModal === "addFood" && <AddFoodModal />}
{toast && <div className="toast">{toast}</div>}
</div>);
}
