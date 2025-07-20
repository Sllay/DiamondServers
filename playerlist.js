// playerlist.js
// Versão segura usando bcryptjs (sem dependências nativas)

//const bcrypt = require("bcryptjs"); // hashing puro em JS
const codes = {};   // Map email -> código
const users = {};   // Map email -> { email, hash }

module.exports = {
  async register(email, password) {
    if (users[email]) return false;
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    users[email] = { email, hash };
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes[email] = code;
    console.log(`Código para ${email}: ${code}`);
    // TODO: integrar envio de e-mail usando API tipo SendGrid/Mailgun
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
    // Pode implementar limpeza se necessário
  }
};
