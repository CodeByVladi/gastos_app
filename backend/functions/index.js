/* global Intl */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// Configuración de Telegram
const TELEGRAM_BOT_TOKEN = "8760402458:AAGZV_jTk7_MjZT2W8Fb5_UYgo9ndkHZDpU";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Enviar resumen el día 1 de cada mes a las 7 AM
exports.sendMonthlySummary = functions.pubsub
  .schedule("0 7 1 * *")
  .timeZone("Europe/Madrid")
  .onRun(async () => {
    try {
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstDay = new Date(
        previousMonth.getFullYear(),
        previousMonth.getMonth(),
        1,
      );
      const lastDay = new Date(
        previousMonth.getFullYear(),
        previousMonth.getMonth() + 1,
        0,
      );

      const db = admin.firestore();
      const expensesSnapshot = await db
        .collection("expenses")
        .where("createdAt", ">=", firstDay.toISOString())
        .where("createdAt", "<=", lastDay.toISOString())
        .get();

      const categories = [
        "Comida",
        "Transporte",
        "Bebé",
        "Julinda",
        "Vladimir",
      ];
      const categoryTotals = {};
      let grandTotal = 0;

      categories.forEach((category) => {
        categoryTotals[category] = 0;
      });

      expensesSnapshot.forEach((doc) => {
        const expense = doc.data();
        if (categoryTotals.hasOwnProperty(expense.category)) {
          categoryTotals[expense.category] += expense.amount;
        }
        grandTotal += expense.amount;
      });

      const monthName = new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
      }).format(previousMonth);

      let summaryText = `📊 Resumen de ${
        monthName.charAt(0).toUpperCase() + monthName.slice(1)
      }\n\n`;

      categories.forEach((category) => {
        summaryText += `🔹 ${category}: $${categoryTotals[category].toFixed(2)}\n`;
      });

      summaryText += `\n━━━━━━━━━━━━━━━━━━━\n💰 TOTAL: $${grandTotal.toFixed(2)}`;

      const configSnapshot = await db
        .collection("config")
        .doc("telegram")
        .get();
      const chatId = configSnapshot.data()?.chatId;

      if (!chatId) {
        return null;
      }

      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: summaryText,
      });

      return null;
    } catch (error) {
      throw new Error(`Error en sendMonthlySummary: ${error.message}`);
    }
  });

// Webhook de Telegram
exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const message = req.body.message;

    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.toLowerCase();

    if (text === "/start") {
      const db = admin.firestore();
      await db.collection("config").doc("telegram").set({
        chatId: chatId,
        userId: message.from.id,
        firstName: message.from.first_name,
        updatedAt: new Date().toISOString(),
      });

      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: "✅ ¡Conectado! Recibirás el resumen el día 1 de cada mes a las 7 AM.",
      });
    } else if (text === "/resumen") {
      const db = admin.firestore();
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const expensesSnapshot = await db
        .collection("expenses")
        .where("createdAt", ">=", firstDay.toISOString())
        .where("createdAt", "<=", lastDay.toISOString())
        .get();

      const categories = [
        "Comida",
        "Transporte",
        "Bebé",
        "Julinda",
        "Vladimir",
      ];
      const categoryTotals = {};
      let grandTotal = 0;

      categories.forEach((category) => {
        categoryTotals[category] = 0;
      });

      expensesSnapshot.forEach((doc) => {
        const expense = doc.data();
        if (categoryTotals.hasOwnProperty(expense.category)) {
          categoryTotals[expense.category] += expense.amount;
        }
        grandTotal += expense.amount;
      });

      const monthName = new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
      }).format(now);

      let summaryText = `📊 Resumen de ${
        monthName.charAt(0).toUpperCase() + monthName.slice(1)
      }\n\n`;

      categories.forEach((category) => {
        summaryText += `🔹 ${category}: $${categoryTotals[category].toFixed(2)}\n`;
      });

      summaryText += `\n━━━━━━━━━━━━━━━━━━━\n💰 TOTAL: $${grandTotal.toFixed(2)}`;

      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: summaryText,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
