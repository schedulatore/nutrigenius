const BASE = "";
class Api {
  constructor() { this.token = localStorage.getItem("ng-token"); }
  setToken(t) { this.token = t; t ? localStorage.setItem("ng-token", t) : localStorage.removeItem("ng-token"); }
  getToken() { return this.token || localStorage.getItem("ng-token"); }
  async req(path, opts = {}) {
    const h = { "Content-Type": "application/json" }; const t = this.getToken(); if (t) h["Authorization"] = `Bearer ${t}`;
    const r = await fetch(`${BASE}${path}`, { ...opts, headers: { ...h, ...opts.headers } });
    if (r.status === 401) { this.setToken(null); window.location.reload(); }
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Errore"); return d;
  }
  async register(n,e,p){const d=await this.req("/api/auth/register",{method:"POST",body:JSON.stringify({name:n,email:e,password:p})});this.setToken(d.token);return d;}
  async login(e,p){const d=await this.req("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:p})});this.setToken(d.token);return d;}
  async getMe(){return this.req("/api/auth/me");}
  logout(){this.setToken(null);}
  async getProfile(){return this.req("/api/profile");}
  async saveProfile(p){return this.req("/api/profile",{method:"POST",body:JSON.stringify(p)});}
  async getFoods(){return this.req("/api/foods");}
  async searchFoods(q){return this.req(`/api/foods/search?q=${encodeURIComponent(q)}`);}
  async getTodayDiary(){return this.req("/api/diary/today");}
  async addDiaryEntry(e){return this.req("/api/diary",{method:"POST",body:JSON.stringify(e)});}
  async deleteDiaryEntry(id){return this.req(`/api/diary/${id}`,{method:"DELETE"});}
  async getWeeklyStats(){return this.req("/api/diary/stats/weekly");}
  async getMealPlan(){return this.req("/api/mealplan");}
  async generateMealPlan(){return this.req("/api/mealplan/generate",{method:"POST"});}
  async getShopping(){return this.req("/api/shopping");}
  async toggleShopItem(id){return this.req(`/api/shopping/${id}/toggle`,{method:"PATCH"});}
  async getWeightLog(){return this.req("/api/weight");}
  async addWeight(w){return this.req("/api/weight",{method:"POST",body:JSON.stringify({weight:w})});}
  async getStats(){return this.req("/api/stats");}
  async getChatHistory(){return this.req("/api/chat");}
  async sendChat(m){return this.req("/api/chat",{method:"POST",body:JSON.stringify({message:m})});}
  async getDashboard(){return this.req("/api/dashboard");}
}
const api = new Api(); export default api;
