import{useState,useEffect,useRef,useCallback}from"react";
import api from"./api.js";
import{HealthRing,MacroRing,MiniBarChart,CATS,BADGES,CHALLS,calcBMR,calcTDEE,calcGoalCal,calcMacros,fmtDate}from"./components.jsx";

export default function App(){
const[loading,setLoading]=useState(true);
const[dark,setDark]=useState(()=>{const s=localStorage.getItem("ng-dark");return s!==null?s==="true":true;});
const[sbOpen,setSbOpen]=useState(false);const[page,setPage]=useState("dashboard");
const[user,setUser]=useState(null);const[authMode,setAuthMode]=useState("login");
const[profile,setProfile]=useState(null);const[foods,setFoods]=useState([]);
const[todayEntries,setTodayEntries]=useState([]);const[weeklyStats,setWeeklyStats]=useState([]);
const[mealPlan,setMealPlan]=useState({});const[shoppingList,setShoppingList]=useState([]);
const[weightLog,setWeightLog]=useState([]);const[userStats,setUserStats]=useState({xp:0,days_tracked:0,streak:0});
const[showModal,setShowModal]=useState(null);const[searchFood,setSearchFood]=useState("");
const[loginForm,setLF]=useState({email:"",password:"",name:""});
const[setupForm,setSF]=useState({weight:70,height:170,age:30,gender:"M",activity:"moderato",goal:"mantenimento",target_weight:70,budget:80});
const[error,setError]=useState("");const[toast,setToast]=useState("");
const[editingEntry,setEditingEntry]=useState(null);const[challengeProgress,setChallengeProgress]=useState({});

useEffect(()=>{localStorage.setItem("ng-dark",dark);},[dark]);
const showToast=useCallback((m)=>{setToast(m);setTimeout(()=>setToast(""),2500);},[]);

useEffect(()=>{(async()=>{if(api.getToken()){try{const u=await api.getMe();setUser(u);const p=await api.getProfile();if(p){setProfile(p);await loadDash();}else setAuthMode("setup");}catch(e){api.logout();}}setLoading(false);})();},[]);

const loadDash=async()=>{try{const[dash,fl,plan,shop]=await Promise.all([api.getDashboard(),api.getFoods(),api.getMealPlan(),api.getShopping()]);
setProfile(dash.profile);setTodayEntries(dash.todayEntries);setWeeklyStats(dash.weeklyStats);setWeightLog(dash.weightLog);setUserStats(dash.stats);setFoods(fl);setMealPlan(plan);setShoppingList(shop);
try{const cp=await api.getChallenges();const m={};cp.forEach(c=>m[c.challenge_id]=c.progress);setChallengeProgress(m);}catch(e){}}catch(e){console.error(e);}};

const handleLogin=async()=>{try{setError("");const d=await api.login(loginForm.email,loginForm.password);setUser(d.user);const p=await api.getProfile();if(p){setProfile(p);await loadDash();}else setAuthMode("setup");}catch(e){setError(e.message);}};
const handleRegister=async()=>{try{setError("");if(!loginForm.name||!loginForm.email||!loginForm.password){setError("Compila tutti i campi");return;}const d=await api.register(loginForm.name,loginForm.email,loginForm.password);setUser(d.user);setAuthMode("setup");}catch(e){setError(e.message);}};
const handleSetup=async()=>{const bmr=calcBMR(setupForm.weight,setupForm.height,setupForm.age,setupForm.gender);const tdee=calcTDEE(bmr,setupForm.activity);const tc=calcGoalCal(tdee,setupForm.goal);const m=calcMacros(tc,setupForm.goal);
try{const p=await api.saveProfile({...setupForm,bmr,tdee,target_calories:tc,macro_prot:m.prot,macro_carb:m.carb,macro_fat:m.fat});setProfile(p);await api.addWeight(setupForm.weight);await api.generateMealPlan();await loadDash();setAuthMode("login");}catch(e){setError(e.message);}};
const handleLogout=()=>{api.logout();setUser(null);setProfile(null);};

const addEntry=async(food,portion=100,mt="altro")=>{try{const e={food_id:food.id,food_name:food.name,portion,calories:Math.round(food.calories*portion/100),protein:Math.round(food.protein*portion/100),carbs:Math.round(food.carbs*portion/100),fat:Math.round(food.fat*portion/100),meal_type:mt};const saved=await api.addDiaryEntry(e);setTodayEntries(p=>[saved,...p]);setShowModal(null);showToast("Aggiunto: "+food.name);}catch(e){}};
const deleteEntry=async(id)=>{try{await api.deleteDiaryEntry(id);setTodayEntries(p=>p.filter(e=>e.id!==id));showToast("Rimosso");}catch(e){}};
const updateEntry=async(id,data)=>{try{await api.updateDiaryEntry(id,data);setTodayEntries(p=>p.map(e=>e.id===id?{...e,...data}:e));setEditingEntry(null);showToast("Modificato");}catch(e){}};

const todayCal=todayEntries.reduce((s,e)=>s+(e.calories||0),0);
const todayProt=todayEntries.reduce((s,e)=>s+(e.protein||0),0);
const todayCarb=todayEntries.reduce((s,e)=>s+(e.carbs||0),0);
const todayFat=todayEntries.reduce((s,e)=>s+(e.fat||0),0);
const shopTotal=shoppingList.reduce((s,i)=>s+(i.price*i.quantity/1000),0).toFixed(2);
const healthScore=Math.min(100,50+Math.min(20,(userStats.days_tracked||0)*2)+(todayCal>0&&profile?.target_calories?(Math.abs(1-todayCal/profile.target_calories)<.15?15:8):0));
const navigate=(p)=>{setPage(p);setSbOpen(false);};

if(loading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:dark?"#0a0a0f":"#f8f8f5"}}><div style={{textAlign:"center"}}><div style={{fontSize:"3rem",marginBottom:16}}>🥗</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",color:dark?"#e8e8ed":"#1a1a2e"}}>NutriGenius</div></div></div>);

if(!user||(authMode==="setup"&&user)){
if(authMode==="setup"&&user)return(<div className={dark?"":"lm"}><div className="lp"><div className="lb2" style={{maxWidth:520}}>
<div style={{textAlign:"center",fontSize:"2.5rem",marginBottom:12}}>🧬</div><h1>Profilo Nutrizionale</h1><p>Configuriamo il tuo piano</p>
{error&&<div className="err">{error}</div>}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
<div><label className="lb">Peso (kg)</label><input className="ip" type="number" value={setupForm.weight} onChange={e=>setSF(p=>({...p,weight:+e.target.value}))}/></div>
<div><label className="lb">Altezza (cm)</label><input className="ip" type="number" value={setupForm.height} onChange={e=>setSF(p=>({...p,height:+e.target.value}))}/></div>
<div><label className="lb">Eta</label><input className="ip" type="number" value={setupForm.age} onChange={e=>setSF(p=>({...p,age:+e.target.value}))}/></div>
<div><label className="lb">Sesso</label><select className="sl" value={setupForm.gender} onChange={e=>setSF(p=>({...p,gender:e.target.value}))}><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
<div><label className="lb">Attivita</label><select className="sl" value={setupForm.activity} onChange={e=>setSF(p=>({...p,activity:e.target.value}))}><option value="sedentario">Sedentario</option><option value="leggero">Leggero</option><option value="moderato">Moderato</option><option value="attivo">Attivo</option><option value="molto_attivo">Molto attivo</option></select></div>
<div><label className="lb">Obiettivo</label><select className="sl" value={setupForm.goal} onChange={e=>setSF(p=>({...p,goal:e.target.value}))}><option value="dimagrimento">Dimagrimento</option><option value="mantenimento">Mantenimento</option><option value="massa">Massa</option></select></div>
<div><label className="lb">Peso Obiettivo</label><input className="ip" type="number" value={setupForm.target_weight} onChange={e=>setSF(p=>({...p,target_weight:+e.target.value}))}/></div>
<div><label className="lb">Budget/sett €</label><input className="ip" type="number" value={setupForm.budget} onChange={e=>setSF(p=>({...p,budget:+e.target.value}))}/></div>
</div><button className="bt bp" style={{width:"100%",marginTop:24,padding:14}} onClick={handleSetup}>Genera Piano</button></div></div></div>);
return(<div className={dark?"":"lm"}><div className="lp"><div className="lb2">
<div style={{textAlign:"center",fontSize:"2.5rem",marginBottom:8}}>🥗</div><h1>NutriGenius</h1><p>Nutrizione intelligente</p>
<div className="tb"><div className={"ti "+(authMode==="login"?"ac":"")} onClick={()=>{setAuthMode("login");setError("");}}>Accedi</div><div className={"ti "+(authMode==="register"?"ac":"")} onClick={()=>{setAuthMode("register");setError("");}}>Registrati</div></div>
{error&&<div className="err">{error}</div>}
{authMode==="register"&&<div style={{marginBottom:16}}><label className="lb">Nome</label><input className="ip" placeholder="Nome" value={loginForm.name} onChange={e=>setLF(p=>({...p,name:e.target.value}))}/></div>}
<div style={{marginBottom:16}}><label className="lb">Email</label><input className="ip" type="email" placeholder="email@esempio.com" value={loginForm.email} onChange={e=>setLF(p=>({...p,email:e.target.value}))}/></div>
<div style={{marginBottom:24}}><label className="lb">Password</label><input className="ip" type="password" placeholder="password" value={loginForm.password} onChange={e=>setLF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?handleLogin():handleRegister())}/></div>
<button className="bt bp" style={{width:"100%",padding:14}} onClick={authMode==="login"?handleLogin:handleRegister}>{authMode==="login"?"Accedi":"Crea Account"}</button>
</div></div></div>);}

const Dash=()=>{const wC=weeklyStats.map(d=>Math.round(d.cal||0)),wL=weeklyStats.map(d=>fmtDate(d.entry_date));
return(<div className="ai"><div className="ph"><div className="pt">Buongiorno, {user.name} 👋</div><div className="ps">Riepilogo giornata</div></div>
<div className="g4" style={{marginBottom:24}}>{[{l:"Calorie",v:todayCal,mx:profile?.target_calories,ic:"🔥",cl:"var(--acc)"},{l:"Proteine",v:todayProt,mx:profile?.macro_prot,ic:"💪",cl:"var(--bl)",sf:"g"},{l:"Spesa",v:"€"+shopTotal,mx:null,u:"/ €"+(profile?.budget||80),ic:"💰",cl:"var(--or)"},{l:"Salute",v:healthScore,mx:100,ic:"❤️",cl:"var(--pu)"}].map((s,i)=>(<div key={i} className="cd"><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:".78rem",color:"var(--t2)"}}>{s.l}</span><span style={{fontSize:"1.2rem"}}>{s.ic}</span></div><div style={{fontSize:"1.8rem",fontFamily:"'Playfair Display',serif",fontWeight:700,color:s.cl}}>{s.v}{s.sf||""}</div>{s.mx&&<><div style={{fontSize:".75rem",color:"var(--t3)",marginBottom:8}}>/ {s.mx}{s.sf||""}</div><div className="pg"><div className="pb" style={{width:Math.min(((typeof s.v==="number"?s.v:0)/s.mx)*100,100)+"%",background:s.cl}}/></div></>}{!s.mx&&s.u&&<div style={{fontSize:".78rem",color:"var(--t3)",marginTop:4}}>{s.u}</div>}</div>))}</div>
<div className="g2">
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Settimana</h3>{wC.length?<MiniBarChart data={wC} labels={wL} maxVal={profile?.target_calories||2500}/>:<div style={{textAlign:"center",padding:24,color:"var(--t3)"}}>Inizia a registrare!</div>}</div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Stato</h3><div style={{display:"flex",alignItems:"center",justifyContent:"space-around",flexWrap:"wrap",gap:12}}><HealthRing score={healthScore}/><div style={{display:"flex",gap:16}}><MacroRing value={todayProt} max={profile?.macro_prot} label="Prot" color="var(--bl)"/><MacroRing value={todayCarb} max={profile?.macro_carb} label="Carb" color="var(--or)"/><MacroRing value={todayFat} max={profile?.macro_fat} label="Grassi" color="var(--pu)"/></div></div></div>
<div className="cd"><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{fontSize:"1rem"}}>Oggi</h3><button className="bt bs bp" onClick={()=>setShowModal("addFood")}>+ Aggiungi</button></div>{todayEntries.length===0?<div style={{textAlign:"center",padding:24,color:"var(--t3)"}}>Nessun pasto</div>:todayEntries.slice(0,5).map(e=>(<div key={e.id} className="de"><div><div style={{fontWeight:600}}>{e.food_name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{e.entry_time} - {e.portion}g</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:600,color:"var(--acc)"}}>{e.calories} kcal</span><div className="ra"><button onClick={()=>deleteEntry(e.id)}>🗑️</button></div></div></div>))}</div>
</div></div>);};

const Diet=()=>{const days=["Lunedi","Martedi","Mercoledi","Giovedi","Venerdi","Sabato","Domenica"];
const[sel,setSel]=useState(days[new Date().getDay()===0?6:new Date().getDay()-1]);
const[rl,setRL]=useState(null);const dp=mealPlan[sel];
const regenAll=async()=>{try{setRL("all");const p=await api.generateMealPlan();setMealPlan(p);setShoppingList(await api.getShopping());showToast("Piano rigenerato!");}catch(e){}finally{setRL(null);}};
const regenOne=async(day,type,excName)=>{try{setRL(day+type);const r=await api.regenMeal(day,type,excName);
setMealPlan(p=>{const np={...p};if(!np[day])np[day]={};np[day]={...np[day],[type]:r.meal};return np;});
setShoppingList(r.shopping);showToast("Pasto rigenerato!");}catch(e){}finally{setRL(null);}};
const dayTotal=dp?Object.values(dp).reduce((s,m)=>s+(m?.total_calories||0),0):0;
return(<div className="ai"><div className="ph"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div><div className="pt">Piano Dieta</div><div className="ps">{profile?.target_calories} kcal/giorno • {profile?.goal} • 25/35/30/10%</div></div><button className="bt bp" onClick={regenAll} disabled={rl==="all"}>{rl==="all"?"⏳ ...":"🔄 Rigenera Tutto"}</button></div></div>
<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{days.map(d=><button key={d} className={"bt bs "+(sel===d?"bp":"")} onClick={()=>setSel(d)}>{d.slice(0,3)}</button>)}</div>
{dp&&<div style={{marginBottom:16,fontSize:".85rem",color:"var(--t2)"}}>Totale {sel}: <strong style={{color:"var(--acc)"}}>{dayTotal} kcal</strong> / {profile?.target_calories}</div>}
{dp?<div className="g2">{[{k:"colazione",l:"Colazione",ic:"🌅",pct:"25%"},{k:"pranzo",l:"Pranzo",ic:"☀️",pct:"35%"},{k:"cena",l:"Cena",ic:"🌙",pct:"30%"},{k:"spuntino",l:"Spuntino",ic:"🍎",pct:"10%"}].map(({k,l,ic,pct})=>{const meal=dp[k];if(!meal)return null;const isL=rl===sel+k;
const mf=meal.foods.map((fId,i)=>{const f=foods.find(x=>x.id===fId);return f?f.name+" ("+meal.portions[i]+"g)":"";}).filter(Boolean);
return(<div key={k} className="cd"><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
<div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:"1.3rem"}}>{ic}</span><div><div style={{fontWeight:700}}>{l}</div><div style={{fontSize:".72rem",color:"var(--t3)"}}>{pct} target</div></div></div>
<button className="bt bs" onClick={()=>regenOne(sel,k,meal.name)} disabled={isL} style={{fontSize:".75rem"}}>{isL?"⏳":"🔄"}</button></div>
<div style={{fontWeight:600,marginBottom:4,color:"var(--acc)"}}>{meal.name}</div>
<div style={{fontSize:".82rem",color:"var(--t2)",marginBottom:8}}>{meal.desc}</div>
<div style={{fontSize:".78rem",color:"var(--t3)",marginBottom:12}}>{mf.join(" • ")}</div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<span className="tg">{meal.total_calories} kcal</span>
<button className="bt bs bp" style={{fontSize:".75rem"}} onClick={()=>{meal.foods.forEach((fId,i)=>{const f=foods.find(x=>x.id===fId);if(f)addEntry(f,meal.portions[i],k);});showToast(l+" aggiunto!");}}>📔 Diario</button>
</div></div>);})}</div>:<div className="cd" style={{textAlign:"center",padding:40}}>Clicca "Rigenera Tutto" per creare il piano!</div>}</div>);};

const Diary=()=>{const wC=weeklyStats.map(d=>Math.round(d.cal||0)),wL=weeklyStats.map(d=>fmtDate(d.entry_date));
const[ef,setEF]=useState({});
const se=(e)=>{setEditingEntry(e.id);setEF({food_name:e.food_name,portion:e.portion,calories:e.calories,protein:e.protein||0,carbs:e.carbs||0,fat:e.fat||0});};
return(<div className="ai"><div className="ph"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div className="pt">Diario</div><button className="bt bp" onClick={()=>setShowModal("addFood")}>+ Aggiungi</button></div></div>
<div className="cd" style={{marginBottom:24}}><div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:16}}><div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:700,fontFamily:"'Playfair Display',serif",color:"var(--acc)"}}>{todayCal}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>/ {profile?.target_calories} kcal</div></div><MacroRing value={todayProt} max={profile?.macro_prot} label="Prot" color="var(--bl)"/><MacroRing value={todayCarb} max={profile?.macro_carb} label="Carb" color="var(--or)"/><MacroRing value={todayFat} max={profile?.macro_fat} label="Grassi" color="var(--pu)"/></div></div>
<div className="cd" style={{marginBottom:24}}><h3 style={{fontSize:"1rem",marginBottom:16}}>Trend</h3>{wC.length?<MiniBarChart data={wC} labels={wL} maxVal={profile?.target_calories||2500}/>:<div style={{textAlign:"center",padding:24,color:"var(--t3)"}}>Nessun dato</div>}</div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Registro</h3>{todayEntries.length===0?<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>Nessun pasto</div>:todayEntries.map(e=>(
editingEntry===e.id?<div key={e.id} className="cd" style={{marginBottom:8,padding:16,border:"1px solid var(--acc)"}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div><label className="lb">Nome</label><input className="ip" value={ef.food_name} onChange={v=>setEF(p=>({...p,food_name:v.target.value}))}/></div>
<div><label className="lb">Porzione</label><input className="ip" type="number" value={ef.portion} onChange={v=>setEF(p=>({...p,portion:+v.target.value}))}/></div>
<div><label className="lb">Kcal</label><input className="ip" type="number" value={ef.calories} onChange={v=>setEF(p=>({...p,calories:+v.target.value}))}/></div>
<div><label className="lb">Prot</label><input className="ip" type="number" value={ef.protein} onChange={v=>setEF(p=>({...p,protein:+v.target.value}))}/></div>
</div><div style={{display:"flex",gap:8}}><button className="bt bp bs" onClick={()=>updateEntry(e.id,ef)}>Salva</button><button className="bt bs" onClick={()=>setEditingEntry(null)}>Annulla</button></div>
</div>:<div key={e.id} className="de"><div style={{flex:1}}><div style={{fontWeight:600}}>{e.food_name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{e.entry_time} - {e.portion}g | P{e.protein} C{e.carbs} G{e.fat}</div></div>
<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontWeight:600,color:"var(--acc)"}}>{e.calories} kcal</span><div className="ra"><button onClick={()=>se(e)}>✏️</button><button onClick={()=>deleteEntry(e.id)}>🗑️</button></div></div></div>
))}</div></div>);};

const Shopping=()=>{const[eid,setEid]=useState(null);const[ef,setEF]=useState({});
const[af,setAF]=useState({food_name:"",category:"Altro",quantity:1,unit:"pz",price:0});const[sa,setSA]=useState(false);
const gr={};shoppingList.forEach(i=>{if(!gr[i.category])gr[i.category]=[];gr[i.category].push(i);});
const chk=shoppingList.filter(i=>i.checked).length;
const tog=async(id)=>{await api.toggleShopItem(id);setShoppingList(p=>p.map(i=>i.id===id?{...i,checked:i.checked?0:1}:i));};
const bp=profile?.budget?Math.min((parseFloat(shopTotal)/profile.budget)*100,100):0;
const addI=async()=>{if(!af.food_name.trim())return;try{const it=await api.addShopItem(af);setShoppingList(p=>[...p,it]);setAF({food_name:"",category:"Altro",quantity:1,unit:"pz",price:0});setSA(false);showToast("Aggiunto");}catch(e){}};
const delI=async(id)=>{try{await api.deleteShopItem(id);setShoppingList(p=>p.filter(i=>i.id!==id));showToast("Rimosso");}catch(e){}};
const seI=(i)=>{setEid(i.id);setEF({food_name:i.food_name,category:i.category,quantity:i.quantity,unit:i.unit,price:i.price});};
const svI=async(id)=>{try{await api.updateShopItem(id,ef);setShoppingList(p=>p.map(i=>i.id===id?{...i,...ef}:i));setEid(null);showToast("Modificato");}catch(e){}};
return(<div className="ai"><div className="ph"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div><div className="pt">Spesa</div><div className="ps">{chk}/{shoppingList.length} • Generata dalla dieta</div></div><button className="bt bp bs" onClick={()=>setSA(!sa)}>+ Manuale</button></div></div>
<div className="cd" style={{marginBottom:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{fontSize:".78rem",color:"var(--t2)"}}>Budget</div><div style={{fontSize:"1.5rem",fontWeight:700,fontFamily:"'Playfair Display',serif"}}>€{shopTotal} <span style={{fontSize:".9rem",color:"var(--t3)"}}>/ €{profile?.budget}</span></div></div>{parseFloat(shopTotal)>(profile?.budget||100)&&<span className="tg" style={{background:"rgba(240,96,96,.15)",color:"var(--rd)"}}>Oltre!</span>}</div><div className="pg"><div className="pb" style={{width:bp+"%",background:bp>90?"var(--rd)":"var(--grad)"}}/></div></div>
{sa&&<div className="cd" style={{marginBottom:20}}><h3 style={{fontSize:"1rem",marginBottom:12}}>Nuovo</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
<div style={{gridColumn:"1/-1"}}><label className="lb">Nome</label><input className="ip" value={af.food_name} onChange={e=>setAF(p=>({...p,food_name:e.target.value}))} placeholder="Es: Latte..."/></div>
<div><label className="lb">Categoria</label><select className="sl" value={af.category} onChange={e=>setAF(p=>({...p,category:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
<div><label className="lb">Qty</label><input className="ip" type="number" value={af.quantity} onChange={e=>setAF(p=>({...p,quantity:+e.target.value}))}/></div>
</div><div style={{display:"flex",gap:8,marginTop:12}}><button className="bt bp bs" onClick={addI}>Aggiungi</button><button className="bt bs" onClick={()=>setSA(false)}>Annulla</button></div></div>}
<div className="cd">{CATS.filter(c=>gr[c]).map(c=>(<div key={c} style={{marginBottom:20}}><div className="sc-h">{c}</div>{gr[c].map(it=>(
eid===it.id?<div key={it.id} style={{padding:12,background:"var(--bg3)",borderRadius:8,marginBottom:8}}>
<div style={{display:"flex",gap:8,marginBottom:8}}><div style={{flex:1}}><label className="lb">Nome</label><input className="ip" value={ef.food_name} onChange={e=>setEF(p=>({...p,food_name:e.target.value}))}/></div>
<div style={{width:80}}><label className="lb">Qty</label><input className="ip" type="number" value={ef.quantity} onChange={e=>setEF(p=>({...p,quantity:+e.target.value}))}/></div></div>
<div style={{display:"flex",gap:8}}><button className="bt bp bs" onClick={()=>svI(it.id)}>Salva</button><button className="bt bs" onClick={()=>setEid(null)}>Annulla</button></div>
</div>:<div key={it.id} className={"si "+(it.checked?"chk":"")}>
<div className={"ck "+(it.checked?"on":"")} onClick={()=>tog(it.id)}>{it.checked?"✓":""}</div>
<div style={{flex:1}}><div style={{fontWeight:500}}>{it.food_name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{it.quantity} {it.unit}{it.is_manual?" (manuale)":""}</div></div>
<div style={{fontSize:".85rem",fontWeight:600,color:"var(--or)"}}>€{(it.price*it.quantity/1000).toFixed(2)}</div>
<div className="ra"><button onClick={()=>seI(it)}>✏️</button><button onClick={()=>delI(it.id)}>🗑️</button></div></div>
))}</div>))}{shoppingList.length===0&&<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>Genera un piano nella Dieta!</div>}</div></div>);};

const Chall=()=>{const cats=[...new Set(CHALLS.map(c=>c.category))];const[sc,setSC]=useState("Tutte");
const fl=sc==="Tutte"?CHALLS:CHALLS.filter(c=>c.category===sc);
const inc=async(c)=>{const cu=challengeProgress[c.id]||0;if(cu>=c.target)return;const n=cu+1;setChallengeProgress(p=>({...p,[c.id]:n}));try{await api.updateChallengeProgress(c.id,n);if(n>=c.target)showToast("Completata: "+c.name+"!");}catch(e){}};
return(<div className="ai"><div className="ph"><div className="pt">Sfide</div></div>
<div className="cd" style={{marginBottom:24,textAlign:"center"}}><div style={{fontSize:"2rem",fontFamily:"'Playfair Display',serif",fontWeight:700}}>{userStats.days_tracked<7?"Principiante":userStats.days_tracked<30?"Intermedio":"Esperto"}</div><div style={{color:"var(--t3)",marginTop:4}}>{userStats.days_tracked} giorni • {userStats.xp||0} XP • {userStats.streak} streak</div></div>
<h3 style={{fontSize:"1rem",marginBottom:12}}>Badge</h3><div className="g4" style={{marginBottom:32}}>{BADGES.map(b=>(<div key={b.id} className={"bg "+(userStats.days_tracked>=b.req?"ea":"lk")}><div style={{fontSize:"1.8rem"}}>{b.icon}</div><div><div style={{fontWeight:600,fontSize:".9rem"}}>{b.name}</div><div style={{fontSize:".72rem",color:"var(--t3)"}}>{b.desc}</div></div></div>))}</div>
<div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}><button className={"bt bs "+(sc==="Tutte"?"bp":"")} onClick={()=>setSC("Tutte")}>Tutte</button>{cats.map(c=><button key={c} className={"bt bs "+(sc===c?"bp":"")} onClick={()=>setSC(c)}>{c}</button>)}</div>
<div className="g2">{fl.map(c=>{const pr=challengeProgress[c.id]||0;const dn=pr>=c.target;
return(<div key={c.id} className={"cc "+(dn?"done":"")}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><span style={{fontSize:"1.5rem"}}>{c.icon}</span><div style={{flex:1}}><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{c.desc}</div></div><span className="tg">{c.xp} XP</span></div>
<div className="pg"><div className="pb" style={{width:(pr/c.target)*100+"%"}}/></div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}><span style={{fontSize:".78rem",color:"var(--t3)"}}>{pr}/{c.target}</span>{!dn&&<button className="bt bs bp" onClick={()=>inc(c)}>+1</button>}{dn&&<span style={{color:"var(--acc)",fontWeight:600}}>Completata!</span>}</div></div>);})}</div></div>);};

const Profile=()=>{const[ed,setEd]=useState(false);const[pf,setPF]=useState(null);const[en,setEN]=useState("");const[nw,setNW]=useState("");
const se=()=>{setPF({weight:profile?.weight||70,height:profile?.height||170,age:profile?.age||30,gender:profile?.gender||"M",activity:profile?.activity||"moderato",goal:profile?.goal||"mantenimento",target_weight:profile?.target_weight||70,budget:profile?.budget||80});setEN(user.name);setEd(true);};
const sp=async()=>{try{if(en!==user.name){await api.updateName(en);setUser(u=>({...u,name:en}));}const bmr=calcBMR(pf.weight,pf.height,pf.age,pf.gender);const tdee=calcTDEE(bmr,pf.activity);const tc=calcGoalCal(tdee,pf.goal);const m=calcMacros(tc,pf.goal);const s=await api.saveProfile({...pf,bmr,tdee,target_calories:tc,macro_prot:m.prot,macro_carb:m.carb,macro_fat:m.fat});setProfile(s);setEd(false);showToast("Profilo aggiornato!");}catch(e){}};
const lw=async()=>{if(!nw)return;try{await api.addWeight(+nw);setProfile(p=>({...p,weight:+nw}));setNW("");showToast("Peso registrato!");}catch(e){}};
return(<div className="ai"><div className="ph"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div className="pt">Profilo</div>{!ed&&<button className="bt bp bs" onClick={se}>Modifica</button>}</div></div>
{ed?<div className="cd" style={{marginBottom:24}}><h3 style={{fontSize:"1rem",marginBottom:16}}>Modifica</h3>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<div style={{gridColumn:"1/-1"}}><label className="lb">Nome</label><input className="ip" value={en} onChange={e=>setEN(e.target.value)}/></div>
<div><label className="lb">Peso</label><input className="ip" type="number" value={pf.weight} onChange={e=>setPF(p=>({...p,weight:+e.target.value}))}/></div>
<div><label className="lb">Altezza</label><input className="ip" type="number" value={pf.height} onChange={e=>setPF(p=>({...p,height:+e.target.value}))}/></div>
<div><label className="lb">Eta</label><input className="ip" type="number" value={pf.age} onChange={e=>setPF(p=>({...p,age:+e.target.value}))}/></div>
<div><label className="lb">Sesso</label><select className="sl" value={pf.gender} onChange={e=>setPF(p=>({...p,gender:e.target.value}))}><option value="M">M</option><option value="F">F</option></select></div>
<div><label className="lb">Attivita</label><select className="sl" value={pf.activity} onChange={e=>setPF(p=>({...p,activity:e.target.value}))}><option value="sedentario">Sedentario</option><option value="leggero">Leggero</option><option value="moderato">Moderato</option><option value="attivo">Attivo</option><option value="molto_attivo">Molto attivo</option></select></div>
<div><label className="lb">Obiettivo</label><select className="sl" value={pf.goal} onChange={e=>setPF(p=>({...p,goal:e.target.value}))}><option value="dimagrimento">Dimagrimento</option><option value="mantenimento">Mantenimento</option><option value="massa">Massa</option></select></div>
<div><label className="lb">Target kg</label><input className="ip" type="number" value={pf.target_weight} onChange={e=>setPF(p=>({...p,target_weight:+e.target.value}))}/></div>
<div><label className="lb">Budget €</label><input className="ip" type="number" value={pf.budget} onChange={e=>setPF(p=>({...p,budget:+e.target.value}))}/></div>
</div><div style={{display:"flex",gap:8,marginTop:16}}><button className="bt bp" onClick={sp}>Salva</button><button className="bt" onClick={()=>setEd(false)}>Annulla</button></div>
</div>:<div className="g2" style={{marginBottom:24}}>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Dati</h3>{[{l:"Nome",v:user.name},{l:"Email",v:user.email},{l:"Peso",v:(profile?.weight||"?")+" kg"},{l:"Altezza",v:(profile?.height||"?")+" cm"}].map((x,i)=>(<div key={i} style={{marginBottom:12}}><span className="lb">{x.l}</span><div style={{fontWeight:600}}>{x.v}</div></div>))}</div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Piano</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{[{l:"Target",v:(profile?.target_calories||"?")+" kcal"},{l:"Obiettivo",v:profile?.goal||""},{l:"Proteine",v:(profile?.macro_prot||"?")+"g"},{l:"Budget",v:"€"+(profile?.budget||"")+"/sett"}].map((x,i)=>(<div key={i}><div className="lb">{x.l}</div><div style={{fontWeight:600}}>{x.v}</div></div>))}</div></div></div>}
<div className="cd" style={{marginBottom:24}}><h3 style={{fontSize:"1rem",marginBottom:12}}>Registra Peso</h3>
<div style={{display:"flex",gap:8}}><input className="ip" type="number" step="0.1" placeholder="72.5" value={nw} onChange={e=>setNW(e.target.value)} style={{maxWidth:200}}/><button className="bt bp bs" onClick={lw}>Registra</button></div></div>
<div className="g2">
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Tema</h3><div className="theme-toggle" onClick={()=>setDark(!dark)}><span>{dark?"🌙":"☀️"}</span><div className="toggle-track"><div className="toggle-thumb" style={{left:dark?22:2}}/></div><span style={{fontSize:".8rem",color:"var(--t2)"}}>{dark?"Dark":"Light"}</span></div></div>
<div className="cd"><button className="bt bd" style={{width:"100%"}} onClick={handleLogout}>Esci</button></div></div></div>);};

const AddFoodModal=()=>{const[tab,setTab]=useState("search");const[por,setPor]=useState(100);const[sf,setSF2]=useState(null);
const[cf,setCF]=useState({name:"",calories:0,protein:0,carbs:0,fat:0,category:"Altro"});
const fi=foods.filter(f=>f.name.toLowerCase().includes(searchFood.toLowerCase()));
const ac=async()=>{if(!cf.name.trim()||!cf.calories)return;try{const s=await api.addFood(cf);setFoods(p=>[...p,s]);showToast("Creato: "+cf.name);setCF({name:"",calories:0,protein:0,carbs:0,fat:0,category:"Altro"});setTab("search");}catch(e){}};
return(<div className="ov" onClick={()=>setShowModal(null)}><div className="md" onClick={e=>e.stopPropagation()}>
<h2>Aggiungi Alimento</h2>
<div className="tb" style={{marginBottom:16}}><div className={"ti "+(tab==="search"?"ac":"")} onClick={()=>setTab("search")}>Cerca</div><div className={"ti "+(tab==="custom"?"ac":"")} onClick={()=>setTab("custom")}>Crea Nuovo</div></div>
{tab==="search"&&<>{sf?<div>
<div style={{marginBottom:16,padding:16,background:"var(--bg2)",borderRadius:12}}><div style={{fontWeight:700}}>{sf.name}</div><div style={{fontSize:".8rem",color:"var(--t3)"}}>{sf.calories} kcal/100g | P{sf.protein} C{sf.carbs} G{sf.fat}</div></div>
<label className="lb">Porzione (g)</label><input className="ip" type="number" value={por} onChange={e=>setPor(+e.target.value)} style={{marginBottom:8}}/>
<div style={{fontSize:".85rem",color:"var(--t2)",marginBottom:16}}>= {Math.round(sf.calories*por/100)} kcal</div>
<div style={{display:"flex",gap:8}}><button className="bt bp" style={{flex:1}} onClick={()=>{addEntry(sf,por);setSF2(null);setPor(100);}}>Aggiungi</button><button className="bt" onClick={()=>{setSF2(null);setPor(100);}}>Indietro</button></div>
</div>:<>
<input className="ip" placeholder="Cerca alimento..." value={searchFood} onChange={e=>setSearchFood(e.target.value)} style={{marginBottom:16}}/>
<div style={{maxHeight:350,overflowY:"auto"}}>{fi.map(f=>(<div key={f.id} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid var(--bdr)",cursor:"pointer"}} onClick={()=>setSF2(f)}><div><div style={{fontWeight:600}}>{f.name}</div><div style={{fontSize:".72rem",color:"var(--t3)"}}>{f.category}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:600,color:"var(--acc)"}}>{f.calories} kcal</div><div style={{fontSize:".7rem",color:"var(--t3)"}}>P{f.protein} C{f.carbs} G{f.fat}</div></div></div>))}</div></>}</>}
{tab==="custom"&&<div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
<div style={{gridColumn:"1/-1"}}><label className="lb">Nome</label><input className="ip" value={cf.name} onChange={e=>setCF(p=>({...p,name:e.target.value}))} placeholder="Es: Hummus, Tofu..."/></div>
<div><label className="lb">Kcal/100g</label><input className="ip" type="number" value={cf.calories} onChange={e=>setCF(p=>({...p,calories:+e.target.value}))}/></div>
<div><label className="lb">Proteine</label><input className="ip" type="number" value={cf.protein} onChange={e=>setCF(p=>({...p,protein:+e.target.value}))}/></div>
<div><label className="lb">Carboidrati</label><input className="ip" type="number" value={cf.carbs} onChange={e=>setCF(p=>({...p,carbs:+e.target.value}))}/></div>
<div><label className="lb">Grassi</label><input className="ip" type="number" value={cf.fat} onChange={e=>setCF(p=>({...p,fat:+e.target.value}))}/></div>
<div><label className="lb">Categoria</label><select className="sl" value={cf.category} onChange={e=>setCF(p=>({...p,category:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
</div><button className="bt bp" style={{width:"100%",marginTop:16}} onClick={ac}>Crea Alimento</button></div>}
<button className="bt" style={{width:"100%",marginTop:12}} onClick={()=>setShowModal(null)}>Chiudi</button></div></div>);};

const pages={dashboard:Dash,diet:Diet,diary:Diary,shopping:Shopping,challenges:Chall,profile:Profile};const Page=pages[page]||Dash;

return(<div className={dark?"":"lm"} style={{minHeight:"100vh",background:"var(--bg0)",transition:"background .4s"}}><div className="ly">
<button className="hb" onClick={()=>setSbOpen(!sbOpen)}>{sbOpen?"✕":"☰"}</button>
<div className={"mbo "+(sbOpen?"sh":"")} onClick={()=>setSbOpen(false)}/>
<nav className={"sb "+(sbOpen?"op":"")}>
<div className="logo"><div className="logo-i">🥗</div><div className="logo-t">NutriGenius</div></div>
<div className="ns">Menu</div>
{[{id:"dashboard",ic:"📊",l:"Dashboard"},{id:"diet",ic:"🥗",l:"Dieta"},{id:"diary",ic:"📔",l:"Diario"},{id:"shopping",ic:"🛒",l:"Spesa"}].map(x=>(<div key={x.id} className={"ni "+(page===x.id?"ac":"")} onClick={()=>navigate(x.id)}><span className="ic">{x.ic}</span>{x.l}</div>))}
<div className="ns">Extra</div>
{[{id:"challenges",ic:"🏆",l:"Sfide"}].map(x=>(<div key={x.id} className={"ni "+(page===x.id?"ac":"")} onClick={()=>navigate(x.id)}><span className="ic">{x.ic}</span>{x.l}</div>))}
<div style={{flex:1}}/>
<div className="theme-toggle" onClick={()=>setDark(!dark)}><span>{dark?"🌙":"☀️"}</span><div className="toggle-track"><div className="toggle-thumb" style={{left:dark?22:2}}/></div><span style={{fontSize:".8rem",color:"var(--t2)"}}>{dark?"Dark":"Light"}</span></div>
<div className="ni" onClick={()=>navigate("profile")}><span className="ic">👤</span>{user.name}</div></nav>
<main className="mn"><Page/></main></div>
{showModal==="addFood"&&<AddFoodModal/>}
{toast&&<div className="toast">{toast}</div>}
</div>);}
