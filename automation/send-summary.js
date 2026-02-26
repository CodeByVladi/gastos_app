const axios = require("axios");
const admin = require("firebase-admin");
const { DateTime } = require("luxon");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const TIMEZONE = process.env.TIMEZONE || "America/Los_Angeles";
const FORCE_SEND = process.env.FORCE_SEND === "true";

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("Faltan variables TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
}

if (!FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("Falta FIREBASE_SERVICE_ACCOUNT (JSON del service account)");
}

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: FIREBASE_PROJECT_ID || serviceAccount.project_id,
});

const db = admin.firestore();

const CATEGORIES = ["Comida", "Chucherías", "Transporte", "Bebé", "Julinda", "Vladimir"];

function shouldSendNow() {
  // MODO TEST: Siempre envía para probar
  if (FORCE_SEND) return true;
  
  const now = DateTime.now().setZone(TIMEZONE);
  return now.day === 1 && now.hour === 7;
}

function getPreviousMonthRange() {
  const now = DateTime.now().setZone(TIMEZONE);
  const previous = now.minus({ months: 1 });
  const start = previous.startOf("month").toUTC().toISO();
  const end = previous.endOf("month").toUTC().toISO();
  return { start, end, previous };
}

function formatMonthName(dateTime) {
  return dateTime.setLocale("es").toFormat("LLLL yyyy");
}

async function fetchExpenses(start, end) {
  const snapshot = await db
    .collection("expenses")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const expenses = [];
  snapshot.forEach((doc) => {
    expenses.push(doc.data());
  });
  return expenses;
}

function buildSummary(expenses, monthLabel) {
  const totals = {};
  CATEGORIES.forEach((category) => {
    totals[category] = 0;
  });

  let grandTotal = 0;
  expenses.forEach((expense) => {
    if (totals.hasOwnProperty(expense.category)) {
      totals[expense.category] += Number(expense.amount || 0);
    }
    grandTotal += Number(expense.amount || 0);
  });

  let summary = `📊 Resumen de ${monthLabel}\n\n`;
  CATEGORIES.forEach((category) => {
    summary += `🔹 ${category}: $${totals[category].toFixed(2)}\n`;
  });
  summary += `\n━━━━━━━━━━━━━━━━━━━\n💰 TOTAL: $${grandTotal.toFixed(2)}`;

  return summary;
}

async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text,
  });
}

(async () => {
  if (!FORCE_SEND && !shouldSendNow()) {
    console.log("No es día 1 a las 7 AM. No se envía mensaje.");
    return;
  }

  console.log("Enviando resumen mensual...");

  const { start, end, previous } = getPreviousMonthRange();
  const expenses = await fetchExpenses(start, end);
  
  console.log(`Encontrados ${expenses.length} gastos`);
  
  const monthLabel = formatMonthName(previous);
  
  // Si no hay gastos, enviar mensaje de prueba
  if (expenses.length === 0) {
    const testMessage = `🤖 Prueba de Bot - ${monthLabel}\n\n✅ El bot está funcionando correctamente.\n\n📝 No hay gastos registrados para este mes.\n\n💡 Agrega gastos en la app para ver el resumen.`;
    await sendTelegramMessage(testMessage);
    console.log("Mensaje de prueba enviado (sin gastos)");
    return;
  }
  
  const summary = buildSummary(expenses, monthLabel);

  await sendTelegramMessage(summary);
})();
