const express = require("express");
const app = express();
const db = require("./db.js");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");

// console.log("db in server", db);

const PORT = 8080;

//handlebars config
app.engine("handlebars", hb.engine());
app.set("view engine", "handlebars");

//cookie parser middleware
app.use(cookieParser());

//middleware for req.body
app.use(express.urlencoded({ extended: false }));

//serve the public folder
app.use(express.static("./public"));

//redirect users for every route they try to access if cookies don't exist
app.get("*", (req, res, next) => {
    if (req.cookies.signed !== "1" && req.url !== "/petition") {
        return res.redirect("/petition");
    }
    return next();
});

//redirect root address to petition
app.get("/", (req, res) => {
    // console.log("get request to / route just happened");
    //redirect to my main petition page
    res.redirect("/petition");
});

app.get("/petition", (req, res) => {
    //eliminate users who have signed
    if (req.cookies.signed === "1") {
        return res.redirect("/thank-you");
    }
    res.render("petition", {
        title: "Sign my petition",
    });
});

//handle the post request for when users sign the petition
app.post("/petition", (req, res) => {
    //grab the info from the form
    const data = req.body;
    // console.log("signer data", data);
    const date = new Date();

    db.addSigner(data.first, data.last, data.signature, date)
        .then(() => {
            console.log("addSigner worked");
            //set the cookie
            res.cookie("signed", 1);
            //redirect if successful
            res.redirect("/thank-you");
        })
        .catch((err) => {
            console.log("error in adding signer", err);
            const error = {
                message: "Please complete all fields!",
            };
            //re-render the page with an error message on the client side
            //note that this time no slash is necessary bc I'm already in /petition page (otherwise it would throw a render error)
            res.render("petition", { title: "Try again!", error });
        });
});

//serve the thank you page
app.get("/thank-you", (req, res) => {
    db.getCount()
        .then((results) => {
            // console.log("count", results.rows);
            const nbSigners = results.rows[0];
            res.render("thankyou", {
                title: "Thank you for signing",
                count: nbSigners.count,
            });
        })
        .catch((err) => {
            console.log("error in getCount", err);
            res.sendStatus(500);
        });
});

//serve the signers page
app.get("/signers", (req, res) => {
    db.getSigners()
        .then((results) => {
            // console.log("signers of the petition", results.rows);
            //signers as array of objects
            const signers = results.rows;
            res.render("signers", {
                title: "Signers of petition",
                signers,
            });
        })
        .catch((err) => {
            console.log("error in getSigners", err);
            res.sendStatus(500);
        });
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
