import{useState,useEffect,useRef}from"react";
import api from"./api.js";
import{HealthRing,MacroRing,MiniBarChart,CATS,BADGES,CHALLS,calcBMR,calcTDEE,calcGoalCal,calcMacros,fmtDate,today}from"./components.jsx";

export default function App(){
const[loading,setLoading]=useState(true);const[dark,setDark]=useState(true);const[sbOpen,setSbOpen]=useState(false);
const[page,setPage]=useState("dashboard");const[user,setUser]=useState(null);const[authMode,setAuthMode]=useState("login");
const[profile,setProfile]=useState(null);const[foods,setFoods]=useState([]);const[todayEntries,setTodayEntries]=useState([]);
const[weeklyStats,setWeeklyStats]=useState([]);const[mealPlan,setMealPlan]=useState({});const[shoppingList,setShoppingList]=useState([]);
const[weightLog,setWeightLog]=useState([]);const[userStats,setUserStats]=useState({xp:0,days_tracked:0,streak:0});
const[chatMessages,setChatMessages]=useState([{role:"ai",message:"Ciao! Sono il tuo coach nutrizionale 🥗"}]);
const[showModal,setShowModal]=useState(null);const[searchFood,setSearchFood]=useState("");const[chatInput,setChatInput]=useState("");
const[loginForm,setLF]=useState({email:"",password:"",name:""});
const[setupForm,setSF]=useState({weight:70,height:170,age:30,gender:"M",activity:"moderato",goal:"mantenimento",target_weight:70,budget:80});
const[error,setError]=useState("");

useEffect(()=>{(async()=>{if(api.getToken()){try{const u=await api.getMe();setUser(u);const p=await api.getProfile();if(p){setProfile(p);await loadDash();}else setAuthMode("setup");}catch{api.logout();}}setLoading(false);})();},[]);

const loadDash=async()=>{try{const[dash,fl,plan,shop,chat]=await Promise.all([api.getDashboard(),api.getFoods(),api.getMealPlan(),api.getShopping(),api.getChatHistory().catch(()=>[])]);
setProfile(dash.profile);setTodayEntries(dash.todayEntries);setWeeklyStats(dash.weeklyStats);setWeightLog(dash.weightLog);setUserStats(dash.stats);setFoods(fl);setMealPlan(plan);setShoppingList(shop);if(chat.length)setChatMessages(chat);}catch(e){console.error(e);}};

const handleLogin=async()=>{try{setError("");const d=await api.login(loginForm.email,loginForm.password);setUser(d.user);const p=await api.getProfile();if(p){setProfile(p);await loadDash();}else setAuthMode("setup");}catch(e){setError(e.message);}};
const handleRegister=async()=>{try{setError("");if(!loginForm.name||!loginForm.email||!loginForm.password){setError("Compila tutti i campi");return;}const d=await api.register(loginForm.name,loginForm.email,loginForm.password);setUser(d.user);setAuthMode("setup");}catch(e){setError(e.message);}};
const handleSetup=async()=>{const bmr=calcBMR(setupForm.weight,setupForm.height,setupForm.age,setupForm.gender);const tdee=calcTDEE(bmr,setupForm.activity);const tc=calcGoalCal(tdee,setupForm.goal);const m=calcMacros(tc,setupForm.goal);
try{const p=await api.saveProfile({...setupForm,bmr,tdee,target_calories:tc,macro_prot:m.prot,macro_carb:m.carb,macro_fat:m.fat});setProfile(p);await api.addWeight(setupForm.weight);await api.generateMealPlan();await loadDash();setAuthMode("login");}catch(e){setError(e.message);}};
const handleLogout=()=>{api.logout();setUser(null);setProfile(null);};
const addEntry=async(food,portion=100)=>{try{const e={food_id:food.id,food_name:food.name,portion,calories:Math.round(food.calories*portion/100),protein:Math.round(food.protein*portion/100),carbs:Math.round(food.carbs*portion/100),fat:Math.round(food.fat*portion/100)};const saved=await api.addDiaryEntry(e);setTodayEntries(prev=>[saved,...prev]);setShowModal(null);}catch(e){console.error(e);}};

const todayCal=todayEntries.reduce((s,e)=>s+(e.calories||0),0);const todayProt=todayEntries.reduce((s,e)=>s+(e.protein||0),0);
const todayCarb=todayEntries.reduce((s,e)=>s+(e.carbs||0),0);const todayFat=todayEntries.reduce((s,e)=>s+(e.fat||0),0);
const shopTotal=shoppingList.reduce((s,i)=>s+(i.price*i.quantity/1000),0).toFixed(2);
const healthScore=Math.min(100,50+Math.min(20,(userStats.days_tracked||0)*2)+(todayCal>0&&profile?.target_calories?(Math.abs(1-todayCal/profile.target_calories)<.15?15:8):0));
const navigate=(p)=>{setPage(p);setSbOpen(false);};

if(loading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0a0a0f"}}><div style={{textAlign:"center"}}><div style={{fontSize:"3rem",marginBottom:16}}>🥗</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",color:"#e8e8ed"}}>NutriGenius</div></div></div>);

if(!user||(authMode==="setup"&&user)){
if(authMode==="setup"&&user)return(<div className={dark?"":"lm"}><div className="lp"><div className="lb2" style={{maxWidth:520}}>
<div style={{textAlign:"center",fontSize:"2.5rem",marginBottom:12}}>🧬</div><h1>Profilo Nutrizionale</h1><p>Configuriamo il tuo piano</p>
{error&&<div className="err">{error}</div>}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
<div><label className="lb">Peso (kg)</label><input className="ip" type="number" value={setupForm.weight} onChange={e=>setSF(p=>({...p,weight:+e.target.value}))}/></div>
<div><label className="lb">Altezza (cm)</label><input className="ip" type="number" value={setupForm.height} onChange={e=>setSF(p=>({...p,height:+e.target.value}))}/></div>
<div><label className="lb">Età</label><input className="ip" type="number" value={setupForm.age} onChange={e=>setSF(p=>({...p,age:+e.target.value}))}/></div>
<div><label className="lb">Sesso</label><select className="sl" value={setupForm.gender} onChange={e=>setSF(p=>({...p,gender:e.target.value}))}><option value="M">Maschio</option><option value="F">Femmina</option></select></div>
<div><label className="lb">Attività</label><select className="sl" value={setupForm.activity} onChange={e=>setSF(p=>({...p,activity:e.target.value}))}><option value="sedentario">Sedentario</option><option value="leggero">Leggero</option><option value="moderato">Moderato</option><option value="attivo">Attivo</option><option value="molto_attivo">Molto attivo</option></select></div>
<div><label className="lb">Obiettivo</label><select className="sl" value={setupForm.goal} onChange={e=>setSF(p=>({...p,goal:e.target.value}))}><option value="dimagrimento">Dimagrimento</option><option value="mantenimento">Mantenimento</option><option value="massa">Massa</option></select></div>
<div><label className="lb">Peso Obiettivo</label><input className="ip" type="number" value={setupForm.target_weight} onChange={e=>setSF(p=>({...p,target_weight:+e.target.value}))}/></div>
<div><label className="lb">Budget €/sett</label><input className="ip" type="number" value={setupForm.budget} onChange={e=>setSF(p=>({...p,budget:+e.target.value}))}/></div>
</div><button className="bt bp" style={{width:"100%",marginTop:24,padding:14}} onClick={handleSetup}>✨ Genera Piano</button></div></div></div>);

return(<div className={dark?"":"lm"}><div className="lp"><div className="lb2">
<div style={{textAlign:"center",fontSize:"2.5rem",marginBottom:8}}>🥗</div><h1>NutriGenius</h1><p>Nutrizione intelligente</p>
<div className="tb"><div className={`ti ${authMode==="login"?"ac":""}`} onClick={()=>{setAuthMode("login");setError("");}}>Accedi</div><div className={`ti ${authMode==="register"?"ac":""}`} onClick={()=>{setAuthMode("register");setError("");}}>Registrati</div></div>
{error&&<div className="err">{error}</div>}
{authMode==="register"&&<div style={{marginBottom:16}}><label className="lb">Nome</label><input className="ip" placeholder="Nome" value={loginForm.name} onChange={e=>setLF(p=>({...p,name:e.target.value}))}/></div>}
<div style={{marginBottom:16}}><label className="lb">Email</label><input className="ip" type="email" placeholder="email@esempio.com" value={loginForm.email} onChange={e=>setLF(p=>({...p,email:e.target.value}))}/></div>
<div style={{marginBottom:24}}><label className="lb">Password</label><input className="ip" type="password" placeholder="••••••••" value={loginForm.password} onChange={e=>setLF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?handleLogin():handleRegister())}/></div>
<button className="bt bp" style={{width:"100%",padding:14}} onClick={authMode==="login"?handleLogin:handleRegister}>{authMode==="login"?"🔓 Accedi":"🚀 Crea Account"}</button>
</div></div></div>);}

// PAGES
const Dash=()=>{const wC=weeklyStats.map(d=>Math.round(d.cal||0)),wL=weeklyStats.map(d=>fmtDate(d.entry_date));
return(<div className="ai"><div className="ph"><div className="pt">Buongiorno, {user.name} 👋</div><div className="ps">Riepilogo giornata</div></div>
<div className="g4" style={{marginBottom:24}}>{[{l:"Calorie",v:todayCal,mx:profile?.target_calories,ic:"🔥",cl:"var(--acc)"},{l:"Proteine",v:todayProt,mx:profile?.macro_prot,ic:"💪",cl:"var(--bl)"},{l:"Spesa",v:`€${shopTotal}`,mx:null,u:`/ €${profile?.budget}`,ic:"💰",cl:"var(--or)"},{l:"Salute",v:healthScore,mx:100,ic:"❤️",cl:"var(--pu)"}].map((s,i)=>(<div key={i} className="cd"><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:".8rem",color:"var(--t2)"}}>{s.l}</span><span style={{fontSize:"1.2rem"}}>{s.ic}</span></div><div style={{fontSize:"1.8rem",fontFamily:"'Playfair Display',serif",fontWeight:700,color:s.cl}}>{s.v}</div>{s.mx&&<><div style={{fontSize:".75rem",color:"var(--t3)",marginBottom:8}}>/{s.mx}</div><div className="pg"><div className="pb" style={{width:`${Math.min(((typeof s.v==="number"?s.v:0)/s.mx)*100,100)}%`,background:s.cl}}/></div></>}{!s.mx&&s.u&&<div style={{fontSize:".8rem",color:"var(--t3)"}}>{s.u}</div>}</div>))}</div>
<div className="g2">
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>📊 Settimana</h3>{wC.length?<MiniBarChart data={wC} labels={wL} maxVal={profile?.target_calories||2500}/>:<div style={{textAlign:"center",padding:24,color:"var(--t3)"}}>Inizia a registrare!</div>}</div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>❤️ Stato</h3><div style={{display:"flex",alignItems:"center",justifyContent:"space-around",flexWrap:"wrap",gap:12}}><HealthRing score={healthScore}/><div style={{display:"flex",gap:16}}><MacroRing value={todayProt} max={profile?.macro_prot} label="Prot" color="var(--bl)"/><MacroRing value={todayCarb} max={profile?.macro_carb} label="Carb" color="var(--or)"/><MacroRing value={todayFat} max={profile?.macro_fat} label="Grassi" color="var(--pu)"/></div></div></div>
<div className="cd"><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{fontSize:"1rem"}}>🍽️ Oggi</h3><button className="bt bs bp" onClick={()=>setShowModal("addFood")}>+ Aggiungi</button></div>{todayEntries.length===0?<div style={{textAlign:"center",padding:24,color:"var(--t3)"}}>Nessun pasto</div>:todayEntries.slice(0,5).map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"var(--bg2)",borderRadius:8,marginBottom:6,fontSize:".85rem"}}><div><div style={{fontWeight:600}}>{e.food_name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{e.entry_time} · {e.portion}g</div></div><div style={{fontWeight:600,color:"var(--acc)"}}>{e.calories} kcal</div></div>))}</div>
<div className="cd" style={{background:"var(--acc-d)",border:"1px solid var(--bdr2)"}}><h3 style={{fontSize:"1rem",marginBottom:12}}>🧠 Consiglio</h3><p style={{fontSize:".9rem",lineHeight:1.6}}>{todayCal===0?"Registra la colazione per partire!":todayCal<(profile?.target_calories||2000)*.5?"Sotto metà target, fai pasti regolari!":todayCal>(profile?.target_calories||2000)?"Superato il target, domani si riparte! 💪":"Alla grande! 🌟"}</p></div>
</div></div>);};

const Diet=()=>{const days=["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];const[sel,setSel]=useState(days[new Date().getDay()===0?6:new Date().getDay()-1]);const dp=mealPlan[sel];
const regen=async()=>{try{const p=await api.generateMealPlan();setMealPlan(p);setShoppingList(await api.getShopping());}catch(e){console.error(e);}};
return(<div className="ai"><div className="ph"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div><div className="pt">Piano Dieta 🥗</div><div className="ps">{profile?.target_calories} kcal/giorno</div></div><button className="bt bp" onClick={regen}>🔄 Rigenera</button></div></div>
<div style={{display:"flex",gap:6,marginBottom:24,flexWrap:"wrap"}}>{days.map(d=><button key={d} className={`bt bs ${sel===d?"bp":""}`} onClick={()=>setSel(d)}>{d.slice(0,3)}</button>)}</div>
{dp?<div className="g2">{[{k:"colazione",l:"Colazione",ic:"🌅"},{k:"spuntino",l:"Spuntino",ic:"🍎"},{k:"pranzo",l:"Pranzo",ic:"☀️"},{k:"cena",l:"Cena",ic:"🌙"}].map(({k,l,ic})=>{const meal=dp[k];if(!meal)return null;
return(<div key={k} className="mc" onClick={()=>{meal.foods.forEach((fId,i)=>{const f=foods.find(x=>x.id===fId);if(f)addEntry(f,meal.portions[i]);});}}><div style={{fontSize:"1.5rem"}}>{ic}</div><div style={{fontWeight:600}}>{l}: {meal.name}</div><div style={{fontSize:".8rem",color:"var(--t2)"}}>{meal.desc}</div><div style={{display:"flex",gap:8,marginTop:8}}><span className="tg">{meal.total_calories} kcal</span></div></div>);})}</div>:<div className="cd" style={{textAlign:"center",padding:40}}>Clicca "Rigenera"!</div>}</div>);};

const Diary=()=>{const wC=weeklyStats.map(d=>Math.round(d.cal||0)),wL=weeklyStats.map(d=>fmtDate(d.entry_date));
return(<div className="ai"><div className="ph"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div className="pt">Diario 📔</div><button className="bt bp" onClick={()=>setShowModal("addFood")}>+ Aggiungi</button></div></div>
<div className="cd" style={{marginBottom:24}}><div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:16}}><div style={{textAlign:"center"}}><div style={{fontSize:"1.8rem",fontWeight:700,fontFamily:"'Playfair Display',serif",color:"var(--acc)"}}>{todayCal}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>/ {profile?.target_calories} kcal</div></div><MacroRing value={todayProt} max={profile?.macro_prot} label="Prot" color="var(--bl)"/><MacroRing value={todayCarb} max={profile?.macro_carb} label="Carb" color="var(--or)"/><MacroRing value={todayFat} max={profile?.macro_fat} label="Grassi" color="var(--pu)"/></div></div>
<div className="cd" style={{marginBottom:24}}><h3 style={{fontSize:"1rem",marginBottom:16}}>📊 Trend</h3>{wC.length?<MiniBarChart data={wC} labels={wL} maxVal={profile?.target_calories||2500}/>:<div style={{textAlign:"center",padding:24,color:"var(--t3)"}}>Nessun dato</div>}</div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>📝 Registro</h3>{todayEntries.length===0?<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>Nessun pasto oggi</div>:todayEntries.map(e=>(<div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid var(--bdr)"}}><div><div style={{fontWeight:600}}>{e.food_name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{e.entry_time} · {e.portion}g</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:600,color:"var(--acc)"}}>{e.calories} kcal</div><div style={{fontSize:".7rem",color:"var(--t3)"}}>P{e.protein} C{e.carbs} G{e.fat}</div></div></div>))}</div></div>);};

const Shopping=()=>{const grouped={};shoppingList.forEach(i=>{if(!grouped[i.category])grouped[i.category]=[];grouped[i.category].push(i);});const checked=shoppingList.filter(i=>i.checked).length;
const toggle=async(id)=>{await api.toggleShopItem(id);setShoppingList(p=>p.map(i=>i.id===id?{...i,checked:i.checked?0:1}:i));};
const bp=profile?.budget?Math.min((parseFloat(shopTotal)/profile.budget)*100,100):0;
return(<div className="ai"><div className="ph"><div className="pt">Spesa 🛒</div><div className="ps">{checked}/{shoppingList.length}</div></div>
<div className="cd" style={{marginBottom:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{fontSize:".8rem",color:"var(--t2)"}}>Budget</div><div style={{fontSize:"1.5rem",fontWeight:700,fontFamily:"'Playfair Display',serif"}}>€{shopTotal} <span style={{fontSize:".9rem",color:"var(--t3)"}}>/ €{profile?.budget}</span></div></div>{parseFloat(shopTotal)>(profile?.budget||100)&&<span className="tg" style={{background:"rgba(240,96,96,.15)",color:"var(--rd)"}}>⚠️ Oltre!</span>}</div><div className="pg"><div className="pb" style={{width:`${bp}%`,background:bp>90?"var(--rd)":"var(--grad)"}}/></div></div>
<div className="cd">{CATS.filter(c=>grouped[c]).map(c=>(<div key={c} style={{marginBottom:20}}><div className="sc-h">{c}</div>{grouped[c].map(item=>(<div key={item.id} className={`si ${item.checked?"chk":""}`}><div className={`ck ${item.checked?"on":""}`} onClick={()=>toggle(item.id)}>{item.checked?"✓":""}</div><div style={{flex:1}}><div style={{fontWeight:500}}>{item.food_name}</div></div><div style={{fontSize:".85rem",fontWeight:600,color:"var(--or)"}}>€{(item.price*item.quantity/1000).toFixed(2)}</div></div>))}</div>))}{shoppingList.length===0&&<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>Genera un piano!</div>}</div></div>);};

const Coach=()=>{const chatEnd=useRef(null);useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[chatMessages]);
const send=async()=>{if(!chatInput.trim())return;const msg=chatInput.trim();setChatInput("");setChatMessages(p=>[...p,{role:"user",message:msg}]);
try{const r=await api.sendChat(msg);setChatMessages(p=>[...p,{role:"ai",message:r.aiMsg.message}]);}catch{setChatMessages(p=>[...p,{role:"ai",message:"Errore, riprova!"}]);}};
return(<div className="ai"><div className="ph"><div className="pt">Coach 🧠</div></div>
<div className="cd" style={{height:"calc(100vh - 200px)",display:"flex",flexDirection:"column"}}><div className="cm" style={{flex:1}}>{chatMessages.map((m,i)=><div key={i} className={`msg ${m.role==="user"?"u":"a"}`}>{m.message}</div>)}<div ref={chatEnd}/></div>
<div style={{display:"flex",gap:8,marginTop:12}}><input className="ip" placeholder="Scrivi..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/><button className="bt bp" onClick={send}>Invia</button></div></div></div>);};

const Chef=()=>{const[sel,setSel]=useState([]);const[recipe,setRecipe]=useState(null);
const tog=(f)=>setSel(p=>p.find(x=>x.id===f.id)?p.filter(x=>x.id!==f.id):[...p,f]);
const gen=()=>{if(sel.length<2)return;setRecipe({name:`${sel[0].name} con ${sel.slice(1).map(f=>f.name.toLowerCase()).join(" e ")}`,ingredients:sel.map(f=>`${f.name} (100g)`),cal:Math.round(sel.reduce((s,f)=>s+f.calories,0)*1.5/sel.length),time:Math.round(15+Math.random()*30),steps:["Prepara ingredienti","Taglia a pezzetti","Cuoci in padella","Condisci e servi"]});};
return(<div className="ai"><div className="ph"><div className="pt">Chef AI 👨‍🍳</div></div>
<div className="g2"><div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>🧊 Ingredienti</h3><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{foods.map(f=><button key={f.id} className={`bt bs ${sel.find(x=>x.id===f.id)?"bp":""}`} onClick={()=>tog(f)}>{f.name}</button>)}</div>{sel.length>=2&&<button className="bt bp" style={{width:"100%",marginTop:16}} onClick={gen}>🪄 Genera</button>}</div>
{recipe&&<div className="cd as" style={{border:"1px solid var(--bdr2)"}}><h3 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",marginBottom:12}}>🍳 {recipe.name}</h3><div style={{display:"flex",gap:8,marginBottom:16}}><span className="tg">{recipe.cal} kcal</span><span className="tg" style={{background:"rgba(96,160,240,.15)",color:"var(--bl)"}}>{recipe.time} min</span></div><div style={{fontSize:".85rem",color:"var(--t2)"}}><strong>Ingredienti:</strong><ul style={{paddingLeft:16,margin:"8px 0"}}>{recipe.ingredients.map((x,i)=><li key={i}>{x}</li>)}</ul><strong>Preparazione:</strong><ol style={{paddingLeft:16,marginTop:8}}>{recipe.steps.map((x,i)=><li key={i}>{x}</li>)}</ol></div></div>}</div></div>);};

const Chall=()=>(<div className="ai"><div className="ph"><div className="pt">Sfide 🏆</div></div>
<div className="cd" style={{marginBottom:24,textAlign:"center"}}><div style={{fontSize:"3rem",fontFamily:"'Playfair Display',serif",fontWeight:700}}>{userStats.days_tracked<7?"🌱 Principiante":userStats.days_tracked<30?"🔥 Intermedio":"⭐ Esperto"}</div><div style={{color:"var(--t3)",marginTop:4}}>{userStats.days_tracked} giorni · {userStats.xp||0} XP · 🔥 {userStats.streak} streak</div></div>
<h3 style={{fontSize:"1rem",marginBottom:16}}>🎖️ Badge</h3><div className="g2" style={{marginBottom:32}}>{BADGES.map(b=>(<div key={b.id} className={`bg ${userStats.days_tracked>=b.req?"ea":"lk"}`}><div style={{fontSize:"2rem"}}>{b.icon}</div><div><div style={{fontWeight:600}}>{b.name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{b.desc}</div></div></div>))}</div>
<h3 style={{fontSize:"1rem",marginBottom:16}}>🎯 Sfide</h3><div className="g2">{CHALLS.map(c=>(<div key={c.id} className="cd"><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><span style={{fontSize:"1.5rem"}}>{c.icon}</span><div><div style={{fontWeight:600}}>{c.name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{c.desc}</div></div></div><div className="pg"><div className="pb" style={{width:`${(c.progress/c.target)*100}%`}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:".75rem",marginTop:8}}><span style={{color:"var(--t3)"}}>{c.progress}/{c.target}</span><span className="tg">{c.xp} XP</span></div></div>))}</div></div>);

const Profile=()=>(<div className="ai"><div className="ph"><div className="pt">Profilo 👤</div></div><div className="g2">
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Dati</h3>{[{l:"Nome",v:user.name},{l:"Email",v:user.email},{l:"Ruolo",v:user.role}].map((x,i)=>(<div key={i} style={{marginBottom:12}}><span className="lb">{x.l}</span><div style={{fontWeight:600}}>{x.v}</div></div>))}</div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Nutrizionali</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{[{l:"Peso",v:`${profile?.weight} kg`},{l:"Target",v:`${profile?.target_calories} kcal`},{l:"Obiettivo",v:profile?.goal},{l:"Budget",v:`€${profile?.budget}`}].map((x,i)=>(<div key={i}><div className="lb">{x.l}</div><div style={{fontWeight:600}}>{x.v}</div></div>))}</div></div>
<div className="cd"><h3 style={{fontSize:"1rem",marginBottom:16}}>Tema</h3><div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setDark(!dark)}><span>☀️</span><div style={{width:48,height:26,background:dark?"var(--acc)":"var(--bg2)",borderRadius:13,position:"relative",border:"1px solid var(--bdr)"}}><div style={{width:20,height:20,background:"white",borderRadius:"50%",position:"absolute",top:2,left:dark?24:2,transition:"left .3s"}}/></div><span>🌙</span></div></div>
<div className="cd"><button className="bt bd" style={{width:"100%"}} onClick={handleLogout}>🚪 Esci</button></div></div></div>);

const pages={dashboard:Dash,diet:Diet,diary:Diary,shopping:Shopping,coach:Coach,chef:Chef,challenges:Chall,profile:Profile};const Page=pages[page]||Dash;

const AddFoodModal=()=>{const filtered=foods.filter(f=>f.name.toLowerCase().includes(searchFood.toLowerCase()));
return(<div className="ov" onClick={()=>setShowModal(null)}><div className="md" onClick={e=>e.stopPropagation()}>
<h2>➕ Aggiungi Alimento</h2><input className="ip" placeholder="Cerca..." value={searchFood} onChange={e=>setSearchFood(e.target.value)} autoFocus style={{marginBottom:16}}/>
<div style={{maxHeight:400,overflowY:"auto"}}>{filtered.map(f=>(<div key={f.id} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid var(--bdr)",cursor:"pointer"}} onClick={()=>addEntry(f)}><div><div style={{fontWeight:600}}>{f.name}</div><div style={{fontSize:".75rem",color:"var(--t3)"}}>{f.category}</div></div><div style={{textAlign:"right"}}><div style={{fontWeight:600,color:"var(--acc)"}}>{f.calories} kcal</div><div style={{fontSize:".7rem",color:"var(--t3)"}}>P{f.protein} C{f.carbs} G{f.fat}</div></div></div>))}</div>
<button className="bt" style={{width:"100%",marginTop:16}} onClick={()=>setShowModal(null)}>Chiudi</button></div></div>);};

return(<div className={dark?"":"lm"} style={{minHeight:"100vh",background:"var(--bg0)",transition:"all .4s"}}><div className="ly">
<button className="hb" onClick={()=>setSbOpen(!sbOpen)}>{sbOpen?"✕":"☰"}</button>
<div className={`mbo ${sbOpen?"sh":""}`} onClick={()=>setSbOpen(false)}/>
<nav className={`sb ${sbOpen?"op":""}`}><div className="logo"><div className="logo-i">🥗</div><div className="logo-t">NutriGenius</div></div>
<div className="ns">Menu</div>
{[{id:"dashboard",ic:"📊",l:"Dashboard"},{id:"diet",ic:"🥗",l:"Piano Dieta"},{id:"diary",ic:"📔",l:"Diario"},{id:"shopping",ic:"🛒",l:"Spesa"}].map(x=>(<div key={x.id} className={`ni ${page===x.id?"ac":""}`} onClick={()=>navigate(x.id)}><span className="ic">{x.ic}</span>{x.l}</div>))}
<div className="ns">Extra</div>
{[{id:"chef",ic:"👨‍🍳",l:"Chef AI"},{id:"coach",ic:"🧠",l:"Coach"},{id:"challenges",ic:"🏆",l:"Sfide"}].map(x=>(<div key={x.id} className={`ni ${page===x.id?"ac":""}`} onClick={()=>navigate(x.id)}><span className="ic">{x.ic}</span>{x.l}</div>))}
<div style={{flex:1}}/><div className="ni" onClick={()=>navigate("profile")}><span className="ic">👤</span>{user.name}</div></nav>
<main className="mn"><Page/></main></div>
{page!=="coach"&&<button className="fab" onClick={()=>setShowModal("addFood")}>+</button>}
{showModal==="addFood"&&<AddFoodModal/>}</div>);}
