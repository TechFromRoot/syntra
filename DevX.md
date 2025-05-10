# Developer Experience: Syntra - Real-Time Trading & Wallet Insight Bot

## 🧠 Project Overview

**Syntra** is a Telegram-based bot designed to deliver **real-time wallet tracking**, **token insights**, and **transaction alerts** to on-chain users. Powered by the **Vybe blockchain data API**, Syntra simplifies the trading experience by enabling users to monitor wallet activity, token swaps, and gas usage directly from Telegram — all with low latency and a developer-friendly interface.

Built during a Redacted hackathon, the goal was to create a lightweight, fast, and extensible bot that could evolve into a broader trading assistant.

---

## ⚙️ Tech Stack

- **Platform**: Telegram Bot
- **Backend**: Node.js + WebSocket (Vybe API) + raydium API
- **Hosting**: Render (initial) → VPS (final)
- **Data Provider**: Vybe API & WebSocket
- **Other Tools**: Axios, Express, PM2

---

## 🚀 Key Features Built

- 🔄 **Real-Time Wallet Tracking**: Syntra listens to token transfers and swap events for watched wallets.
- 📡 **Token Insights Engine**: Pulls token name, age, platform (Uniswap v2/v3), and volume from Vybe API.
- 🛠️ **WebSocket Integration**: Consumes live on-chain data to ensure minimal delay for transaction updates.
- 📬 **Telegram Notification System**: Sends digestible alerts to users when tracked events occur.

---

## 🧩 Challenges Faced

### 1. 🔌 Vybe Integration

Vybe’s documentation was exceptionally clear and well-structured, which made the initial integration process smooth and efficient. The Vybe team’s attention to detail in their API design and documentation deserves special recognition. While leveraging advanced features (like multi-filtering swap events for a wallet address) required some experimentation, the support and clarity provided by Vybe’s resources made it manageable.

### 2. 🌐 WebSocket Reliability

Vybe’s WebSocket stream introduced real-time functionality, but challenges arose:

- **Connection Stability**: Dropped connections under high-load conditions.
- **Update Inconsistency**: Free-tier hosting environments failed to maintain persistent connections, resulting in data loss or delays.

### 3. 🚫 Free-Tier Hosting Limitations

Initial deployment on Render exposed infrastructure constraints:

- **Resource Throttling**: WebSocket performance was degraded under limited memory/CPU.
- **Downtime & Sleep Modes**: Cold starts delayed time-sensitive alerts.
- **Scalability Roadblocks**: Free-tier scaling was not feasible for concurrent user tracking.

### 4. 🐢 API Latency

Vybe's REST API introduced occasional lag:

- **Delayed Data Fetching**: Swap detail calls were not always real-time due to cold starts and latency.
- **User Experience Impact**: In a trading context, even seconds of delay affect decision-making.

---

## 🛠️ Solution: Migrating to VPS Hosting

To ensure consistent real-time delivery, Syntra was migrated to a VPS environment:

- ✅ **Persistent WebSocket Connections**: No longer dropped during traffic spikes.
- 🚀 **Faster Response Time**: Reduced latency for Vybe REST API calls.
- 📈 **Scalability**: Easy resource upgrades enabled tracking more wallets and events.
- 🔒 **Production-Like Environment**: Allowed tighter control over Node.js process management and logging.

---

## 📚 Lessons Learned

- **Vybe API Is a Game-Changer**: The Vybe team’s commitment to providing a robust and developer-friendly API significantly accelerated development and enabled real-time functionality with ease.
- **Good Documentation Accelerates Development**: Vybe’s docs helped get started quickly, but edge cases still required digging.
- **Free Hosting Isn’t Always Free**: Real-time systems demand uptime and consistent performance that free-tier services rarely offer.
- **Latency Matters**: API response delays can ruin a user experience, especially in trading scenarios.
- **Infrastructure Is a Feature**: Planning your hosting early saves time and ensures production readiness.

---

## 🏁 Conclusion

Despite the initial roadblocks with WebSocket stability and hosting limitations, **Syntra** successfully evolved into a stable real-time trading assistant through thoughtful infrastructure decisions and the exceptional support provided by Vybe's API. This experience reinforced the importance of building with scale, performance, and user impact in mind — even during fast-paced hackathon environments.

---

## 🙌 Next Steps

- Add MEV bot detection alerts
- Create a user dashboard for wallet watchlists
- Integrate additional DeFi platforms
