// 📁 backend/config/dbWrapper.js
const database = require('./database');

// Kompatibilitäts-Wrapper für alte Route-Files
class DBWrapper {
  constructor() {
    this.database = database;
    this._db = null;
  }

  async connect() {
    this._db = await database.connect();
    return this;
  }

  // Emuliere die alte db.collection() API
  collection(name) {
    return this._db.collection(name);
  }

  // Weiterleitungen an die neue Database API
  async findOne(collectionName, query, options = {}) {
    return database.findOne(collectionName, query, options);
  }

  async find(collectionName, query = {}, options = {}) {
    return database.find(collectionName, query, options);
  }

  async insertOne(collectionName, document) {
    return database.insertOne(collectionName, document);
  }

  async updateOne(collectionName, query, update, options = {}) {
    return database.updateOne(collectionName, query, update, options);
  }

  async deleteOne(collectionName, query) {
    return database.deleteOne(collectionName, query);
  }

  // Für direkte Database-Service Zugriffe
  getDatabase() {
    return database;
  }

  // Status-Methoden
  getStatus() {
    return database.getStatus();
  }

  async ping() {
    return database.ping();
  }

  async close() {
    return database.close();
  }
}

module.exports = new DBWrapper();