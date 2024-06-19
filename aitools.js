"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideIfCrypto = exports.getTwitterCredentialsFromRequest = exports.prompt = exports.tryToCreateBuchung = exports.tryToCreateSchemaObject = exports.decideOnObjectToCreate = exports.decideOnUpdatedObject = exports.decideOnEnoughInfoToCreate = exports.decideOnEnoughInfoToContinue = exports.decideOnSchema = exports.decideOnWhatToAskUser = exports.decideOnNextStep = exports.decideOnQuery = exports.decideOnGoogleSearch = exports.getInfoAnswer = exports.decideOnAktion = exports.getAIAnswer = void 0;
const dbtools_1 = require("./dbtools");
const { OpenAI } = require('openai');
const openai = new OpenAI();
const db = require("./dbtools");
const main = require('./server');
const bt = __importStar(require("./basictools"));
let beispielAnfrage1 = {
    selected_collection: null,
    selected_document: null,
    cesium_coordinates: [91.2323, 42.2323],
    user_request: "Wie spät ist es?",
    log: []
};
let beispielAntwort1 = {
    aktion: "Info",
    beschreibung: "Uhrzeit zurück geben"
};
let beispielAnfrage2 = {
    selected_collection: null,
    selected_document: null,
    cesium_coordinates: [91.2323, 42.2323],
    user_request: "Bitte zeige mir die letzte Buchung",
    log: []
};
let beispielAntwort2 = {
    aktion: "Select",
    beschreibung: "Letzte Buchung auswählen"
};
let beispielAnfrage3 = {
    selected_collection: null,
    selected_document: null,
    cesium_coordinates: [91.2323, 42.2323],
    user_request: "Wie viel Geld hab ich auf der Sparkasse?",
    log: []
};
let beispielAntwort3 = {
    aktion: "Info",
    beschreibung: "Kontostand Sparkasse zurückgeben"
};
let enoughInfoExample1 = {
    anfrage: {
        anfrage: "Wie viel Geld hab ich auf dem Konto?",
        bereits_gesammelte_daten: []
    },
    antwort: {
        genug: false
    }
};
let enoughInfoExample2 = {
    anfrage: {
        anfrage: "Wie viel Geld hab ich auf dem Konto?",
        bereits_gesammelte_daten: [{ aktion: "GetKontostand", aktion_data: { konto: 1, konto_name: "Sparkasse", betrag: 1004 } }]
    },
    antwort: {
        genug: true
    }
};
let enoughInfoExample3 = {
    anfrage: {
        anfrage: "Wie geht es dir?",
        bereits_gesammelte_daten: []
    },
    antwort: {
        genug: true
    }
};
async function getAIAnswer(prompt, json) {
    try {
        let responseObject;
        if (json) {
            responseObject = await openai.chat.completions.create({
                messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
            });
        }
        else {
            responseObject = await openai.chat.completions.create({ messages: [{ role: "system", content: prompt }], model: "gpt-4o" });
        }
        let content = responseObject.choices[0].message.content.trim();
        if (json) {
            return JSON.parse(content);
        }
        else {
            return content;
        }
    }
    catch (error) {
        return `There was an unexpected error:  ${error.message}`;
    }
}
exports.getAIAnswer = getAIAnswer;
async function decideOnAktion(anfrage, aktionen) {
    try {
        console.log("DecideOnAnfragenAktion");
        const prompt = `Du bist eine clevere AI, die Teil einer ausgeklügelten Website ist. 
        An die Website ist eine MongoDB angeschlossen, auf die auch du indirekten Zugriff hast. 
        Auf der Website wird diese MongoDB visualisiert und zudem eine Weltkarte mittels CesiumJS angezeigt. 
        Der User hat eine Kommandozeile über welche er dir Anfragen schicken kann, deine Aufgabe ist es nun, basierend auf den aktuellen
        Website Parametern und der Nutzeranfrage zu entscheiden, welche Aktion ausgeführt werden sollen. Generell ist zu sagen, die Website
        funktioniert wie eine Kommandozeile in der ein User sämtliche Aktionen ausführen und sich anzeigen lassen kann.
        Deine Aufgabe ist es nun anhand einer User Anfrage zu entscheiden, welche Aktion aus der unten genannten Liste am Besten zutrifft und
        am Besten beschreibt, was der User basierend auf seiner Anfrage tun möchte.

        **Mögliche Aktionen**
        ${JSON.stringify(aktionen.map(a => { return { name: a.name, beschreibung: a.beschreibung }; }))}
        
        Gebe dafür bitte ein JSON Objekt mit einer Property "aktion" zurück, mit dem Namen der entsprechend auszuführenden Aktion, sowie eine
        Property beschreibung, die eine kurze Beschreibung enthält, was genauer getan werden soll.

        Anfrage-Parameter:
        ${JSON.stringify(anfrage)} 

        **Beispiel 1**
        Anfrage-Parameter: ${JSON.stringify(beispielAnfrage1)}
        Antwort: ${JSON.stringify(beispielAntwort1)}

        **Beispiel 2**
        Anfrage-Parameter: ${JSON.stringify(beispielAnfrage2)}
        Antwort: ${JSON.stringify(beispielAntwort2)}

        **Beispiel 3**
        Anfrage-Parameter: ${JSON.stringify(beispielAnfrage3)}
        Antwort: ${JSON.stringify(beispielAntwort3)}
        `;
        let response = await getAIAnswer(prompt, true);
        console.log(`AI ANSWER ANFRAGEN TYP: ${JSON.stringify(response)}`);
        let aktion = aktionen.find(a => a.name === response.aktion);
        if (aktion) {
            if (Array.isArray(aktion.aktion)) {
                return await decideOnAktion(anfrage, aktion.aktion);
            }
            else {
                return aktion;
            }
        }
        else {
            return null;
        }
    }
    catch (error) {
        return null;
    }
}
exports.decideOnAktion = decideOnAktion;
async function getInfoAnswer(serverStatus) {
    try {
        console.log("GetInfoAnswer");
        const promptAllgemein = `
        
        Der User hat folgende Anfrage gestellt: ${JSON.stringify(serverStatus.anfrage)}
        Bislang ist folgendes geschehen: ${JSON.stringify(serverStatus.verlauf)}

        Deine Aufgabe ist es nun dem User eine zufriedenstellende Anwort auf seine Anfrage zu geben. Antworte ohne viel drum herum falls möglich,
        das Programm soll eine Art interaktive Schnittstelle zur angeschlossenen MongoDB und Cesium Scene mit KI darstellen, wobei du die Rolle
        der vermittelnden KI einnimmst!

        Berücksichtige auch den bisherigen Verlauf der Konversation: ${JSON.stringify(serverStatus.anfrage.metaData.context)}
        Das aktuelle Datum ist: ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}
        Die IP Adresse des Servers (also quasi von dir) ist: ${await bt.getServerIP()}
        Der User hat auf der CesiumJS Scene auf der Website aktuell folgende Koordinaten fokussiert: ${JSON.stringify(serverStatus.anfrage.metaData.cesium_coordinates)}
        `;
        const promptFinance = `
        Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Finanz Programms ist
        Du hilfst dem User Informationen zusammenzutragen, Buchungen zu suchen und Summen zu berechnen. Alle notwendigen Daten sind in den beiden
        Collections "Konto" und "Buchung" zu finden. Die Daten sind nach dem Prinzip der doppelten Buchführung erfasst, das heißt es wird nach
        dem Prinzip Soll an Haben gebucht. Wenn beispielsweise bar im Lidl eingekauft wurde, so ist in dem Buchunsdatensatz als Sollkonto
        beispielsweise Konsumausgaben erfasst und als haben Konto beispielsweise das Sparkassen-Konto.
        Berücksichtige diese Logik korrekt beim Bilden von Summen, beim Berechnen von Salden und Kontoständen. Haben bedeutet ein Abgang von Geld,
        Soll ein Zufluss!

        Der User hat folgende Anfrage gestellt: ${JSON.stringify(serverStatus.anfrage)}
        Es wurden folgende Daten bereits ermittelt: ${JSON.stringify(serverStatus.verlauf)}

        Deine Aufgabe ist es nun dem User eine zufriedenstellende Anwort auf seine Anfrage zu geben. Antworte ohne viel drum herum falls möglich.

        Das aktuelle Datum ist: ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}
        `;
        let response = "";
        if (serverStatus.aktion.name === "Finanzen") {
            response = await getAIAnswer(promptFinance, false);
        }
        else {
            response = await getAIAnswer(promptAllgemein, false);
        }
        console.log(`AI ANSWER ANFRAGE INFO: ${JSON.stringify(response)}`);
        if (response) {
            return response;
        }
        else {
            return "Hmmm.. there was an unexpected error, the KI returned no fitting answer";
        }
    }
    catch (error) {
        return "Hmmm.. there was following error: " + error.message;
    }
}
exports.getInfoAnswer = getInfoAnswer;
async function decideOnGoogleSearch(serverStatus) {
    console.log("DecideOnGoogleSearch");
    let prompt = `Du bist eine clevere AI, die Teil eines ausgeklügelten Programms ist. Deine Aufgabe ist es,
    basierend auf einer Nutzeranfrage zu entscheiden, nach welchem Text gegoogelt werden soll um Daten zu gewinnen um
     die Anfrage möglichst zufriedenstellend beantworten zu können.
     
     Gebe dazu bitte ein JSON Objekt mit einer Property "text" zurück, die den Text für die Google-Suchmaschine enthält, sowie eine
     weitere Property "beschreibung", die eine kurze Beschreibung dazu enthält, was über die Google Suche erreicht werden soll.

    Die Nutzeranfrage lautet wie folgt: ${serverStatus.anfrage.input}
    Diese Daten wurden vom Programm bereits ermittelt: ${JSON.stringify(serverStatus.verlauf)}

    Das ist das aktuelle Datum zum Zeitpunkt der Anfrage: ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}

     **Beispiel 1**
     Anfrage: "Wie wird das Wetter heute in Sigmaringen?"
     Antwort: {
        text: "Wetter Sigmaringen heute"
        beschreibung: "Wetter in Sigmaringen heute googlen."
     }
     
     **Beispiel 2**
     Anfrage: "Wie alt ist der Präsident von Simbabwe?"
     Antwort: {
        text: "Alter Präsident Simbabwe"
        beschreibung: "Alter des Präsident von Simbabwe bestimmen."
     }
     `;
    console.log(`DECIDE ON GOOGLE SEARCH PROMPT: ${prompt}`);
    let response = await getAIAnswer(prompt, true);
    console.log("AI GOOGLE PROPOSAL:");
    console.log(response);
    return response;
}
exports.decideOnGoogleSearch = decideOnGoogleSearch;
async function decideOnQuery(serverStatus) {
    console.log("DecideOnQuery");
    let prompt = `Du bist eine clevere AI, die Teil eines ausgeklügelten Systems ist, um sämtliche Anfragen eines Nutzers einer Website
        zufriedenstellen zu bearbeiten. Der User hat folgende Anfrage gestellt: ${JSON.stringify(serverStatus.anfrage)}

        Deine Aufgabe ist es nun zu entscheiden, ob und wie die zur Beantwortung der Anfrage benötigten Daten aus der an das Programm 
        angeschlossenen MongoDB gewonnen werden können. Du hast genaue Kenntnisse über alle in der Datenbank erhaltenen Collections, sowie
        die Art der Daten die jeweils in diesen gespeichert sind und kannst daher mit Genauigkeit sagen, ob die Antwort für eine Anfrage
        über Daten in der Datenbank vermutlich beantwortet werden kann. Deine Aufgabe ist es ein JSON Objekt mit einer Property "query"
        zurückzugeben, welche entweder ein leerer String ist, wenn aus der Datenbank keine für die Anfrage relevanten Daten gewonnen werden
        können. Falls aber doch, gebe bitte als Property "query" die String Representation eines später vom Programm ausführbaren Javascript
        Code zurück. Dieser wird dann in der Folge vom Programm in einer eval() Funktion ausgeführt und die gewonnen Daten, wieder dir als KI
        zur Verfügung gestellt um die Anfrage weiter zu beantworten. Bitte verwende in dem Javascript Code die vor dem eval() Aufruf bereits
        initialisierte MongoDB Connection "dbClient", wie in den Beispielen aufgeführt. Du kannst dir ganze Collections oder aber auch spezielle
        Daten zurückgeben lassen, wie auch immer du das in dem Javascript Code ausführst.
        Gebe bitte zudem eine zweite Property "beschreibung" zurück, die kurz erklärt was über den query gewonnen werden soll, beziehungsweise
        im Falle eines leeren Strings erklärt warum die Daten nicht aus der DB gewonnen werden können.
        Beachte korrekt, das heute der ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()} ist.
        Wenn nach Datum gefiltert werden soll, beachte im Code dass die datum Property in der MongoDB immer im ISO Format gespeichert werden!

        Vermeide bei deinen Querys auch zu spezifisch zu filtern etc, lass dir zur Not immer lieber eine größere Datenmenge geben und
        schau dann selbst drüber, nach den gewünschten Informationen!
        `;
    prompt += `Beachte bitte auch das folgende Daten bereits in früheren Schritten gewonnen worden sind, damit du nicht bereits vorhandene 
        Daten doppelt abrufst und bitte berücksichtige auch neue Anmerkungen des Users: ${JSON.stringify(serverStatus.verlauf)}`;
    if (serverStatus.aktion.name === "Finanzen") {
        prompt += `
            
            Die MongoDB umfasst folgende Collections mit folgenden AJV-Formata: ${JSON.stringify(dbtools_1.systemSchemas)}

            Das hier sind alle vorhandenen Konten des Nutzers: ${JSON.stringify(dbtools_1.konten)}
            Beachte bitte dass Buchungen nach dem Prinzip der doppelten Buchführung erfasst sind, wobei die soll beziehungsweise haben 
            Property immer ein Verweis auf eine Id aus der Konto Tabelle ist. Beachte korrekt, dass die Buchungen nach dem Prinzip der
            doppelten Buchführung erfasst sind, das bedeutet ein Bareinkauf im Lidl würde als Soll an Haben, also Soll=Id Konto Konsumausgaben an 
            Haben=Id Konto Bar gebucht. Haben bedeutet also ein Abgang, Soll ein Zugang auf einem Konto!
            
            **Beispiel 1**
            Anfrage: "Ich brauche die Summe aller Buchungen diesen Monat (am 16.06.2024 gefragt)"
            Antwort: {
                query: "
                    const today = new Date();
                    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            
                    const query = {
                        datum: {
                            $gte: firstDayLastMonth,
                            $lte: lastDayLastMonth
                        }
                    };

                    return await dbClient.collection('buchung').find(query).toArray()"

                beschreibung: "Buchungen vom letzten Monat extrahieren"
            }

            **Beispiel 2**
            Anfrage: "Wie wird das Wetter heute?
            Antwort: {
                query: "",
                beschreibung: "In der Datenbank sind keine Wetterdaten enthalten."
            }

            **Beispiel 3**
            Anfrage: "Wie ist die Summe aller Buchungen"
            Antwort: {
                query: "return await dbClient.collection('buchung).find().toArray()"
                beschreibung: "Daten aller Buchungen extrahieren"
            }
            `;
    }
    else {
        prompt += `Die MongoDB umfasst folgende Collections mit folgenden AJV-Formata: ${JSON.stringify(dbtools_1.systemSchemas)}
            
            **Beispiel 1**
            Anfrage: "Wer ist mein Vater?"
            Antwort: { 
                query: "return await dbClient.collection('kontakt').find().toArray()"
                beschreibung: "Alle Kontakte darauf untersuchen, ob irgendwo erkennbar ist, dass es sich um des Nutzers Vater handelt"
            }
            `;
    }
    console.log(prompt);
    let response = await getAIAnswer(prompt, true);
    console.log("AI QUERY PROPOSAL:");
    console.log(response);
    return response;
}
exports.decideOnQuery = decideOnQuery;
async function decideOnNextStep(serverStatus) {
    try {
        let queryProposal = await decideOnQuery(serverStatus);
        if (queryProposal.query !== "") {
            return { aktion: "Datenbank", aktion_data: queryProposal };
        }
        else {
            let googleProposal = await decideOnGoogleSearch(serverStatus);
            if (googleProposal.text !== "") {
                return { aktion: "Google", aktion_data: googleProposal };
            }
            else {
                let questionForUser = await decideOnWhatToAskUser(serverStatus);
                return { aktion: "UserInput", aktion_data: questionForUser };
            }
        }
    }
    catch (error) {
        return { aktion: "UserInput", aktion_data: { question: error.message } };
    }
}
exports.decideOnNextStep = decideOnNextStep;
async function decideOnWhatToAskUser(serverStatus) {
    console.log("DecideOnWhatToAskUser");
    try {
        const prompt = `Du bist eine clevere AI, die Teil eines ausgeklügelten Systems ist, um einem User sämtliche Fragen zu 
        beantworten. Der User hat folgende Anfrage gestellt: ${serverStatus.anfrage}
        Bisher ist folgendes geschehen: ${JSON.stringify(serverStatus.verlauf)}
        Andere Teile des Programms haben bereits analysiert, dass weder eine Google Suche noch eine Datenbankabfrage hilft, die Frage besser 
        beantworten zu können. Schreibe dem User daher bitte eine Antwort, in welcher du klarstellst warum die Anfrage nicht beantwortet werden
        kann und welche zusätzlichen Informationen vom User benötigt werden, um die Anfrage eventuell doch noch zu beantworten.
        `;
        let response = await getAIAnswer(prompt, false);
        console.log("AI ANSWER What To Ask: ");
        console.log(response);
        return response;
    }
    catch (error) {
        return error.message;
    }
}
exports.decideOnWhatToAskUser = decideOnWhatToAskUser;
async function decideOnSchema(anfrage) {
    try {
        const prompt = `You are a smart AI that has access to a MongoDB database. The user wants you to create a new record in a table asking you 
        this: "${anfrage}".
        You know that these tables already exist: ${Object.keys(db.systemSchemas).join(',')}. 
        Please return a JSON Object with one property "schema" which is either the name of the 
        selected schema or an empty string if there is nothing that fits perfectly!`;
        let response = await getAIAnswer(prompt, true);
        if (response.schema) {
            return response.schema;
        }
        else {
            return "";
        }
    }
    catch (error) {
        return "";
    }
}
exports.decideOnSchema = decideOnSchema;
async function decideOnEnoughInfoToContinue(serverStatus) {
    console.log("DecideOnEnoughInfoToContinue");
    try {
        let prompt = `Du bist eine clevere AI, die den Programmablaufs einer Website steuert. Basierend auf einer Nutzeranfrage entscheidest du
        ob bereits genug Informationen vorhanden sind um eine Nutzeranfrage zufriedenstellend beantworten zu können oder nicht.
        Bitte gebe ein JSON Object mit einer Property "genug" zurück, die entweder true ist, wenn alle Informationen vorhanden sind um eine
        zufriedenstellende Antwort zu geben und gebe false zurück, falls noch etwas fehlt.

        Anfrage: ${JSON.stringify(serverStatus.anfrage.input)}
        Diese Daten wurden bereits ermittelt: ${JSON.stringify(serverStatus.verlauf)}
        
        **Beispiel 1**
        Anfrage: ${JSON.stringify(enoughInfoExample1.anfrage)}
        Antwort: ${JSON.stringify(enoughInfoExample3.antwort)}
        
        **Beispiel 2**
        Anfrage: ${JSON.stringify(enoughInfoExample2.anfrage)}
        Antwort: ${JSON.stringify(enoughInfoExample3.antwort)}

        **Beispiel 3**
        Anfrage: ${JSON.stringify(enoughInfoExample3.anfrage)}
        Antwort: ${JSON.stringify(enoughInfoExample3.antwort)}
        `;
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        console.log(prompt);
        const response = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log(`AI Enough Decision: ${JSON.stringify(response)}`);
        if (response && response.genug) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (error) {
        return false;
    }
}
exports.decideOnEnoughInfoToContinue = decideOnEnoughInfoToContinue;
async function decideOnEnoughInfoToCreate(command, object, schema) {
    try {
        const schemaDetails = JSON.stringify(db.systemSchemas[schema]);
        const prompt = `You are a smart AI that can check if a object satisfies a given schema. 
                        Please check if this object: ${JSON.stringify(object)} satisfies all strictly needed properties from this schema: ${schemaDetails}.
                        It satisfies the schema completly as long as all strictly required properties are fulfilled! Optional properties can be missing or 
                        have default vaules like -1 or empty string. Required fields need to have correct values (No -1 and no empty string allowed)!
                        Answer in a JSON Object with one property enough which is either true or false and an optional property missingFields which 
                        lists any missing fields that are strictly required in the schema and not provided yet. If the date is provided like 
                        today its sufficient, it doesnt have to be in the needed format already.
                        The current Date right now is ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toTimeString()}`;
        console.log(prompt);
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const response = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI Answer");
        console.log(response);
        return response;
    }
    catch (error) {
        return { enough: false, missingFields: [] };
    }
}
exports.decideOnEnoughInfoToCreate = decideOnEnoughInfoToCreate;
async function decideOnUpdatedObject(anfrage, currentDocument, verlauf) {
    try {
        let prompt = `Du bist eine clevere AI, die Teil eines ausgeklügelten Programms ist. Der Benutzer möchte folgendes Objekt in der Datenbank
        abändern: ${JSON.stringify(currentDocument.data)}
        Seine Anfrage zur Abänderung lautet wie folgt: ${anfrage}
        Bitte gebe das Dokument, mit den vom Benutzer gewünschten Änderungen als JSON Object zurück! 
        
        *Weitere Informationen*
        Das Datum heute ist ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}.
        Das ist alles was das Programm bisher getan hat: ${JSON.stringify(verlauf)}
        `;
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const initialResult = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI UPDATE OBJECT ANSWER");
        console.log(initialResult);
        return initialResult;
    }
    catch (error) {
    }
}
exports.decideOnUpdatedObject = decideOnUpdatedObject;
async function decideOnObjectToCreate(command, verlauf, schema) {
    try {
        let prompt;
        if (schema !== "object") {
            prompt = `You are a smart AI that has access to a MongoDB database. The user wants you to create a new record in a table asking you this: ${command}.
            Please provide the JSON Object that should be created in the database that fulfills this schema strictly! Schema: 
            ${JSON.stringify(db.systemSchemas[schema])}
            If some info is still missing add an empty string if its a string property and a -1 if its a number! If there date info is provided indirectly 
            (today, tomorrow etc) please transform it already in the correct format.!
            
            Das Datum heute ist ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}.

            This is what the programm has already gathered on data: ${JSON.stringify(verlauf)}
            `;
        }
        else {
            prompt = `You are a smart AI that has access to a MongoDB database. The user wants you to create a new record in a table asking 
            you this: ${command}.
            Please provide the JSON Object that should be created in the database. In a earlier step you decided that the document will be added
            to the object collection, a collection for all data that has no specific schema.

            Das Datum heute ist ${new Date(Date.now()).toLocaleDateString()} ${new Date(Date.now()).toLocaleTimeString()}.

            This is what the programm has already gathered on data: ${JSON.stringify(verlauf)}
            `;
        }
        const initialResponse = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }], model: "gpt-4o", response_format: { type: "json_object" }
        });
        const initialResult = JSON.parse(initialResponse.choices[0].message.content.trim());
        console.log("AI Answer");
        console.log(initialResult);
        return initialResult;
    }
    catch (error) {
    }
}
exports.decideOnObjectToCreate = decideOnObjectToCreate;
async function tryToCreateSchemaObject(command, verlauf, schema) {
    let accounts = await db.dbClient.collection('konto').find({}).toArray();
    const prompt = `Du bist eine clevere AI, die Teil eines größeren ausgeklügelten Programms ist. Deine Aufgabe ist es
    anhand einer User Anfrage und eines Datenbank AJV Schemas, ein JSON Object vorzuschlagen, was dann in einem nächsten Schritt in 
    einer MongoDB angelegt werden kann. Der User hat folgende Anfrage gestellt: ${command}.
    Du sollst nun ein JSON Objekt erstellen, dass folgendes AJV Format erfüllt: ${JSON.stringify(db.systemSchemas[schema])} 
    Das JSON Object muss den Anforderungen des Schemas genügen, das ist sehr wichtig! Das aktuelle Datum ist 
    ${new Date(Date.now()).toLocaleDateString() + new Date(Date.now()).toLocaleTimeString()}. 

    Du hast außerdem Informationen zu allen zuvor ausgeführten Aktionen des Programms im Rahmen dieser Anfrage: ${JSON.stringify(verlauf)}
    `;
    const response = await getAIAnswer(prompt, true);
    const schemaDoc = db.systemSchemas[schema];
    const validate = db.ajv.compile(schemaDoc);
    const valid = validate(response);
    if (!valid) {
        return { valid: true, object: response };
    }
    else {
        return { valid: false, object: response };
    }
}
exports.tryToCreateSchemaObject = tryToCreateSchemaObject;
async function tryToCreateBuchung(serverStatus) {
    const prompt = `You are an amazing AI that helps adding Buchungen to a Mongo Database. 
    The user asked you to add following buchung: ${serverStatus.anfrage.input}.
    The Database logic follows the doppelte Buchführung... 
    Please return a JSON Object with this AJV Schema: ${JSON.stringify(db.systemSchemas['buchung'])} 
    The JSON Object has to strictly follow this schema, this is very important! The current date is 
    ${new Date(Date.now()).toLocaleDateString() + new Date(Date.now()).toLocaleTimeString()}. 
    Please note that the datum of the buchung needs to strictly be in ISO 8601 Format!
    
    All available accounts with their ids needed for the soll and haben property are available in this json array: ${JSON.stringify(db.konten)}.
    You also have information about what the programm already did: ${JSON.stringify(serverStatus.verlauf)}
    `;
    const response = await getAIAnswer(prompt, true);
    console.log("AI CREATE BUCHUNG RESPONSE");
    console.log(JSON.stringify(response));
    const schemaDoc = db.systemSchemas['buchung'];
    const validate = db.ajv.compile(schemaDoc);
    const valid = validate(response);
    if (valid) {
        return { valid: true, object: response };
    }
    else {
        return { valid: false, object: response };
    }
}
exports.tryToCreateBuchung = tryToCreateBuchung;
//TWITTER FUNCTIONALITY
async function prompt(promptText) {
    try {
        let responseObject = await openai.chat.completions.create({
            messages: [{ role: "system", content: promptText }],
            model: "gpt-4o",
            temperature: 0.7,
            max_tokens: 150,
            top_p: 0.85,
            frequency_penalty: 0.5,
            presence_penalty: 0.5 // Reduces the chance of frequently using the same words
        });
        let content = responseObject.choices[0].message.content.trim();
        return content;
    }
    catch (error) {
        console.error(`There was an unexpected error: ${error.message}`);
        return `There was an unexpected error: ${error.message}`;
    }
}
exports.prompt = prompt;
async function getTwitterCredentialsFromRequest(serverStatus) {
    try {
        let promptText = `
        You are an amazing AI that helps to initialize a Twitter Bot. A user requested to start a Twitter Bot. Your task is to extract the 
        needed credentials for initializing the bot from the users request. Please return a JSON Object with following properties:
        
        valid: boolean (True if all credentials are provided, false if not)
        username: string (Twitter Username)
        userhandle: string (Unique Twitter Userhandle)
        password: string (Twitter Password)

        The user sended following request: ${serverStatus.anfrage.input}
        Also this happened already: ${JSON.stringify(serverStatus.verlauf)} 
        `;
        let responseObject = await openai.chat.completions.create({
            messages: [{ role: "system", content: promptText }],
            model: "gpt-4o",
            response_format: { type: "json_object" }
        });
        let content = JSON.parse(responseObject.choices[0].message.content.trim());
        console.log(`Extracted Twitter Credentials: ${JSON.stringify(content)}`);
        return content;
    }
    catch (error) {
        console.error(`There was an unexpected error: ${error.message}`);
        return {
            valid: false,
            username: "",
            password: "",
            userhandle: ""
        };
    }
}
exports.getTwitterCredentialsFromRequest = getTwitterCredentialsFromRequest;
async function decideIfCrypto(tweetText) {
    try {
        let promptText = `
        You are an amazing AI that decides if a Tweet is a crypto and solana related tweet. Please respond with a 
        JSON Object with one property "crypto" which is either true if the tweet is about crypto and solana and false if not.

        The tweet you have to asses is the following: ${tweetText}
        `;
        let responseObject = await openai.chat.completions.create({
            messages: [{ role: "system", content: promptText }],
            model: "gpt-4o",
            response_format: { type: "json_object" }
        });
        let content = JSON.parse(responseObject.choices[0].message.content.trim());
        console.log(`Tweet: ${tweetText}`);
        console.log(`Crypto Related: ${JSON.stringify(content)}`);
        if (content && content.crypto) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (error) {
        console.error(`There was an unexpected error: ${error.message}`);
        return false;
    }
}
exports.decideIfCrypto = decideIfCrypto;
