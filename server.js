const express = require("express");
const app = express();
const db = require("./db.js");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const helpers = require("./helpers.js");

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

//all routes
app.get("*", (req, res, next) => {
    // console.log("saved cookie", req.session.userId);
    //redirect to registration if not logged in
    if (
        req.session.id === undefined &&
        req.url !== "/registration" &&
        req.url !== "/login"
    ) {
        return res.redirect("/registration");
    }

    return next();
});

//redirect root address to registration
app.get("/", (req, res) => {
    // console.log("get request to / route just happened");
    res.redirect("/registration");
});

//GET registration
app.get("/registration", (req, res) => {
    if (!req.session.id) {
        res.render("registration", { title: "Join the cause" });
    }
});

//POST - registration
app.post("/registration", (req, res) => {
    //grab the info from the form
    const data = req.body;
    let error = {};
    if (!data.first || !data.last || !data.email || !data.password) {
        error.message = "Please complete all fields!";
        return res.render("registration", {
            title: "Please try again!",
            error,
        });
    }

    let capFirst = helpers.capitalize(data.first);
    let capLast = helpers.capitalize(data.last);

    db.insertUser(capFirst, capLast, data.email, data.password)
        .then((results) => {
            console.log("inserting new user worked");

            //set the cookie session on the user id to keep track of login
            const id = results.rows[0].id;
            const firstName = results.rows[0].first;
            req.session = {
                id,
                firstName,
                signed: false,
            };
            console.log("user id cookie assigned", req.session.id);
            // redirect to petition page
            res.redirect("profile");
        })
        .catch((err) => {
            console.log("error in adding new user", err);
            error.message = "Something went wrong. Please try again!";
            //TO DO: basically the only error here would be duplicate email? what should happen in this case?
            res.render("registration", { title: "Try again!", error });
        });
});

//GET - login
app.get("/login", (req, res) => {
    if (!req.session.id) {
        res.render("login", { title: "Login to join the cause" });
    } else {
        res.redirect("/petition");
    }
});

//POST - login
app.post("/login", (req, res) => {
    //grab the info from the form
    const data = req.body;
    let error = {};
    if (!data.email || !data.password) {
        error.message = "Please complete all fields!";
        return res.render("login", {
            title: "Please try again!",
            error,
        });
    }

    db.findUser(data.email)
        .then((results) => {
            console.log(
                "user email exists, here is the entire info",
                results.rows
            );
            let inputPass = data.password;
            let regPass = results.rows[0].password;
            //authenticate the user (TO DO: consider moving this password check to db.js)
            return bcrypt
                .compare(inputPass, regPass)
                .then((result) => {
                    if (result) {
                        console.log("authentication successful");

                        //set the cookie session on the user id to keep track of login
                        const id = results.rows[0].id;
                        const firstName = results.rows[0].first;
                        req.session = {
                            id,
                            firstName,
                        };
                        console.log("user id cookie assigned", req.session.id);

                        //check if user has signed already and redirect to petition page

                        // res.redirect("petition");
                        db.getSignature(id)
                            .then((results) => {
                                if (results.rows[0]) {
                                    console.log(
                                        "user has already signed"
                                        // results.rows[0]
                                    );
                                    //set cookie to keep track of signing
                                    req.session.signed = true;
                                    return res.redirect("thank-you");
                                } else {
                                    req.session.signed = false;
                                    return res.redirect("petition");
                                }
                            })
                            .catch((err) => {
                                console.log("error in getSignature", err);
                                res.sendStatus(500);
                            });
                    } else {
                        console.log(
                            "authentication failed. passwords don't match"
                        );
                        error.message = "Invalid email or password";
                        return res.render("login", {
                            title: "Please try again!",
                            error,
                        });
                    }
                })
                .catch((err) => {
                    console.log("error bcrypt compare", err);
                });
        })
        .catch((err) => {
            console.log("error in finding user in the database", err);
            error.message = "Invalid email or password";
            return res.render("login", {
                title: "Please try again!",
                error,
            });
        });
});

//GET - profile
app.get("/profile", (req, res) => {
    res.render("profile", {
        title: "Profile",
        firstName: req.session.firstName,
    });
});

//POST - profile
app.post("/profile", (req, res) => {
    const data = req.body;
    let error = {};

    const userId = req.session.id;

    //check that the age is a number
    if (data.age && isNaN(data.age)) {
        error.message = "Please provide a valid age!";
        return res.render("profile", {
            title: "Please try again!",
            error,
            firstName: req.session.firstName,
        });
    }

    //check that the homepage input is a valid url
    if (data.url && !data.url.startsWith("http")) {
        error.message = "Please provide a valid homepage!";
        return res.render("profile", {
            title: "Please try again!",
            error,
            firstName: req.session.firstName,
        });
    }

    //capitalise the city name
    let capCity = helpers.capitalize(data.city);

    if (data.age || data.url || data.city) {
        db.insertProfile(data.url, capCity, data.age, userId)
            .then((results) => {
                console.log(
                    "inserting new profile worked, here are the results",
                    results.rows
                );

                // redirect to petition page
                return res.redirect("petition");
            })
            .catch((err) => {
                console.log("error in adding new profile", err);
                error.message = "Something went wrong. Please try again!";
                res.render("profile", {
                    title: "Please try again!",
                    error,
                    firstName: req.session.firstName,
                });
            });
    } else {
        res.redirect("petition");
    }
});

//GET - petition
app.get("/petition", (req, res) => {
    if (req.session.signed == false) {
        res.render("petition", {
            title: "Sign the petition",
        });
    } else {
        return res.redirect("/thank-you");
    }
});

//POST - petition
app.post("/petition", (req, res) => {
    //grab the info from the form
    const data = req.body;

    const userId = req.session.id;

    db.addSigner(userId, data.signature)
        .then((results) => {
            console.log("addSigner worked, here is the id", results.rows[0].id);
            req.session.signed = true;
            //redirect if successful
            res.redirect("/thank-you");
        })
        .catch((err) => {
            console.log("error in adding signer", err);
            const error = {
                message: "Please submit your signature!",
            };
            //re-render the page with an error message on the client side
            //note that this time no slash is necessary bc I'm already in /petition page (otherwise it would throw a render error)
            res.render("petition", { title: "Try again!", error });
        });
});

//GET - thank you
app.get("/thank-you", (req, res) => {
    if (req.session.signed == true) {
        db.getSigners()
            .then((results) => {
                // console.log("count", results.rows);
                const nbSigners = results.rowCount;
                // console.log("date", date);

                db.getSignature(req.session.id)
                    .then((results) => {
                        // console.log("results of get signature", results);
                        const signature = results.rows[0].signature;
                        res.render("thankyou", {
                            title: "Thank you for signing",
                            count: nbSigners,
                            signature,
                            firstName: req.session.firstName,
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
    } else {
        return res.redirect("/petition");
    }
});

//GET - signers
app.get("/signers", (req, res) => {
    if (req.session.signed == true) {
        db.getSigners()
            .then((results) => {
                console.log("signers of the petition", results.rows);
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
    } else {
        return res.redirect("/petition");
    }
});

//GET - logout
app.get("/logout", (req, res) => {
    req.session = null;
    return res.redirect("/login");
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
