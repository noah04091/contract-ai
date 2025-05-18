// 📁 backend/config/database.js
const { MongoClient } = require('mongodb');

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnecting = false;
    this.connectionPromise = null;
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
      
      console.log('✅ Database connected successfully');
      
      // Handle connection events
      this.client.on('error', (error) => {
        console.error('❌ Database connection error:', error);
      });

      this.client.on('close', () => {
        console.log('📴 Database connection closed');
        this.client = null;
        this.db = null;
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
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('📴 Database connection closed manually');
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