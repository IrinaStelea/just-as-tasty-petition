const express = require("express");
const app = express();
const db = require("./db.js");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const helpers = require("./helpers.js");

// console.log("db in server", db);

const COOKIE_SECRET =
    process.env.COOKIE_SECRET || require("./secrets.json").COOKIE_SECRET;
// const PORT = process.env.PORT || 8080;
let port;
let host;

if (process.env.NODE_ENV === "production") {
    host = "0.0.0.0";
    port = process.env.PORT;
} else {
    host = "localhost";
    port = 8080;
}

// //local port
// const host = "localhost";
// const port = 8080;

// //heroku port
// const host = "0.0.0.0";
// const port = process.env.PORT || 8080;

// const PORT = 8080;

//handlebars config
app.engine("handlebars", hb.engine());
app.set("view engine", "handlebars");

//https middleware
// if (process.env.NODE_ENV == "production") {
//     app.use((req, res, next) => {
//         if (req.headers["x-forwarded-proto"].startsWith("https")) {
//             return next();
//         }
//         res.redirect(`https://${req.hostname}${req.url}`);
//     });
// }

//cookie session middleware
app.use(
    cookieSession({
        secret: COOKIE_SECRET, //used to generate the 2nd cookie used to verify the integrity of 1st cookie
        maxAge: 1000 * 60 * 60 * 24 * 14,
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
            first: data.first,
            last: data.last,
            email: data.email,
        });
    }

    let cleanFirst = helpers.cleanString(data.first);
    let cleanLast = helpers.cleanString(data.last);
    let cleanEmail = data.email;
    cleanEmail = cleanEmail.toLowerCase();

    db.insertUser(cleanFirst, cleanLast, cleanEmail, data.password)
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

    let cleanEmail = data.email;
    cleanEmail = cleanEmail.toLowerCase();

    db.findUser(cleanEmail)
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
    //url to lowercase
    let cleanUrl;
    if (data.url) {
        cleanUrl = data.url;
        cleanUrl = cleanUrl.toLowerCase();
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
    let cleanCity;
    if (data.city) {
        cleanCity = helpers.cleanString(data.city);
    }

    if (data.age || data.url || data.city) {
        db.insertProfile(cleanUrl, cleanCity, data.age, userId)
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

//GET - edit profile
app.get("/edit-profile", (req, res) => {
    db.getProfile(req.session.id)
        .then((results) => {
            console.log("results of get profile", results.rows);
            let signer = results.rows[0];
            res.render("editProfile", {
                title: "Edit my profile",
                first: signer.first,
                last: signer.last,
                age: signer.age,
                city: signer.city,
                email: signer.email,
                url: signer.url,
            });
        })
        .catch((err) => {
            console.log("error in getProfile", err);
            res.sendStatus(500);
        });
});

//POST - edit profile
app.post("/edit-profile", (req, res) => {
    const data = req.body;
    let error = {};

    //check that first, last, email are not empty - TO DO: make customised errors
    if (!data.first || !data.last || !data.email) {
        error.message =
            "Please provide your first & last name and email address!";
        return res.render("editProfile", {
            title: "Please try again!",
            error,
            first: data.first,
            last: data.last,
            age: data.age,
            city: data.city,
            email: data.email,
            url: data.url,
        });
    }

    //check that the homepage input is a valid url
    if (data.url && !data.url.startsWith("http")) {
        error.message = "Please provide a valid homepage!";
        return res.render("editProfile", {
            title: "Please try again!",
            error,
            first: data.first,
            last: data.last,
            age: data.age,
            city: data.city,
            email: data.email,
        });
    }

    //sanitise & format data
    let cleanFirst = helpers.cleanString(data.first);
    let cleanLast = helpers.cleanString(data.last);
    let cleanEmail = data.email;
    cleanEmail = cleanEmail.toLowerCase();

    let cleanUrl;
    if (data.url) {
        cleanUrl = data.url;
        cleanUrl = cleanUrl.toLowerCase();
    }
    let cleanCity;
    if (data.city) {
        cleanCity = helpers.cleanString(data.city);
    }

    const userId = req.session.id;

    let userUpdatePromise;

    if (data.password) {
        userUpdatePromise = db.updateUserWithPassword(
            userId,
            cleanFirst,
            cleanLast,
            cleanEmail,
            data.password
        );
    } else {
        userUpdatePromise = db.updateUserWithoutPassword(
            userId,
            cleanFirst,
            cleanLast,
            cleanEmail
        );
    }

    let userProfilePromise = db.updateProfile(
        cleanUrl,
        cleanCity,
        data.age,
        userId
    );

    const allPromises = Promise.all([userUpdatePromise, userProfilePromise]);

    allPromises
        .then((results) => {
            console.log("update all-in-1 worked", results);
            return res.redirect("petition");
        })
        .catch((error) => {
            console.log("error in all-1-update", error);
            error.message = "Something went wrong. Please try again!";
            res.render("editProfile", {
                title: "Please try again!",
                error,
                first: data.first,
                last: data.last,
                age: data.age,
                city: data.city,
                email: data.email,
                url: data.url,
            });
        });
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

//POST - delete signature
app.post("/signature-delete", (req, res) => {
    const userId = req.session.id;

    db.deleteSignature(userId)
        .then(() => {
            console.log("signature was deleted successfully");
            //update the cookie
            req.session.signed = false;
            //TO DO: re-render petition page with message
            // const error = {
            //     message:
            //         "Your signature was deleted successfully. You can re-add your signature anytime below.",
            // };

            return res.redirect("petition");
        })
        .catch((err) => {
            console.log("error in deleting signature", err);
            res.sendStatus(500);
        });
});

//GET - signers
app.get("/signers", (req, res) => {
    if (req.session.signed == true) {
        db.getSigners()
            .then((results) => {
                // console.log("signers of the petition", results.rows);
                const signers = results.rows;
                res.render("signers", {
                    title: "Signers of petition",
                    signers,
                    helpers: {
                        cityHyphen(city) {
                            return city.replaceAll(" ", "-");
                        },
                    },
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

//GET - signers by city (dynamic route)
app.get("/signers/:city", (req, res) => {
    let { city } = req.params;
    city = city.replaceAll("-", " ");
    city = helpers.cleanString(city);
    // console.log("city url", req.params.city);

    db.getSignersByCity(city)
        .then((results) => {
            console.log("these are the signers by city", results.rows);
            let signersByCity = results.rows;

            res.render("signersCity", {
                title: `Signers from ${city}`,
                signersByCity,
                city,
            });
        })
        .catch((err) => {
            console.log("error in getSignersByCIty", err);
            res.sendStatus(500);
        });
});

//GET - logout
app.get("/logout", (req, res) => {
    req.session = null;
    return res.redirect("/login");
});

//POST - delete account
app.post("/delete-account", (req, res) => {
    const userId = req.session.id;

    db.deleteAccount(userId)
        .then(() => {
            console.log("account delete was successful");
            //update the cookie and redirect to logout
            req.session = null;
            return res.redirect("register");
        })
        .catch((err) => {
            console.log("error in deleting account", err);
            res.sendStatus(500);
        });
});

// app.listen(PORT, () => console.log(`listening on port ${PORT}`));

app.listen(port, host, () => console.log(`listening on port ${port}`));
