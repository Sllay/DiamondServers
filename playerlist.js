// playerlist.js
// banco simples em memória + códigos de verificação
const bcrypt = require("bcrypt");
const codes = {};   // email -> code
const users = {};   // email -> { email, hash }

module.exports = {
  async register(email, password) {
    if (users[email]) return false;
    const hash = await bcrypt.hash(password, 10);
    users[email] = { email, hash };
    // gerar código e (aqui) enviar por e-mail via API externa
    const code = Math.floor(100000 + Math.random()*900000).toString();
    codes[email] = code;
    console.log(`Código para ${email}: ${code}`);
    // TODO: chamar API de e-mail para envio real
    return true;
  },

  async login(email, password) {
    const u = users[email];
    if (!u) return null;
    const ok = await bcrypt.compare(password, u.hash);
    return ok ? { email } : null;
  },

  async confirmCode(email, code) {
    if (codes[email] && codes[email] === code) {
      delete codes[email];
      return true;
    }
    return false;
  },

  remove(id) {
    // nada a fazer aqui por enquanto
  }
};