require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

export const ajv = new Ajv();
addFormats(ajv);

export const mongoClient = new MongoClient(process.env.MONGO_URL);
export let dbClient: any; 
export let systemConstants: any;
export let systemSchemas: any;
export let tabellen: any;
export let konten: any;
export let buchungen: any;

export async function initDB() {    
    try {
        await mongoClient.connect();
        dbClient = await mongoClient.db('enrico');
        systemConstants = await loadSystemConstants();
        systemSchemas = await loadSystemSchemas();
        tabellen = await dbClient.listCollections().toArray()
        konten = await dbClient.collection("konto").find().toArray()
        buchungen = await dbClient.collection('buchung').find().toArray()
    } catch (err) {
        process.exit(1);
    }
}

export async function loadSystemConstants() {
    try {
        const collection = dbClient.collection('sys_var');
        const systemConstants = await collection.findOne();
        if (!systemConstants) {
            throw new Error('No system constants found');
        }
        let constants = {};
        Object.entries(systemConstants).forEach(([key, value]) => {
            constants[key] = value;
        });
        return constants;
    } catch (error) {
        throw error;
    }
}

export async function loadSystemSchemas() {
    try {
        const collection = dbClient.collection('sys_schema');
        const schemas = await collection.find().toArray();
        if (schemas.length === 0) {
            throw new Error('No schemas found');
        }
        let schemaMap = {};
        schemas.forEach(schemaDoc => {
            schemaMap[schemaDoc.name] = schemaDoc.schema;
        });
        return schemaMap;
    } catch (error) {
        throw error;
    }
}

export async function getNextId(): Promise<number> {
    try {
        const collection = dbClient.collection('sys_var');
        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(systemConstants._id) },
            { $inc: { id_count: 1 } },
            { returnDocument: 'after' }
        );
        if (!result.value) {
            throw new Error('Failed to increment id_count');
        }
        systemConstants.id_count = result.value.id_count;
        return systemConstants.id_count;
    } catch (error) {
        return -1;
    }
}

export async function executeQuery(query) {
    try {
      const func = new Function('dbClient', `return (async () => { ${query} })()`);
      return await func(dbClient);
    } catch (error) {
      throw new Error('Error executing query: ' + error.message);
    }
}

export async function createRecord(record: any, table: string): Promise<number> {
    try {
        const schemaDoc = systemSchemas[table];
        if (schemaDoc) {
            const validate = ajv.compile(schemaDoc);
            const valid = validate(record);
            if (!valid) {
                throw new Error(`Validation failed: ${ajv.errorsText(validate.errors)}`);
            }
        } else {}

        let recordId = await getNextId();
        if (recordId === -1) {throw new Error('Failed to generate a valid record ID')}
        await dbClient.collection(table).insertOne({ ...record, id: recordId });
        return recordId
    } catch (error) {return -1}
}

export async function getDocumentById(id: number): Promise<{id: number, collection: string, data: any}>{
    let data = {id: id,collection: "",data: {}}

    for(let i=0; i<tabellen.length; i++){
        let loData = await dbClient.collection(tabellen[i]).findOne({id: id})
        if(loData){
            data.data = loData
            data.collection = tabellen[i]
            break;
        }    
    }

    return data
}