import { Server } from "socket.io";
import { dbClient, executeQuery, getNextId, tabellen } from "./dbtools";

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
import * as db from './dbtools'
import * as bt from './basictools'
import * as twitter from "./twitter"
import * as ai from "./aitools"
import * as browser from "./browser"

export interface Bot {
    name: string,
    type: "Twitter" | "Solana",
    status: string,
    loops: {
        id: number,
        name: string,
        func: Function,
        starttime: number,
        interval: number
    }[],
    log: string[]
}

const bots: Bot[] = []

async function returnInfo(anfrage: ServerStatus, socket: any){
    let enoughInfo = await ai.decideOnEnoughInfoToContinue(anfrage)
    
    console.log(`Enough Info Decision: ${enoughInfo}`)

    if(enoughInfo){
        let response = await ai.getInfoAnswer(anfrage)
        socket.emit("info-answer", response)
        aktuelleAnfrage = null
    }else{
        socket.emit('work-on-next-step')
        let nextStep = await ai.decideOnNextStep(anfrage)
        if(nextStep.aktion === "Datenbank"){
            socket.emit('confirm-query', nextStep.aktion_data)
        }else if(nextStep.aktion === "Google"){
            socket.emit('confirm-google', nextStep.aktion_data)    
        }else if(nextStep.aktion === "UserInput"){
            socket.emit('request-user-input', nextStep.aktion_data)        
        }
    }
}
async function createBuchung(anfrage: ServerStatus, socket: any){
    let buchungResponse = await ai.tryToCreateBuchung(anfrage)
    
    if(buchungResponse.valid){
        socket.emit('propose-document-create', {
            valid: true,
            collection: 'buchung',
            object: buchungResponse.object
        })
    }else{
        socket.emit('propose-document-create', {
            valid: false,
            collection: 'buchung',
            object: buchungResponse.object    
        })
    }
}
async function createDocument(anfrage: ServerStatus, socket: any){

}
async function moveToLocation(anfrage: ServerStatus, socket: any){}

async function starteTwitterBot(anfrage: ServerStatus, socket: any){
    let credentials = await ai.getTwitterCredentialsFromRequest(anfrage)

    if(credentials.valid){
        console.log("STARTING TWITTER BOT")
        let bot = await new twitter.TwitterBot({username: credentials.username, password: credentials.password, userhandle: credentials.userhandle})
        bots.push(bot)
        console.log("TWITTER BOT ERFOLGREICH GESTARTET!")
        socket.emit('bot-gestartet', bot)
    }else{
        socket.emit('request-user-input', "Bitte gebe die benötigten Zugangsdaten für den TwitterBot an!")
    } 
}
async function postTweet(anfrage: ServerStatus, socket: any){}
async function starteSolanaBot(anfrage: ServerStatus, socket: any){}
async function watchSolanaTokenPrice(anfrage: ServerStatus, socket: any){}

export interface Aktion {
    name: string
    beschreibung: string
    aktion: Function | Aktion[]
}

let aktionMatrix: Aktion[] = [
    {
        name: "Info", 
        beschreibung: "Informative Antwort geben",
        aktion: [
            {name: "Finanzen", beschreibung: "Informative Antwort im Bereich Finanzen geben", aktion: returnInfo},
            {name: "Personen", beschreibung: "Informative Antwort im Bereich Personen geben", aktion: returnInfo},
            {name: "Allgemein", beschreibung: "Informative allgemeine Antwort geben", aktion: returnInfo}
        ]
    },
    {
        name: "CreateDocument", 
        beschreibung: "Neues Dokument in einer MongoDB Collection anlegen",
        aktion: [
            {name: "Buchung", beschreibung: "Neue Buchung anlegen", aktion: createBuchung},
            {name: "Allgemein", beschreibung: "Anderen neuen Datensatz anlegen", aktion: createDocument}
        ]
    },
    {
        name: "MoveToLocation",
        beschreibung: "Fokus der CesiumJS Scene auf spezielle Location ändern",
        aktion: moveToLocation
    },
    {
        name: "Bots",
        beschreibung: "Starte oder interagiere mit der Website verknüpften Bots",
        aktion: [
            {
                name: "Twitter Bot",
                beschreibung: "Interagiere oder starte einen Twitter Bot",
                aktion: [
                    {
                        name: "Starte Bot",
                        beschreibung: "Starte einen Twitter Bot",
                        aktion: starteTwitterBot
                    },
                    {
                        name: "Post Tweet",
                        beschreibung: "Poste einen Tweet auf Twitter",
                        aktion: postTweet
                    }
                ]
            },
            {
                name: "Solana Bot",
                beschreibung: "Interagiere oder starte einen Solana Crypto Bot",
                aktion: [
                    {
                        name: "Starte Bot",
                        beschreibung: "Starte Solana Bot",
                        aktion: starteSolanaBot
                    },
                    {
                        name: "Watch Cryto Token",
                        beschreibung: "Überwache den Preis eines Solana Token",
                        aktion: watchSolanaTokenPrice
                    }
                ]
            }
        ]
    }
]

export interface WebsiteAnfrage {
    input: string,
    metaData: any,
    context: {typ: "User"|"KI", text: string}[]
}

export interface ServerStatus{
    aktion: Aktion
    anfrage: WebsiteAnfrage,
    verlauf: {aktion: "UserInput" | "Query" | "Google", input?: string, query?: {statement: string, result: any}, google?: {suche: string, result: string}}[]
}

let aktuelleAnfrage: ServerStatus = null

async function initProgramm() {
    try {
        await db.initDB()
        await browser.initBrowser()
    } catch (err) {
        process.exit(1)
    }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
const server = http.createServer(app);
const io = socketIo(server, {cors: {origin: "http://localhost:3000",  methods: ["GET", "POST"]}});
const PORT = process.env.PORT || 3023;
server.listen(PORT, () => {console.log(`Server running on port ${PORT}`)});

async function handleAnfrage(socket: any): Promise<void>{
    (aktuelleAnfrage.aktion.aktion as Function)(aktuelleAnfrage, socket)
}

async function initAnfrage(anfrageParams: WebsiteAnfrage): Promise<ServerStatus | null>{
    try{
        let aktion = await ai.decideOnAktion(anfrageParams, aktionMatrix)
    
        if(!aktion){
            return null
        }else{
            let loServerStatus: ServerStatus = {
                aktion: aktion,
                anfrage: anfrageParams,
                verlauf: []            
            }
            
            return loServerStatus
        }
    }catch(err: any){
        console.log(`Es gab ein Problem beim Initialisieren der Anfrage: ${err.message}`)
        return null
    }
}

io.on('connection', (socket) => {
    console.log('New client connected');
  
    socket.on('process-command', async (data: WebsiteAnfrage) => {
        console.log(`PROCESS COMMAND: ${JSON.stringify(data)}`)
        
        try {             
            if(aktuelleAnfrage === null){
                console.log("INIT NEUE ANFRAGE!")
                
                aktuelleAnfrage = await initAnfrage(data)
                if(aktuelleAnfrage){
                    socket.emit('init-anfrage', aktuelleAnfrage)
                    handleAnfrage(socket)
                }else{
                    socket.emit('error', 'Anfrage konnte nicht initialisiert werden!')
                }
            }else{
                aktuelleAnfrage.verlauf.push({aktion: "UserInput", input: data.input})
                handleAnfrage(socket)
            }    
        } catch (error) {
            console.log(error.message)
            socket.emit('error', { status: 500, error: error.message });
        }
    });

    socket.on('confirm-create', async (data) =>{

        console.log(`CONFIRM CREATE: ${JSON.stringify(data)}`)
        try{
            let loId = await getNextId()
            data.object.id = loId
            await dbClient.collection(data.collection).insertOne(data.object)
            socket.emit('document-created', data)
        }catch(err: any){
            console.log(`FEHLER BEIM ANLEGEN DES DOKUMENTS ${JSON.stringify(data)}: ${err.message}`)
            socket.emit('error', err.message)
        }
    })

    socket.on('confirm-google', async(googleData)=>{
        console.log(`CONFIRM GOOGLE: ${JSON.stringify(googleData)}`)
        socket.emit('starte-google', googleData)
        try{
            let googleContent = await browser.googleSearchWholeText(googleData.text)
            console.log(`GOOGLE SEARCH RESULT: ${googleContent}`)
            aktuelleAnfrage.verlauf.push({aktion: "Google", google: {suche: googleData.text, result: googleContent}})
        }catch(err: any){
            console.log(`ERROR WHILE GOOGLING: ${err.message}`)
            socket.emit('error', `ERROR WHILE GOOGLING: ${err.message}`)
        }

        handleAnfrage(socket)
    })

    socket.on('confirm-query', async (query) =>{

        console.log(`CONFIRM QUERY: ${JSON.stringify(query)}`)
        socket.emit('starte-query', query)
        try{
            let loResult = await executeQuery(query)
            let loAbfrage: any = {aktion: "Query", query: {result: loResult, statement: query}}
            aktuelleAnfrage.verlauf.push(loAbfrage)
            socket.emit('query-fertig', loAbfrage)
        }catch(err: any){
            console.log(`FEHLER BEIM QUERY AUSFÜHREN: ${err.message}`)
            socket.emit('db-fehler', query)
        }

        handleAnfrage(socket)
    })
    
    socket.on('server-reset', async (data) =>{
        aktuelleAnfrage = null
        socket.emit('server-reseted')
    })
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
});

//REST API IMPLEMENTATIONEN
app.use((req, res, next) => {
    console.log("Ankommende Anfrage für:", req.url);
    next();
});

app.get('/collection-list', async (req, res) => {
    if(tabellen){
        res.status(200).json(tabellen.map(t=>t.name))
    }else{
        res.status(500)
    }
})

app.get('/collection/:collection', async (req, res) => {
    const collection = req.params.collection;

    try { 
        let result = await dbClient.collection(collection).find().toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/db-data', async (req, res) => {

    try { 
        let data = {}
        for(let i=0; i<tabellen.length; i++){
            //if(tabellen[i].name === "sys_var" || tabellen[i].name === "sys_schema"){}else{
                let loData = await dbClient.collection(tabellen[i].name).find().toArray()
                data[tabellen[i].name] = loData
            //}
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

(async () => {
    try {
        await initProgramm();
    } catch (error) {
        console.error('An error occurred during initialization: ' + error.message);
    }
})();

export {};