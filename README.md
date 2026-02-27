# 💰 Gastos App - Familia González

App móvil y web para registro de gastos familiares con resúmenes automáticos mensuales vía Telegram.

## 📱 Características

- ✅ **Registro de Gastos** - Añade gastos con categoría, monto y descripción
- 📊 **Resumen Mensual** - Visualiza gastos del mes con filtros y comparativas
- 🗑️ **Eliminar Gastos** - Borra gastos individuales con confirmación
- 📅 **Historial** - Navega entre meses anteriores
- 🔍 **Filtros** - Por categoría y persona
- 📈 **Comparativa** - Compara mes actual con el anterior
- 🤖 **Telegram Bot** - Resumen automático el día 1 a las 7 AM (España)
- 📊 **Gráficos** - Visualización con Chart.js en mensajes de Telegram

## 🏗️ Tecnologías

- **Frontend**: React Native + Expo
- **Backend**: Firebase (Firestore + Auth)
- **Automation**: GitHub Actions (cron cada hora)
- **Notifications**: Telegram Bot API
- **Charts**: Chart.js + chartjs-node-canvas
- **Deploy**: Netlify (web version)

## 🚀 Instalación Local

```bash
# Instalar dependencias
npm install

# Iniciar app
npm start
# o para web
npm run web
```

## 🌐 Web Deployment

App web desplegada en: **gastrosmensualesgonzalez.netlify.app**

```bash
# Build para web
npx expo export -p web

# Deploy automático en push a main (Netlify)
```

## 🤖 Telegram Automation

El bot envía resúmenes automáticos:
- **Cuándo**: Día 1 de cada mes a las 7:00 AM (Europe/Madrid)
- **Cómo**: GitHub Actions ejecuta script cada hora
- **Qué envía**: Gráfico PNG con desglose de gastos

### Configuración (GitHub Secrets)

```
TELEGRAM_BOT_TOKEN=8760402458:AAGZV_jTk7_MjZT2W8Fb5_UYgo9ndkHZDpU
TELEGRAM_CHAT_ID=7449761239
FIREBASE_SERVICE_ACCOUNT=<JSON completo>
FIREBASE_PROJECT_ID=gastos-app-3dfec
TIMEZONE=Europe/Madrid
FORCE_SEND=false
```

## 📂 Estructura

```
GastosApp/
├── App.js                          # Entry point (React Navigation)
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js         # Auth con auto-login
│   │   ├── AddExpenseScreen.js    # Formulario de gastos
│   │   ├── SummaryScreen.js       # Resumen con filtros
│   │   └── SettingsScreen.js      # Config y logout
│   └── config/
│       └── firebase.js            # Configuración Firebase
├── automation/
│   ├── send-summary.js            # Script de Telegram
│   └── package.json               # Deps: firebase-admin, chart.js
├── .github/workflows/
│   └── monthly-summary.yml        # GitHub Actions cron
└── netlify.toml                   # Config deploy web
```

## 🎨 Categorías

1. 🍽️ Comida
2. 🍬 Chucherías  
3. 🏠 Casa
4. 🚗 Transporte
5. 👶 Bebé
6. 👩 Julinda
7. 👨 Vladimir

## 👥 Usuarios

- **Vladimir** (vladimiragb01@gmail.com)
- **Julinda** (hadysanche@gmail.com)

## 🔐 Firebase

- **Project ID**: gastos-app-3dfec
- **Firestore Collection**: `expenses`
- **Auth**: Email/Password

## 📅 Automation Logic

```javascript
// Se ejecuta cada hora
// Revisa si es día 1 a las 7 AM (Europe/Madrid)
if (now.day === 1 && now.hour === 7) {
  // Obtiene gastos del mes anterior
  // Genera gráfico con Chart.js
  // Envía por Telegram
}
```

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm start              # Iniciar Expo
npm run web            # Solo web
npm run android        # Android emulator
npm run ios            # iOS simulator

# Automation (local test)
cd automation
npm install
FORCE_SEND=true node send-summary.js

# Lint
npm run lint
```

## 📝 License

Private - Uso familiar

---

**Última actualización**: Febrero 2026
