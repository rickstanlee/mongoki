"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentById = exports.createRecord = exports.executeQuery = exports.getNextId = exports.loadSystemSchemas = exports.loadSystemConstants = exports.initDB = exports.buchungen = exports.konten = exports.tabellen = exports.systemSchemas = exports.systemConstants = exports.dbClient = exports.mongoClient = exports.ajv = void 0;
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
exports.ajv = new Ajv();
addFormats(exports.ajv);
exports.mongoClient = new MongoClient(process.env.MONGO_URL);
async function initDB() {
    try {
        await exports.mongoClient.connect();
        exports.dbClient = await exports.mongoClient.db('enrico');
        exports.systemConstants = await loadSystemConstants();
        exports.systemSchemas = await loadSystemSchemas();
        exports.tabellen = await exports.dbClient.listCollections().toArray();
        exports.konten = await exports.dbClient.collection("konto").find().toArray();
        exports.buchungen = await exports.dbClient.collection('buchung').find().toArray();
    }
    catch (err) {
        process.exit(1);
    }
}
exports.initDB = initDB;
async function loadSystemConstants() {
    try {
        const collection = exports.dbClient.collection('sys_var');
        const systemConstants = await collection.findOne();
        if (!systemConstants) {
            throw new Error('No system constants found');
        }
        let constants = {};
        Object.entries(systemConstants).forEach(([key, value]) => {
            constants[key] = value;
        });
        return constants;
    }
    catch (error) {
        throw error;
    }
}
exports.loadSystemConstants = loadSystemConstants;
async function loadSystemSchemas() {
    try {
        const collection = exports.dbClient.collection('sys_schema');
        const schemas = await collection.find().toArray();
        if (schemas.length === 0) {
            throw new Error('No schemas found');
        }
        let schemaMap = {};
        schemas.forEach(schemaDoc => {
            schemaMap[schemaDoc.name] = schemaDoc.schema;
        });
        return schemaMap;
    }
    catch (error) {
        throw error;
    }
}
exports.loadSystemSchemas = loadSystemSchemas;
async function getNextId() {
    try {
        const collection = exports.dbClient.collection('sys_var');
        const result = await collection.findOneAndUpdate({ _id: new ObjectId(exports.systemConstants._id) }, { $inc: { id_count: 1 } }, { returnDocument: 'after' });
        if (!result.value) {
            throw new Error('Failed to increment id_count');
        }
        exports.systemConstants.id_count = result.value.id_count;
        return exports.systemConstants.id_count;
    }
    catch (error) {
        return -1;
    }
}
exports.getNextId = getNextId;
async function executeQuery(query) {
    try {
        const func = new Function('dbClient', `return (async () => { ${query} })()`);
        return await func(exports.dbClient);
    }
    catch (error) {
        throw new Error('Error executing query: ' + error.message);
    }
}
exports.executeQuery = executeQuery;
async function createRecord(record, table) {
    try {
        const schemaDoc = exports.systemSchemas[table];
        if (schemaDoc) {
            const validate = exports.ajv.compile(schemaDoc);
            const valid = validate(record);
            if (!valid) {
                throw new Error(`Validation failed: ${exports.ajv.errorsText(validate.errors)}`);
            }
        }
        else { }
        let recordId = await getNextId();
        if (recordId === -1) {
            throw new Error('Failed to generate a valid record ID');
        }
        await exports.dbClient.collection(table).insertOne({ ...record, id: recordId });
        return recordId;
    }
    catch (error) {
        return -1;
    }
}
exports.createRecord = createRecord;
async function getDocumentById(id) {
    let data = { id: id, collection: "", data: {} };
    for (let i = 0; i < exports.tabellen.length; i++) {
        let loData = await exports.dbClient.collection(exports.tabellen[i]).findOne({ id: id });
        if (loData) {
            data.data = loData;
            data.collection = exports.tabellen[i];
            break;
        }
    }
    return data;
}
exports.getDocumentById = getDocumentById;
