// 📁 backend/config/database.js
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
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4 // Use IPv4, skip trying IPv6
      });

      await this.client.connect();
      this.db = this.client.db('contract_ai');

      // 🔄 Reset reconnect counter bei erfolgreichem Connect
      this.reconnectAttempts = 0;
      console.log('✅ Database connected successfully');
      
      // Handle connection events
      this.client.on('error', (error) => {
        console.error('❌ Database connection error:', error.message);
        // 🔄 Automatischer Reconnect bei Verbindungsfehler
        this._scheduleReconnect();
      });

      this.client.on('close', () => {
        console.log('📴 Database connection closed unexpectedly');
        this.client = null;
        this.db = null;
        // 🔄 Automatischer Reconnect bei unerwartetem Schließen
        // (Nicht bei manuellem close() über die close()-Methode)
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
      // 🔐 Verhindere Reconnect bei manuellem Schließen
      this.isReconnecting = true;
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isReconnecting = false;
      // Reset reconnect attempts für nächsten manuellen Connect
      this.reconnectAttempts = 0;
      console.log('📴 Database connection closed manually');
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

  // Get connection status
  getStatus() {
    return {
      connected: !!this.db && !!this.client,
      isConnecting: this.isConnecting,
      hasClient: !!this.client
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