// 📁 backend/config/database.js
// ZENTRALE MongoDB-Verbindung — EINZIGE Stelle mit new MongoClient() im gesamten Projekt
const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnecting = false;
    this.connectionPromise = null;
    // 🔄 Reconnect-Konfiguration
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelayMs = 1000; // 1 Sekunde
    this.maxReconnectDelayMs = 30000; // 30 Sekunden
    this.isReconnecting = false;
    // 📊 Pool-Monitoring (aggregiert, kein Event-Spam)
    this._poolStats = {
      created: 0,
      closed: 0,
      checkedOut: 0,
      checkedIn: 0,
      checkOutFailed: 0,
      timeouts: 0,
      totalOperations: 0,
      lastReset: Date.now()
    };
    this._monitorInterval = null;
  }

  async connect() {
    // Wenn bereits verbunden, gib DB zurück
    if (this.db && this.client) {
      return this.db;
    }

    // Verhindere gleichzeitige Verbindungsversuche
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this._establishConnection();

    try {
      const db = await this.connectionPromise;
      this.isConnecting = false;
      return db;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  async _establishConnection() {
    try {
      const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
      
      this.client = new MongoClient(MONGO_URI, {
        maxPoolSize: 30,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 30000,
        family: 4,
        monitorCommands: false
      });

      await this.client.connect();
      this.db = this.client.db('contract_ai');

      // 🔄 Reset reconnect counter bei erfolgreichem Connect
      this.reconnectAttempts = 0;
      console.log('✅ Database (Singleton-Pool) connected — maxPoolSize: 30');

      // 📊 Pool-Monitoring Events (nur zählen, nicht loggen)
      this.client.on('connectionCreated', () => { this._poolStats.created++; });
      this.client.on('connectionClosed', () => { this._poolStats.closed++; });
      this.client.on('connectionCheckedOut', () => { this._poolStats.checkedOut++; this._poolStats.totalOperations++; });
      this.client.on('connectionCheckedIn', () => { this._poolStats.checkedIn++; });
      this.client.on('connectionCheckOutFailed', () => { this._poolStats.checkOutFailed++; });

      // 📊 Aggregiertes Monitoring alle 60s (kein Event-Spam)
      this._startMonitoring();

      // Handle connection events
      this.client.on('error', (error) => {
        console.error('❌ Database connection error:', error.message);
        this._poolStats.timeouts++;
        this._scheduleReconnect();
      });

      this.client.on('close', () => {
        console.log('📴 Database connection closed unexpectedly');
        this.client = null;
        this.db = null;
        if (!this.isReconnecting) {
          this._scheduleReconnect();
        }
      });

      return this.db;
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      this.client = null;
      this.db = null;
      throw error;
    }
  }

  async getCollection(collectionName) {
    const db = await this.connect();
    return db.collection(collectionName);
  }

  async findOne(collectionName, query, options = {}) {
    const collection = await this.getCollection(collectionName);
    return collection.findOne(query, options);
  }

  async find(collectionName, query = {}, options = {}) {
    const collection = await this.getCollection(collectionName);
    return collection.find(query, options).toArray();
  }

  async insertOne(collectionName, document) {
    const collection = await this.getCollection(collectionName);
    return collection.insertOne(document);
  }

  async insertMany(collectionName, documents) {
    const collection = await this.getCollection(collectionName);
    return collection.insertMany(documents);
  }

  async updateOne(collectionName, query, update, options = {}) {
    const collection = await this.getCollection(collectionName);
    return collection.updateOne(query, update, options);
  }

  async updateMany(collectionName, query, update, options = {}) {
    const collection = await this.getCollection(collectionName);
    return collection.updateMany(query, update, options);
  }

  async deleteOne(collectionName, query) {
    const collection = await this.getCollection(collectionName);
    return collection.deleteOne(query);
  }

  async deleteMany(collectionName, query) {
    const collection = await this.getCollection(collectionName);
    return collection.deleteMany(query);
  }

  async countDocuments(collectionName, query = {}) {
    const collection = await this.getCollection(collectionName);
    return collection.countDocuments(query);
  }

  async aggregate(collectionName, pipeline, options = {}) {
    const collection = await this.getCollection(collectionName);
    return collection.aggregate(pipeline, options).toArray();
  }

  async close() {
    if (this.client) {
      this._stopMonitoring();
      this.isReconnecting = true;
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      console.log('📴 Database (Singleton-Pool) closed');
    }
  }

  // 🔄 Automatischer Reconnect mit Exponential Backoff
  async _scheduleReconnect() {
    // Verhindere mehrere gleichzeitige Reconnect-Versuche
    if (this.isReconnecting) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ MongoDB Reconnect fehlgeschlagen nach ${this.maxReconnectAttempts} Versuchen. Manueller Neustart erforderlich.`);
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential Backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelayMs
    );

    console.log(`🔄 MongoDB Reconnect-Versuch ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000}s...`);

    setTimeout(async () => {
      try {
        // Alte Connection bereinigen
        if (this.client) {
          try {
            await this.client.close();
          } catch (closeError) {
            // Ignorieren - Connection ist möglicherweise schon geschlossen
          }
          this.client = null;
          this.db = null;
        }

        // Neu verbinden
        await this.connect();

        // Erfolg - Reset der Reconnect-Zähler
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        console.log('✅ MongoDB Reconnect erfolgreich!');
      } catch (error) {
        console.error(`❌ MongoDB Reconnect-Versuch ${this.reconnectAttempts} fehlgeschlagen:`, error.message);
        this.isReconnecting = false;

        // Nächsten Reconnect-Versuch planen
        this._scheduleReconnect();
      }
    }, delay);
  }

  // 📊 Pool-Monitoring: aggregierter Dump alle 60 Sekunden
  _startMonitoring() {
    if (this._monitorInterval) return;
    this._monitorInterval = setInterval(() => {
      const stats = this._poolStats;
      const elapsed = Math.round((Date.now() - stats.lastReset) / 1000);
      const active = stats.checkedOut - stats.checkedIn;
      // Nur loggen wenn es Aktivität gab
      if (stats.totalOperations > 0 || stats.checkOutFailed > 0 || stats.timeouts > 0) {
        console.log(`[DB Pool] ${elapsed}s | ops: ${stats.totalOperations} | active: ${active} | created: ${stats.created} | closed: ${stats.closed} | failed: ${stats.checkOutFailed} | timeouts: ${stats.timeouts}`);
      }
      // Reset counters
      this._poolStats = {
        created: 0, closed: 0, checkedOut: 0, checkedIn: 0,
        checkOutFailed: 0, timeouts: 0, totalOperations: 0,
        lastReset: Date.now()
      };
    }, 60000);
    this._monitorInterval.unref(); // Verhindert, dass der Timer den Prozess am Leben hält
  }

  _stopMonitoring() {
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }
  }

  // Health check method
  async ping() {
    try {
      const db = await this.connect();
      await db.admin().ping();
      return true;
    } catch (error) {
      console.error('❌ Database ping failed:', error);
      return false;
    }
  }

  // Get connection status (enhanced mit Pool-Info)
  getStatus() {
    return {
      connected: !!this.db && !!this.client,
      isConnecting: this.isConnecting,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
      hasClient: !!this.client,
      poolStats: { ...this._poolStats }
    };
  }
}

// Singleton instance
const database = new Database();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing database connection...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connection...');
  await database.close();
  process.exit(0);
});

module.exports = database;