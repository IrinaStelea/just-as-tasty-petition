const express = require("express");
const app = express();
const db = require("./db.js");
const hb = require("express-handlebars");

// console.log("db in server", db);

const PORT = 8080;

//handlebars config
app.engine("handlebars", hb.engine());
app.set("view engine", "handlebars");

//middleware for req.body
app.use(express.urlencoded({ extended: false }));

//serve the public folder
app.use(express.static("./public"));

app.get("/", (req, res) => {
    console.log("get request to / route just happened");
    //redirect to my main petition page
    res.redirect("/petition");
});

app.get("/petition", (req, res) => {
    res.render("petition", {
        title: "Sign my petition",
    });
});

app.get("/signers", (req, res) => {
    db.getSigners()
        .then((results) => {
            console.log("signers of the petition", results.rows); //array of objects
        })
        .catch((err) => {
            console.log("error in getSigners", err);
            res.sendStatus(500);
        });
});

//WIP: handle the post req for when users sign the petition - add the info to the database
app.post("/petition", (req, res) => {
    //grab the info from the form
    const data = req.body;
    console.log("signer data", data);
    console.log("request timestamp", req.timestamp);
    db.addSigner(data.first, data.last, data.signature, req.timestamp)
        .then(() => {
            console.log("addSigner worked");
        })
        .catch((err) => {
            console.log("error in adding signer", err);
            //re-render the page with an error message on the client side
        });

    //set the cookie
    //redirect if successful
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
