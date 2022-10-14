const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const db = require("./db.js");
const helpers = require("./helpers.js");

const PORT = process.env.PORT || 8080;
const COOKIE_SECRET =
    process.env.COOKIE_SECRET || require("./secrets.json").COOKIE_SECRET;

//handlebars configuration
app.engine("handlebars", hb.engine());
app.set("view engine", "handlebars");

//https redirect middleware
if (process.env.NODE_ENV == "production") {
    app.use((req, res, next) => {
        if (req.headers["x-forwarded-proto"].startsWith("https")) {
            return next();
        }
        res.redirect(`https://${req.hostname}${req.url}`);
    });
}

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

//all routes - redirect to registration if not logged in
app.get("*", (req, res, next) => {
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
    res.redirect("/registration");
});

//GET route - registration
app.get("/registration", (req, res) => {
    if (!req.session.id) {
        res.render("registration", {
            title: "Just as tasty / Registration",
            confirmation: req.session.message, //for case when user has just deleted account and is redirected to registration: send confirmation message stored in cookie
        });
    } else {
        res.redirect("/petition");
    }
    //clear the confirmation message
    req.session.message = null;
});

//POST route - registration
app.post("/registration", (req, res) => {
    //grab the info from the registration form
    const data = req.body;

    //form validation
    let error = { message: "" };
    if (!data.first || !data.last || !data.email || !data.password) {
        error.message += "Please complete all fields \n";
    }

    //email validation
    if (data.email) {
        let lastAtPos = data.email.lastIndexOf("@");
        let lastDotPos = data.email.lastIndexOf(".");
        if (
            !(
                lastAtPos < lastDotPos &&
                lastAtPos > 0 &&
                data.email.indexOf("@@") == -1 &&
                lastDotPos > 2 &&
                data.email.length - lastDotPos > 2
            )
        ) {
            error.message += "Please provide a valide email \n";
        }
    }
    //password validation
    if (data.password && data.password.length < 6) {
        error.message += "Password must have at least 6 characters \n";
    }

    if (error.message !== "") {
        return res.render("registration", {
            title: "Please try again!",
            error,
            first: data.first,
            last: data.last,
            email: data.email,
        });
    }

    //sanitise the data
    let cleanFirst = helpers.cleanString(data.first);
    let cleanLast = helpers.cleanString(data.last);
    let cleanEmail = data.email;
    cleanEmail = cleanEmail.toLowerCase();

    db.insertUser(cleanFirst, cleanLast, cleanEmail, data.password)
        .then((results) => {
            //set the cookie session on the user id to keep track of login
            const id = results.rows[0].id;
            const firstName = results.rows[0].first;
            req.session = {
                id,
                firstName,
                signed: false,
            };
            // redirect to profile page
            res.redirect("profile");
        })
        .catch((err) => {
            console.log("error in adding new user", err);
            error.message = "Something went wrong. Please try again!";
            res.render("registration", { title: "Try again!", error });
        });
});

//GET route - login
app.get("/login", (req, res) => {
    if (!req.session.id) {
        res.render("login", { title: "Just as tasty / Login" });
    } else {
        res.redirect("/petition");
    }
});

//POST route - login
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

    db.findUser(data.email.toLowerCase())
        .then((userData) => {
            let inputPass = data.password;
            let regPass = userData.rows[0].password;
            //authenticate the user
            return bcrypt
                .compare(inputPass, regPass)
                .then((passComparison) => {
                    if (passComparison) {
                        //authentication successful
                        //set the cookie session on the userId to keep track of login
                        const id = userData.rows[0].id;
                        const firstName = userData.rows[0].first;
                        req.session = {
                            id,
                            firstName,
                        };
                        //check if user has already signed and redirect accordingly
                        if (userData.rows[0].signature_id) {
                            req.session.signed = true;
                            return res.redirect("thank-you");
                        } else {
                            req.session.signed = false;
                            return res.redirect("petition");
                        }
                    } else {
                        //authentication failed, passwords don't match
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

//GET route - profile
app.get("/profile", (req, res) => {
    res.render("profile", {
        title: "Profile",
        firstName: req.session.firstName,
    });
});

//POST route - profile
app.post("/profile", (req, res) => {
    const data = req.body;
    let error = { message: "" };
    const userId = req.session.id;

    //data validation
    //check that the age is a number
    if (data.age && !(!isNaN(data.age) && data.age >= 16 && data.age <= 100)) {
        error.message += "Please provide a valid age between 16 and 100! \n";
    }

    //check that the homepage input is a valid url
    if (data.url && !data.url.toLowerCase().startsWith("http")) {
        error.message += "Please provide a valid http(s) URL! \n";
    }

    if (error.message != "") {
        return res.render("profile", {
            title: "Please try again!",
            error,
            firstName: req.session.firstName,
        });
    }

    //convert url to lowercase
    let cleanUrl;
    if (data.url) {
        cleanUrl = data.url.toLowerCase();
    }

    //capitalise the city name
    let cleanCity;
    if (data.city) {
        cleanCity = helpers.cleanString(data.city);
    }

    if (data.age || data.url || data.city) {
        db.insertProfile(cleanUrl, cleanCity, data.age, userId)
            .then(() => {
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
            let signer = results.rows[0];
            res.render("editProfile", {
                title: "Edit profile",
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

    //error handling for missing/wrong data
    if (
        !data.first ||
        !data.last ||
        !data.email ||
        (data.password && data.password.length < 6 < 6) ||
        (data.url && !data.url.startsWith("http")) ||
        (data.age && !(!isNaN(data.age) && data.age >= 16 && data.age <= 100))
    ) {
        error.message = "Please provide:";
        if (!data.first) {
            let errorFirst = '<li class="error">your first name</li>';
            error.message += errorFirst;
        }

        if (!data.last) {
            let errorLast = '<li class="error">your last name</li>';
            error.message += errorLast;
        }
        if (!data.email) {
            let errorEmail = '<li class="error">your email</li>';
            error.message += errorEmail;
        }

        if (data.password && data.password.length < 6) {
            let errorPass =
                '<li class="error">a password of min 6 characters</li>';
            error.message += errorPass;
        }

        if (data.url && !data.url.startsWith("http")) {
            let errorUrl = '<li class="error">a valid http(s) URL</li>';
            error.message += errorUrl;
        }

        if (
            data.age &&
            !(!isNaN(data.age) && data.age >= 16 && data.age <= 100)
        ) {
            let errorAge =
                '<li class="error">a valid age between 16 and 100</li>';
            error.message += errorAge;
        }

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

    //sanitise & format data
    let cleanFirst = helpers.cleanString(data.first);
    let cleanLast = helpers.cleanString(data.last);
    let cleanEmail = data.email;
    cleanEmail = cleanEmail.toLowerCase();

    let cleanUrl;
    if (data.url) {
        cleanUrl = data.url.toLowerCase();
    }
    let cleanCity;
    if (data.city) {
        cleanCity = helpers.cleanString(data.city);
    }

    const userId = req.session.id;
    req.session.firstName = cleanFirst;

    //define promises based on whether user changed password or not
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
        .then(() => {
            return res.redirect("petition");
        })
        .catch((error) => {
            console.log("error profile update", error);
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

//GET route for petition
app.get("/petition", (req, res) => {
    if (req.session.signed == false) {
        //in case the user just deleted their signature, add the confirmation message stored in the cookie
        res.render("petition", {
            title: "Just as tasty / Sign",
            confirmation: req.session.message,
        });
        //clear the confirmation message
        req.session.message = null;
    } else {
        //if user has already signed, redirect to thank you page
        return res.redirect("/thank-you");
    }
});

//POST route for petition
app.post("/petition", (req, res) => {
    const data = req.body;
    const userId = req.session.id;
    db.addSigner(userId, data.signature)
        .then(() => {
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
            res.render("petition", { title: "Try again!", error });
        });
});

//GET route for thank you page
app.get("/thank-you", (req, res) => {
    if (req.session.signed == true) {
        db.getSigners()
            .then((results) => {
                const nbSigners = results.rowCount;
                //render the signature
                db.getSignature(req.session.id)
                    .then((results) => {
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
        //if the user has not signed and wants to access thank you, redirect to petition
        return res.redirect("/petition");
    }
});

//POST - delete signature
app.post("/signature-delete", (req, res) => {
    const userId = req.session.id;
    db.deleteSignature(userId)
        .then(() => {
            //signature delete successful -> update the cookie
            req.session.signed = false;
            req.session.message =
                "Your signature was deleted successfully. You can re-sign anytime below.";
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
                const signers = results.rows;
                //construct the city URLs
                for (let item of signers) {
                    let city = item.city;
                    item.cityLink = encodeURIComponent(city);
                }

                res.render("signers", {
                    title: "Just as tasty / Signers",
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

//GET signers by city (dynamic route)
app.get("/signers/:city", (req, res) => {
    let { city } = req.params;
    city = decodeURI(city);
    city = helpers.cleanString(city);

    db.getSignersByCity(city)
        .then((results) => {
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
    //clear the cookie
    req.session = null;
    return res.redirect("/");
});

//GET route for account deletion
app.get("/delete-account", (req, res) => {
    res.render("deleteAccount", {
        title: "Delete account",
    });
});

//POST route for account deletion
app.post("/delete-account", (req, res) => {
    const userId = req.session.id;
    db.deleteAccount(userId)
        .then(() => {
            //update the cookie and redirect to logout
            req.session = {};
            //set confirmation message in cookie
            req.session.message =
                "You have successfully deleted your account. You can re-register anytime below.";
            return res.redirect("register");
        })
        .catch((err) => {
            console.log("error in deleting account", err);
            res.sendStatus(500);
        });
});

//redirect all other routes to petition
app.get("*", (req, res) => {
    res.redirect("/petition");
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
