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

let db = null;

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
  if (FORCE_SEND) {
    console.log("FORCE_SEND activado - enviando mensaje");
    return true;
  }
  
  const now = DateTime.now().setZone(TIMEZONE);
  const shouldSend = now.day === 1 && now.hour === 7;
  
  console.log(`Verificando si debe enviar: día=${now.day}, hora=${now.hour}, shouldSend=${shouldSend}`);
  
  return shouldSend;
}

function getRuntimeConfig() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID. Se omite ejecución.");
    return null;
  }

  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.log("Falta FIREBASE_SERVICE_ACCOUNT. Se omite ejecución.");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    return { serviceAccount };
  } catch (_error) {
    console.log("FIREBASE_SERVICE_ACCOUNT no es JSON válido. Se omite ejecución.");
    return null;
  }
}

function ensureFirebaseInitialized(serviceAccount) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
  }

  db = admin.firestore();
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

  const canvasRenderService = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: 'white'
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
      layout: {
        padding: 20
      },
      plugins: {
        title: {
          display: true,
          text: `Resumen de ${monthLabel}`,
          font: {
            size: 24,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          },
          color: '#333'
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 15,
            font: {
              size: 14
            },
            color: '#333'
          }
        }
      }
    }
  };

  const imageBuffer = await canvasRenderService.renderToBuffer(chartConfig);
  
  return { imageBuffer, grandTotal, totals };
}

async function sendTelegramChart(imageBuffer, monthLabel, grandTotal, totals) {
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
  form.append("photo", imageBuffer, {
    filename: "gastos-chart.png",
    contentType: "image/png"
  });
  form.append("caption", caption);
  form.append("parse_mode", "HTML");

  await axios.post(url, form, {
    headers: form.getHeaders()
  });
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
  console.log("=== Iniciando script de resumen mensual ===");
  console.log(`Timezone: ${TIMEZONE}`);
  console.log(`FORCE_SEND: ${FORCE_SEND}`);
  console.log(`TELEGRAM_BOT_TOKEN configurado: ${!!TELEGRAM_BOT_TOKEN}`);
  console.log(`TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID}`);
  
  if (!shouldSendNow()) {
    console.log("❌ No es momento de enviar. Script finalizado.");
    return;
  }

  const runtimeConfig = getRuntimeConfig();
  if (!runtimeConfig) {
    console.log("❌ Configuración inválida. Script finalizado.");
    return;
  }

  ensureFirebaseInitialized(runtimeConfig.serviceAccount);

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
    const { imageBuffer, grandTotal, totals } = await generateChart(expenses, monthLabel);
    await sendTelegramChart(imageBuffer, monthLabel, grandTotal, totals);
    console.log("✅ Gráfico enviado exitosamente");
  } catch (error) {
    console.error("❌ Error generando gráfico:", error.message);
    console.error("Stack trace:", error.stack);
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
    console.log("📝 Mensaje de texto enviado (fallo en gráfico)");
  }
})();

