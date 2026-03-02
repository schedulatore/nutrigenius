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
export const BADGES = [{id:1,name:"Principiante",icon:"\u{1F331}",desc:"Primo giorno",req:1},{id:2,name:"Costante",icon:"\u{1F525}",desc:"7 giorni",req:7},{id:3,name:"Esperto",icon:"\u2B50",desc:"30 giorni",req:30},{id:4,name:"Maestro",icon:"\u{1F451}",desc:"90 giorni",req:90},{id:5,name:"Leggenda",icon:"\u{1F3C6}",desc:"365 giorni",req:365}];
export const CHALLS = [{id:1,name:"5 Porzioni",desc:"Frutta/verdura",target:7,icon:"\u{1F966}",xp:100,progress:0},{id:2,name:"Proteine Power",desc:"Target 5gg",target:5,icon:"\u{1F4AA}",xp:150,progress:0},{id:3,name:"Budget Master",desc:"4 settimane",target:4,icon:"\u{1F4B0}",xp:200,progress:0},{id:4,name:"Tracker Pro",desc:"7gg consecutivi",target:7,icon:"\u{1F4CA}",xp:120,progress:0}];
export const calcBMR=(w,h,a,g)=>g==="M"?10*w+6.25*h-5*a+5:10*w+6.25*h-5*a-161;
export const calcTDEE=(bmr,act)=>Math.round(bmr*({sedentario:1.2,leggero:1.375,moderato:1.55,attivo:1.725,molto_attivo:1.9}[act]||1.2));
export const calcGoalCal=(tdee,goal)=>goal==="dimagrimento"?Math.round(tdee*.8):goal==="massa"?Math.round(tdee*1.15):tdee;
export const calcMacros=(cal,goal)=>{if(goal==="dimagrimento")return{prot:Math.round(cal*.35/4),carb:Math.round(cal*.35/4),fat:Math.round(cal*.3/9)};if(goal==="massa")return{prot:Math.round(cal*.3/4),carb:Math.round(cal*.45/4),fat:Math.round(cal*.25/9)};return{prot:Math.round(cal*.25/4),carb:Math.round(cal*.5/4),fat:Math.round(cal*.25/9)};};
export const fmtDate=(d)=>new Date(d).toLocaleDateString("it-IT",{day:"2-digit",month:"short"});
