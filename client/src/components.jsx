export const HealthRing = ({ score }) => {
  const c = 2 * Math.PI * 50, o = c - (score / 100) * c;
  const cl = score >= 75 ? "#7ccf82" : score >= 50 ? "#f0a050" : "#f06060";
  return (<div style={{ position: "relative", width: 120, height: 120 }}>
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bdr)" strokeWidth="8" />
      <circle cx="60" cy="60" r="50" fill="none" stroke={cl} strokeWidth="8" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s" }} />
    </svg>
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", fontWeight: 700, color: cl }}>{score}</div>
      <div style={{ fontSize: ".7rem", color: "var(--t2)" }}>Salute</div></div></div>);
};
export const MacroRing = ({ value, max, label, color }) => {
  const p = Math.min((value / (max || 1)) * 100, 100), c = 2 * Math.PI * 18, o = c - (p / 100) * c;
  return (<div style={{ textAlign: "center" }}>
    <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="24" cy="24" r="18" fill="none" stroke="var(--bdr)" strokeWidth="4" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="4" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "all .6s" }} /></svg>
    <div style={{ fontSize: ".7rem", fontWeight: 600, marginTop: 2 }}>{value}g</div>
    <div style={{ fontSize: ".6rem", color: "var(--t3)" }}>{label}</div></div>);
};
export const MiniBarChart = ({ data, labels, maxVal, color }) => {
  const mx = maxVal || Math.max(...data, 1);
  return (<div className="bc">{data.map((v, i) => (
    <div key={i} className="bw"><div style={{ fontSize: ".7rem", color: "var(--t2)", fontWeight: 600 }}>{v}</div>
      <div className="bb" style={{ height: Math.max((v / mx) * 100, 3) + "%", background: color || "var(--grad)" }} />
      <div style={{ fontSize: ".65rem", color: "var(--t3)" }}>{labels && labels[i]}</div></div>))}</div>);
};
export const CATS = ["Frutta","Verdura","Carne","Pesce","Latticini","Cereali","Legumi","Frutta secca","Condimenti","Proteine","Altro"];
export const BADGES = [
  {id:1,name:"Principiante",icon:"🌱",desc:"Primo giorno tracciato",req:1},
  {id:2,name:"Costante",icon:"🔥",desc:"7 giorni di tracking",req:7},
  {id:3,name:"Disciplinato",icon:"💎",desc:"14 giorni consecutivi",req:14},
  {id:4,name:"Esperto",icon:"⭐",desc:"30 giorni di impegno",req:30},
  {id:5,name:"Guerriero",icon:"⚔️",desc:"60 giorni inarrestabile",req:60},
  {id:6,name:"Maestro",icon:"👑",desc:"90 giorni di dedizione",req:90},
  {id:7,name:"Leggenda",icon:"🏆",desc:"365 giorni - un anno!",req:365},
];
export const CHALLS = [
  {id:"c1",name:"5 Porzioni al Giorno",desc:"Mangia 5 porzioni di frutta/verdura per 7 giorni",target:7,icon:"🥦",xp:100,category:"Nutrizione"},
  {id:"c2",name:"Proteine Power",desc:"Raggiungi il target proteine per 5 giorni",target:5,icon:"💪",xp:150,category:"Macro"},
  {id:"c3",name:"Budget Master",desc:"Resta nel budget spesa per 4 settimane",target:4,icon:"💰",xp:200,category:"Risparmio"},
  {id:"c4",name:"Tracker Pro",desc:"Traccia i pasti per 7 giorni consecutivi",target:7,icon:"📊",xp:120,category:"Costanza"},
  {id:"c5",name:"Idratazione",desc:"Registra almeno 8 bicchieri d'acqua per 5 giorni",target:5,icon:"💧",xp:80,category:"Benessere"},
  {id:"c6",name:"Chef Casalingo",desc:"Prepara 10 ricette dal piano settimanale",target:10,icon:"👨‍🍳",xp:180,category:"Cucina"},
  {id:"c7",name:"Peso Forma",desc:"Registra il peso per 14 giorni",target:14,icon:"⚖️",xp:160,category:"Monitoraggio"},
  {id:"c8",name:"Streak Infuocata",desc:"Mantieni una streak di 21 giorni",target:21,icon:"🔥",xp:250,category:"Costanza"},
  {id:"c9",name:"Zero Sprechi",desc:"Completa tutta la lista spesa per 3 settimane",target:3,icon:"♻️",xp:140,category:"Risparmio"},
  {id:"c10",name:"Equilibrio Perfetto",desc:"Centra tutti i macro (±10%) per 5 giorni",target:5,icon:"🎯",xp:200,category:"Macro"},
];
export const calcBMR=(w,h,a,g)=>g==="M"?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161;
export const calcTDEE=(bmr,act)=>Math.round(bmr*({sedentario:1.2,leggero:1.375,moderato:1.55,attivo:1.725,molto_attivo:1.9}[act]||1.2));
export const calcGoalCal=(tdee,goal)=>goal==="dimagrimento"?Math.round(tdee*.8):goal==="massa"?Math.round(tdee*1.15):tdee;
export const calcMacros=(cal,goal)=>{if(goal==="dimagrimento")return{prot:Math.round(cal*.35/4),carb:Math.round(cal*.35/4),fat:Math.round(cal*.3/9)};if(goal==="massa")return{prot:Math.round(cal*.3/4),carb:Math.round(cal*.45/4),fat:Math.round(cal*.25/9)};return{prot:Math.round(cal*.25/4),carb:Math.round(cal*.5/4),fat:Math.round(cal*.25/9)};};
export const fmtDate=(d)=>new Date(d).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
