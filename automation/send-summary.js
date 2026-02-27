const axios = require("axios");
const admin = require("firebase-admin");
const { DateTime } = require("luxon");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const fs = require("fs");
const path = require("path");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const TIMEZONE = process.env.TIMEZONE || "Europe/Madrid";
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

const CATEGORIES = ["Comida", "Chucherías", "Casa", "Transporte", "Bebé", "Julinda", "Vladimir"];

const categoryEmojis = {
  "Comida": "🍽️",
  "Chucherías": "🍬",
  "Casa": "🏠",
  "Transporte": "🚗",
  "Bebé": "👶",
  "Julinda": "👩",
  "Vladimir": "👨"
};

const categoryColors = {
  "Comida": "#FF6B6B",
  "Chucherías": "#FFD93D",
  "Casa": "#6BCB77",
  "Transporte": "#4D96FF",
  "Bebé": "#FF9FF3",
  "Julinda": "#A29BFE",
  "Vladimir": "#74B9FF"
};

function shouldSendNow() {
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

  return { totals, grandTotal };
}

async function generateChart(expenses, monthLabel) {
  const { totals, grandTotal } = buildSummary(expenses, monthLabel);

  // Filtrar solo categorías con gasto
  const dataCategories = CATEGORIES.filter(cat => totals[cat] > 0);
  const dataValues = dataCategories.map(cat => totals[cat]);
  const dataColors = dataCategories.map(cat => categoryColors[cat]);

  const width = 800;
  const height = 600;
  const chartCallback = (ChartJS) => {
    ChartJS.defaults.responsive = false;
    ChartJS.defaults.maintainAspectRatio = false;
    ChartJS.defaults.plugins.legend.position = "bottom";
    ChartJS.defaults.plugins.legend.labels.font.size = 14;
    ChartJS.defaults.plugins.legend.labels.padding = 20;
  };

  const canvasRenderService = new ChartJSNodeCanvas({
    width,
    height,
    chartCallback
  });

  const chartConfig = {
    type: "doughnut",
    data: {
      labels: dataCategories.map(cat => `${categoryEmojis[cat]} ${cat}`),
      datasets: [
        {
          data: dataValues,
          backgroundColor: dataColors,
          borderColor: "#fff",
          borderWidth: 3,
          hoverBorderWidth: 5
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Resumen de ${monthLabel}`,
          font: {
            size: 20,
            weight: "bold"
          },
          padding: {
            bottom: 30
          }
        },
        legend: {
          display: true,
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 20
          }
        }
      }
    }
  };

  const image = await canvasRenderService.renderToBuffer(chartConfig);
  
  // Guardar imagen temporalmente
  const imagePath = path.join("/tmp", "gastos-chart.png");
  fs.writeFileSync(imagePath, image);
  
  return { imagePath, grandTotal, totals };
}

async function sendTelegramChart(imagePath, monthLabel, grandTotal, totals) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  // Crear caption con información
  const sortedCategories = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, amount]) => amount > 0);

  let caption = `<b>💰 TOTAL: $${grandTotal.toFixed(2)}</b>\n\n`;
  caption += `<b>📋 Desglose:</b>\n`;
  
  sortedCategories.forEach(([category, amount]) => {
    const emoji = categoryEmojis[category];
    caption += `${emoji} ${category.padEnd(12)} $${amount.toFixed(2)}\n`;
  });
  
  caption += `\n📅 ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;

  const FormData = require('form-data');
  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("photo", fs.createReadStream(imagePath));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");

  await axios.post(url, form, {
    headers: form.getHeaders()
  });

  // Limpiar archivo temporal
  fs.unlinkSync(imagePath);
}

async function sendTelegramTextMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML"
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
  
  if (expenses.length === 0) {
    const testMessage = `📊 Resumen de ${monthLabel}\n\n📝 No hay gastos registrados para este mes.`;
    await sendTelegramTextMessage(testMessage);
    console.log("Mensaje enviado (sin gastos)");
    return;
  }
  
  try {
    const { imagePath, grandTotal, totals } = await generateChart(expenses, monthLabel);
    await sendTelegramChart(imagePath, monthLabel, grandTotal, totals);
    console.log("Gráfico enviado exitosamente");
  } catch (error) {
    console.error("Error generando gráfico:", error.message);
    const { totals, grandTotal } = buildSummary(expenses, monthLabel);
    const sortedCategories = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, amount]) => amount > 0);
    
    let textMessage = `📊 <b>Resumen de ${monthLabel}</b>\n\n`;
    
    sortedCategories.forEach(([category, amount]) => {
      const emoji = categoryEmojis[category];
      textMessage += `${emoji} ${category}: $${amount.toFixed(2)}\n`;
    });
    
    textMessage += `\n💰 <b>TOTAL: $${grandTotal.toFixed(2)}</b>`;
    await sendTelegramTextMessage(textMessage);
    console.log("Mensaje de texto enviado (fallo en gráfico)");
  }
})();

