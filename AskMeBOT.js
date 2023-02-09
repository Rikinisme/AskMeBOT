//Menambahkan Depedencies
const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require ("@adiwajshing/baileys");
const {Boom} = require("@hapi/boom");
const {state, saveState} = useSingleFileAuthState("./login.json");

//API KEY OpenAI
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

// Fungsi OpenAI ChatGPT
async function generateResponse(text){
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });
      return response.data.choices[0].text;
}


// Fungsi Utama
async function connectToWhatsApp(){

    // Koneksi baru ke WhatsApp
    const sock = makeWASocket({
        auth : state,
        printQRInTerminal : true,
        defaultQueryTimeoutMs : undefined
    });

    // Update koneksi
    sock.ev.on("connection.update", (update)=> {
        const { connection, lastDisconnect} = update;
        if (connection === "close"){
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
            console.log("Koneksi Terputus Karena", lastDisconnect.error, ", Hubungkan kembali !", shouldReconnect);
            if(shouldReconnect){
                connectToWhatsApp();
            }
        }
        else if ( connection === "open"){
            console.log("Koneksi terhubung")
        }
    });
    sock.ev.on("creds.update", saveState);

    // Fungsi update pesan masuk
    sock.ev.on("messages.upsert", async ({messages, type}) => {
        console.log("Tipe Pesan: ", type);
        console.log("Isi Pesan: ", messages);
        if(type === "notify" && !messages[0].key.fromMe){
            try{
                // Dapatkan nomer pengirim dan isi pesan
                const senderNumber = messages[0].key.remoteJid;
                let incomingMessages = messages[0].message.conversation;
                if(incomingMessages === ""){
                    incomingMessages = messages[0].message.extendedTextMessage.text;
                }

                // Mendapatkan sumber pesan
                const isMessagesFromGroup = senderNumber.includes("@g.us");
                const isMessagesMentionBot = incomingMessages.includes("6285871622171");

                // Tampilkan nomer pengirim dan isi pesan
                console.log("Nomor Pengirim:", senderNumber);
                console.log("Isi Pesan:", incomingMessages);


                // Respon Pesan Langsung
                if (!isMessagesFromGroup){
                    async function main(){ 
                    const result = await generateResponse(incomingMessages);
                    console.log(result)
                        await sock.sendMessage(
                        senderNumber,
                        {text: result },
                        {quoted: messages[0]},
                        2000
                        );
                    }
                    main();
                }

                // Respon Pesan di Group
                if(isMessagesFromGroup && isMessagesMentionBot){
                    async function main(){ 
                        const result = await generateResponse(incomingMessages);
                        console.log(result)
                            await sock.sendMessage(
                            senderNumber,
                            {text: result },
                            {quoted: messages[0]},
                            2000
                            );
                        }
                        main();

                }

            }catch(error){
                console.log(error);
            }
        }
    });

}

connectToWhatsApp().catch((err) => {
    console.log("Ada Error : " + err);
});