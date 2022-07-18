const express = require("express");
const app = express();
const db = require("./db.js");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");

// console.log("db in server", db);

const PORT = 8080;

//handlebars config
app.engine("handlebars", hb.engine());
app.set("view engine", "handlebars");

//cookie session middleware
app.use(
    cookieSession({
        secret: `Soylent Green is people.`, //used to generate the 2nd cookie used to verify the integrity of 1st cookie
        maxAge: 1000 * 60 * 60 * 24 * 14, //two weeks
    })
);

//cookie parser middleware
app.use(cookieParser());

//middleware for req.body
app.use(express.urlencoded({ extended: false }));

//serve the public folder
app.use(express.static("./public"));

//redirect users for every route they try to access if cookies don't exist
app.get("*", (req, res, next) => {
    console.log("saved cookie", req.session.signatureId);
    if (req.session.signatureId === undefined && req.url !== "/petition") {
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
    if (req.session.signatureId) {
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
    //format the date sent to the database
    const date = new Date().toISOString().slice(0, 19).replace("T", " ");

    db.addSigner(data.first, data.last, data.signature, date)
        .then((results) => {
            console.log(
                "addSigner worked",
                "id of current entry",
                results.rows[0].id
            );
            //set the cookie - previous version
            // res.cookie("signed", 1);
            //set the cookie session - current version
            const id = results.rows[0].id;
            req.session.signatureId = id;
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
    db.getSigners()
        .then((results) => {
            // console.log("count", results.rows);
            const nbSigners = results.rowCount;
            // console.log("date", date);

            db.getSignature(req.session.signatureId)
                .then((results) => {
                    // console.log("results of get signature", results);
                    const signature = results.rows[0].signature;
                    res.render("thankyou", {
                        title: "Thank you for signing",
                        count: nbSigners,
                        signature,
                    });
                })
                .catch((err) => {
                    console.log("error in getSignature", err);
                    res.sendStatus(500);
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
