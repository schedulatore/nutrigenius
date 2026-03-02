class Api {
  constructor() { this.token = localStorage.getItem("ng-token"); }
  setToken(t) { this.token = t; t ? localStorage.setItem("ng-token", t) : localStorage.removeItem("ng-token"); }
  getToken() { return this.token || localStorage.getItem("ng-token"); }
  async req(path, opts = {}) {
    const h = { "Content-Type": "application/json" };
    const t = this.getToken();
    if (t) h["Authorization"] = "Bearer " + t;
    const r = await fetch(path, { ...opts, headers: { ...h, ...opts.headers } });
    if (r.status === 401) { this.setToken(null); window.location.reload(); }
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Errore");
    return d;
  }
  async register(n, e, p) { const d = await this.req("/api/auth/register", { method: "POST", body: JSON.stringify({ name: n, email: e, password: p }) }); this.setToken(d.token); return d; }
  async login(e, p) { const d = await this.req("/api/auth/login", { method: "POST", body: JSON.stringify({ email: e, password: p }) }); this.setToken(d.token); return d; }
  async getMe() { return this.req("/api/auth/me"); }
  async updateName(name) { return this.req("/api/auth/me", { method: "PATCH", body: JSON.stringify({ name }) }); }
  logout() { this.setToken(null); }
  async getProfile() { return this.req("/api/profile"); }
  async saveProfile(p) { return this.req("/api/profile", { method: "POST", body: JSON.stringify(p) }); }
  async getFoods() { return this.req("/api/foods"); }
  async addFood(f) { return this.req("/api/foods", { method: "POST", body: JSON.stringify(f) }); }
  async updateFood(id, f) { return this.req("/api/foods/" + id, { method: "PUT", body: JSON.stringify(f) }); }
  async deleteFood(id) { return this.req("/api/foods/" + id, { method: "DELETE" }); }
  async getTodayDiary() { return this.req("/api/diary/today"); }
  async addDiaryEntry(e) { return this.req("/api/diary", { method: "POST", body: JSON.stringify(e) }); }
  async updateDiaryEntry(id, e) { return this.req("/api/diary/" + id, { method: "PUT", body: JSON.stringify(e) }); }
  async deleteDiaryEntry(id) { return this.req("/api/diary/" + id, { method: "DELETE" }); }
  async getWeeklyStats() { return this.req("/api/diary/stats/weekly"); }
  async getMealPlan() { return this.req("/api/mealplan"); }
  async generateMealPlan() { return this.req("/api/mealplan/generate", { method: "POST" }); }
  async getShopping() { return this.req("/api/shopping"); }
  async toggleShopItem(id) { return this.req("/api/shopping/" + id + "/toggle", { method: "PATCH" }); }
  async addShopItem(i) { return this.req("/api/shopping", { method: "POST", body: JSON.stringify(i) }); }
  async updateShopItem(id, i) { return this.req("/api/shopping/" + id, { method: "PUT", body: JSON.stringify(i) }); }
  async deleteShopItem(id) { return this.req("/api/shopping/" + id, { method: "DELETE" }); }
  async addWeight(w) { return this.req("/api/weight", { method: "POST", body: JSON.stringify({ weight: w }) }); }
  async getWeight() { return this.req("/api/weight"); }
  async sendChat(m) { return this.req("/api/chat", { method: "POST", body: JSON.stringify({ message: m }) }); }
  async getChatHistory() { return this.req("/api/chat"); }
  async getDashboard() { return this.req("/api/dashboard"); }
  async getChallenges() { return this.req("/api/challenges"); }
  async updateChallengeProgress(id, progress) { return this.req("/api/challenges/" + id + "/progress", { method: "POST", body: JSON.stringify({ progress }) }); }
}
const api = new Api();
export default api;
