// services/adminNotificationService.js
// Admin Notification Service - Daily & Weekly Summary Emails

const { MongoClient } = require("mongodb");
const sendEmail = require("./mailer");
require("dotenv").config();

// Admin Email (from environment or fallback)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

/**
 * Generate and send daily admin summary email
 */
async function sendDailyAdminSummary() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db("contract_ai");

    console.log("📊 [ADMIN] Generiere Daily Summary...");

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Collect statistics
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    const costTrackingCollection = db.collection("cost_tracking");
    const deletedAccountsCollection = db.collection("deleted_accounts");

    // New registrations today
    const newUsersToday = await usersCollection.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Total users
    const totalUsers = await usersCollection.countDocuments({});

    // Users by plan
    const planCounts = await usersCollection.aggregate([
      { $group: { _id: "$subscriptionPlan", count: { $sum: 1 } } }
    ]).toArray();
    const planBreakdown = {};
    planCounts.forEach(p => { planBreakdown[p._id || 'free'] = p.count; });

    // New contracts today
    const newContractsToday = await contractsCollection.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // API costs today (USD to EUR)
    const todayStr = today.toISOString().split('T')[0];
    const costData = await costTrackingCollection.aggregate([
      { $match: { date: todayStr } },
      { $group: { _id: null, totalCost: { $sum: "$cost" }, totalCalls: { $sum: 1 } } }
    ]).toArray();
    const todayCostUSD = costData[0]?.totalCost || 0;
    const todayCostEUR = (todayCostUSD * 0.92).toFixed(2);
    const todayCalls = costData[0]?.totalCalls || 0;

    // Deleted accounts today
    const deletedToday = await deletedAccountsCollection.countDocuments({
      accountDeletedAt: { $gte: today, $lt: tomorrow }
    });

    // Verified users today
    const verifiedToday = await usersCollection.countDocuments({
      verified: true,
      verifiedAt: { $gte: today, $lt: tomorrow }
    });

    // Users who logged in today
    const activeUsersToday = await usersCollection.countDocuments({
      lastLoginAt: { $gte: today, $lt: tomorrow }
    });

    // Build email content
    const dateStr = today.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `📊 Contract AI Daily Report - ${today.toLocaleDateString('de-DE')}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: #f1f5f9; border-radius: 10px; padding: 15px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .stat-highlight { background: #dbeafe; }
    .stat-success { background: #dcfce7; }
    .stat-warning { background: #fef3c7; }
    .stat-danger { background: #fee2e2; }
    .section { margin-top: 25px; }
    .section h3 { margin: 0 0 15px; font-size: 16px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .plan-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .plan-name { font-weight: 500; }
    .plan-count { color: #64748b; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Contract AI</h1>
      <p>Daily Admin Report - ${dateStr}</p>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card stat-highlight">
          <div class="stat-value">${newUsersToday}</div>
          <div class="stat-label">Neue User heute</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-value">${activeUsersToday}</div>
          <div class="stat-label">Aktive User heute</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${newContractsToday}</div>
          <div class="stat-label">Neue Verträge</div>
        </div>
        <div class="stat-card ${deletedToday > 0 ? 'stat-danger' : ''}">
          <div class="stat-value">${deletedToday}</div>
          <div class="stat-label">Gelöschte Accounts</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-value">${todayCostEUR} €</div>
          <div class="stat-label">API Kosten heute</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${todayCalls}</div>
          <div class="stat-label">API Calls</div>
        </div>
      </div>

      <div class="section">
        <h3>Gesamtübersicht</h3>
        <div class="plan-row">
          <span class="plan-name">Gesamt User</span>
          <span class="plan-count">${totalUsers}</span>
        </div>
        <div class="plan-row">
          <span class="plan-name">Free</span>
          <span class="plan-count">${planBreakdown.free || 0}</span>
        </div>
        <div class="plan-row">
          <span class="plan-name">Business</span>
          <span class="plan-count">${planBreakdown.business || 0}</span>
        </div>
        <div class="plan-row">
          <span class="plan-name">Premium</span>
          <span class="plan-count">${planBreakdown.premium || 0}</span>
        </div>
        <div class="plan-row">
          <span class="plan-name">Legendary</span>
          <span class="plan-count">${planBreakdown.legendary || 0}</span>
        </div>
      </div>

      <a href="https://contract-ai.de/dashboard" class="cta-button">Admin Dashboard öffnen</a>
    </div>
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
      <p>Contract AI Admin System</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Contract AI Daily Report - ${dateStr}

TAGESSTATISTIKEN:
- Neue User heute: ${newUsersToday}
- Aktive User heute: ${activeUsersToday}
- Neue Verträge: ${newContractsToday}
- Gelöschte Accounts: ${deletedToday}
- API Kosten: ${todayCostEUR} EUR (${todayCalls} Calls)

GESAMTÜBERSICHT:
- Gesamt User: ${totalUsers}
- Free: ${planBreakdown.free || 0}
- Business: ${planBreakdown.business || 0}
- Premium: ${planBreakdown.premium || 0}
- Legendary: ${planBreakdown.legendary || 0}

Dashboard: https://contract-ai.de/dashboard
    `;

    // Send email
    await sendEmail(ADMIN_EMAIL, subject, textContent, htmlContent);
    console.log(`✅ [ADMIN] Daily Summary gesendet an ${ADMIN_EMAIL}`);

    return { success: true, sentTo: ADMIN_EMAIL };

  } catch (error) {
    console.error("❌ [ADMIN] Fehler beim Daily Summary:", error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Generate and send weekly admin summary email (more detailed)
 */
async function sendWeeklyAdminSummary() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db("contract_ai");

    console.log("📊 [ADMIN] Generiere Weekly Summary...");

    // Get this week's date range (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);

    // Get last week for comparison
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);

    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    const costTrackingCollection = db.collection("cost_tracking");
    const deletedAccountsCollection = db.collection("deleted_accounts");

    // This week stats
    const newUsersThisWeek = await usersCollection.countDocuments({
      createdAt: { $gte: monday, $lt: sunday }
    });

    const newUsersLastWeek = await usersCollection.countDocuments({
      createdAt: { $gte: lastMonday, $lt: monday }
    });

    const newContractsThisWeek = await contractsCollection.countDocuments({
      createdAt: { $gte: monday, $lt: sunday }
    });

    const deletedThisWeek = await deletedAccountsCollection.countDocuments({
      accountDeletedAt: { $gte: monday, $lt: sunday }
    });

    // Total users and growth
    const totalUsers = await usersCollection.countDocuments({});
    const userGrowth = newUsersThisWeek - newUsersLastWeek;
    const growthPercent = newUsersLastWeek > 0 ? ((userGrowth / newUsersLastWeek) * 100).toFixed(1) : 0;

    // Weekly costs
    const mondayStr = monday.toISOString().split('T')[0];
    const costData = await costTrackingCollection.aggregate([
      { $match: { date: { $gte: mondayStr } } },
      { $group: { _id: null, totalCost: { $sum: "$cost" }, totalCalls: { $sum: 1 } } }
    ]).toArray();
    const weeklyCostUSD = costData[0]?.totalCost || 0;
    const weeklyCostEUR = (weeklyCostUSD * 0.92).toFixed(2);
    const weeklyCalls = costData[0]?.totalCalls || 0;

    // Plan distribution
    const planCounts = await usersCollection.aggregate([
      { $group: { _id: "$subscriptionPlan", count: { $sum: 1 } } }
    ]).toArray();

    // Conversion rate - ✅ KORRIGIERT: enterprise statt premium + legacy "premium" User
    const paidUsers = planCounts.filter(p => ['business', 'enterprise', 'premium', 'legendary'].includes(p._id))
                                 .reduce((sum, p) => sum + p.count, 0);
    const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : 0;

    // Most active users this week
    const mostActiveUsers = await usersCollection.find({
      lastLoginAt: { $gte: monday }
    }).sort({ analysisCount: -1 }).limit(5).toArray();

    const dateRange = `${monday.toLocaleDateString('de-DE')} - ${today.toLocaleDateString('de-DE')}`;
    const subject = `📊 Contract AI Weekly Report - KW ${getWeekNumber(today)}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .highlight-box { background: linear-gradient(135deg, #dbeafe, #e0e7ff); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px; }
    .highlight-value { font-size: 48px; font-weight: 700; color: #1e40af; }
    .highlight-label { font-size: 14px; color: #64748b; }
    .growth { font-size: 14px; margin-top: 5px; }
    .growth.positive { color: #16a34a; }
    .growth.negative { color: #dc2626; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }
    .stat-card { background: #f1f5f9; border-radius: 10px; padding: 15px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 11px; color: #64748b; margin-top: 5px; }
    .section { margin-top: 25px; }
    .section h3 { margin: 0 0 15px; font-size: 16px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .user-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .user-email { font-size: 13px; color: #374151; max-width: 60%; overflow: hidden; text-overflow: ellipsis; }
    .user-stats { font-size: 12px; color: #64748b; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Contract AI</h1>
      <p>Weekly Admin Report - KW ${getWeekNumber(today)}</p>
      <p style="font-size: 12px; opacity: 0.8;">${dateRange}</p>
    </div>
    <div class="content">
      <div class="highlight-box">
        <div class="highlight-value">${totalUsers}</div>
        <div class="highlight-label">Gesamte User</div>
        <div class="growth ${userGrowth >= 0 ? 'positive' : 'negative'}">
          ${userGrowth >= 0 ? '↑' : '↓'} ${Math.abs(userGrowth)} diese Woche (${growthPercent}%)
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${newUsersThisWeek}</div>
          <div class="stat-label">Neue User</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${newContractsThisWeek}</div>
          <div class="stat-label">Neue Verträge</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${deletedThisWeek}</div>
          <div class="stat-label">Gelöscht</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${weeklyCostEUR}€</div>
          <div class="stat-label">API Kosten</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${weeklyCalls}</div>
          <div class="stat-label">API Calls</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${conversionRate}%</div>
          <div class="stat-label">Conversion</div>
        </div>
      </div>

      ${mostActiveUsers.length > 0 ? `
      <div class="section">
        <h3>Top 5 Aktivste User diese Woche</h3>
        ${mostActiveUsers.map((user, i) => `
          <div class="user-row">
            <span class="user-email">${i + 1}. ${user.email}</span>
            <span class="user-stats">${user.analysisCount || 0} Analysen • ${user.subscriptionPlan || 'free'}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <a href="https://contract-ai.de/dashboard" class="cta-button">Admin Dashboard öffnen</a>
    </div>
    <div class="footer">
      <p>Diese E-Mail wurde automatisch generiert.</p>
      <p>Contract AI Admin System</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Contract AI Weekly Report - KW ${getWeekNumber(today)}
${dateRange}

WOCHENSTATISTIKEN:
- Neue User: ${newUsersThisWeek} (${userGrowth >= 0 ? '+' : ''}${userGrowth} vs. Vorwoche)
- Neue Verträge: ${newContractsThisWeek}
- Gelöschte Accounts: ${deletedThisWeek}
- API Kosten: ${weeklyCostEUR} EUR (${weeklyCalls} Calls)
- Conversion Rate: ${conversionRate}%

GESAMT: ${totalUsers} User

Dashboard: https://contract-ai.de/dashboard
    `;

    await sendEmail(ADMIN_EMAIL, subject, textContent, htmlContent);
    console.log(`✅ [ADMIN] Weekly Summary gesendet an ${ADMIN_EMAIL}`);

    return { success: true, sentTo: ADMIN_EMAIL };

  } catch (error) {
    console.error("❌ [ADMIN] Fehler beim Weekly Summary:", error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Helper: Get ISO week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  sendDailyAdminSummary,
  sendWeeklyAdminSummary
};
