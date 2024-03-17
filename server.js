const express = require("express");
const bodyParser = require("body-parser");
const app = express();
require('dotenv').config();
const mongoose = require("mongoose");
const { Webhook } = require("svix");
const User = require("./user.model");
app.use(express.urlencoded({ extended: true }))


const connectDb = () => {
    mongoose.connect(process.env.MONGO_URL)
        .then(() => {
            console.log("MongoDb Connected");
        })
        .catch((e) => console.log(e.message));
}

const PORT = process.env.PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
}

const main = () => {
    connectDb();
    app.get("/", (req, res) => {
        res.json({
            "message": "Hello from server!"
        })
    })

    app.post(
        "/api/webhooks",
        bodyParser.raw({ type: "application/json" }),
        async function (req, res) {
            // Check if the 'Signing Secret' from the Clerk Dashboard was correctly provided
            const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
            if (!WEBHOOK_SECRET) {
                throw new Error("You need a WEBHOOK_SECRET in your .env");
            }

            // Grab the headers and body
            const headers = req.headers;
            const payload = req.body;

            // Get the Svix headers for verification
            const svix_id = headers["svix-id"];
            const svix_timestamp = headers["svix-timestamp"];
            const svix_signature = headers["svix-signature"];

            // If there are missing Svix headers, error out
            if (!svix_id || !svix_timestamp || !svix_signature) {
                return new Response("Error occured -- no svix headers", {
                    status: 400,
                });
            }

            // Initiate Svix
            const wh = new Webhook(WEBHOOK_SECRET);

            let evt;

            // Attempt to verify the incoming webhook
            // If successful, the payload will be available from 'evt'
            // If the verification fails, error out and  return error code
            try {
                evt = wh.verify(payload, {
                    "svix-id": svix_id,
                    "svix-timestamp": svix_timestamp,
                    "svix-signature": svix_signature,
                });
            } catch (err) {
                // Console log and return error
                console.log("Webhook failed to verify. Error:", err.message);
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }

            // Grab the ID and TYPE of the Webhook
            const { id, email_addresses, ...attr } = evt.data;
            const eventType = evt.type;

            if (eventType === 'user.created') {
                const email = email_addresses[0].email_address;
       
                const user = new User({
                  clerkUserId: id,
                  email
                });

                await user.save();

                console.log("User Saved", user)
            }

            console.log(`Webhook with an ID of ${id} and type of ${eventType}`);
            // Console log the full payload to view
            console.log("Webhook body:", evt.data);

            return res.status(200).json({
                success: true,
                message: "Webhook received",
            });
        }
    );

    app.use(express.json())
    app.listen(PORT, () => {
        console.log(`Server Running on http://localhost:${PORT}`);
    })
}


main();
