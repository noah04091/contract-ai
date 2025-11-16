// 📁 backend/middleware/verifyAdmin.js
// Admin Role Verification Middleware

const { MongoClient, ObjectId } = require('mongodb');

/**
 * Middleware to verify that the authenticated user has admin role
 * IMPORTANT: Must be used AFTER verifyToken middleware
 *
 * Usage:
 * router.get('/admin-only', verifyToken, verifyAdmin, (req, res) => { ... });
 */
const verifyAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated (verifyToken should run first)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const usersCollection = client.db('contract_ai').collection('users');

    // Get user from database
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { role: 1, email: 1 } }
    );

    await client.close();

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      console.warn(`⚠️ [ADMIN-CHECK] Unauthorized access attempt by user ${user.email} (${req.user.userId})`);
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert. Nur Administratoren haben Zugriff auf diese Ressource.',
        error: 'ADMIN_REQUIRED'
      });
    }

    // User is admin - attach role to request for future use
    req.user.role = user.role;
    req.user.email = user.email;

    console.log(`✅ [ADMIN-CHECK] Admin access granted for ${user.email}`);

    next();

  } catch (error) {
    console.error('❌ [ADMIN-CHECK] Error verifying admin role:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler bei der Admin-Verifizierung',
      error: error.message
    });
  }
};

module.exports = verifyAdmin;
