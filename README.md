# clerk-sync-mongodb
In this article we will synchronize our database users list with Clerk Webhook API.

### What is Webhook?
Webhooks are messengers that let web apps talk to each other in real-time. When something happens in one app (like a new sale), it can send a message to another app (like your inventory system) to update things automatically.

##### Create an Express app
```
mkdir clerk-sync-mongodb
cd clerk-sync-mongodb
npm init -y
```

##### Install Dependencies
```
pnpm add express mongoose dotenv svix body-parser
pnpm add -D nodemon
```

##### Create server.js file
```
touch server.js
```

##### Edit start script ing package.json
```
"dev": "nodemon server.js"
```
##### Create `.env` file and put your secrets
```
PORT=
CLERK_SIGNIN_SECRET=
MONGO_URL=
```
##### Create a basic express app
```
// server.js
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
require('dotenv').config();
const mongoose = require("mongoose");
const { Webhook } = require("svix");
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT || 3001


const connectDb = () => {
    mongoose.connect(process.env.MONGO_URL)
        .then(() => {
            console.log("MongoDb Connected");
        })
        .catch((e) => console.log(e.message));
}


const main = () => {
    app.get("/", (req, res) => {
        res.json({
            "message": "Hello from server!"
        })
    })
    
    app.listen(PORT, () => {
        console.log(`Server Running on http://localhost:${PORT}`);
    })
}

app.use(express.json())


main();
```
##### Start our server
```
pnpm run dev
```

#### create user.model
```
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    clerkUserId: { type: String, required: true, unique: true },
    email: {type: String}
  });
  
  const User = mongoose.model('User', userSchema);
  
module.exports = User;
```
#### create webhook controller in main function
```
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
```

Now, with the help of webhook, our users will start to be registered to our own database. You should also handle editing and deleting operations according to event.data. The final version of the sample code is on the github link.

Open an issue or submit a pr for Corrections and Suggestions
