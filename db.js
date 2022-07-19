const spicedPg = require("spiced-pg");
const username = "postgres";
const password = "postgres";
const database = "petition"; //this is the database
const bcrypt = require("bcryptjs");
const db = spicedPg(
    `postgres:${username}:${password}@localhost:5432/${database}`
);

//function for hashing the password; important to return in first row otherwise it won't work!
function hashPassword(pass) {
    return (
        bcrypt
            .genSalt()
            .then((salt) => {
                return bcrypt.hash(pass, salt);
            })
            //generate the hash
            .then((hashedPassword) => {
                // console.log("password in hash function", hashedPassword);
                return hashedPassword;
            })
    );
}

// function checkPassword(inputPass, regPass) {
//     return bcrypt.compare(inputPass, regPass).then((result) => {console.log("result from comparing the passwords", result)})
// }

//registration
module.exports.insertUser = (first, last, email, password) => {
    //return is important otherwise it won't return the promise
    return hashPassword(password).then((hashedPass) => {
        console.log("hashed pass", hashedPass);
        return db.query(
            //add user to users table returning the id & first name to store in the cookie session
            `
            INSERT INTO users(first, last, email, password)
            VALUES ($1, $2, $3, $4) RETURNING id, first`,
            [first, last, email, hashedPass]
        );
    });
};

//login function
module.exports.findUser = (email) => {
    return db.query(`SELECT * FROM users WHERE email = '${email}'`);
};

//login
// module.exports.authenticate = (email, password) {
//     return db.query(`SELECT password from users WHERE email = ${email}`);
// }

module.exports.getSigners = () => {
    return db.query(`SELECT * FROM signatures`);
};

module.exports.getSignature = (id) => {
    return db.query(`SELECT signature FROM signatures WHERE id = '${id}'`);
};

//add returning statement to get the id of the current entry as result of this function
module.exports.addSigner = (first, last, signature, date) => {
    return db.query(
        `
    INSERT INTO signatures(first, last, signature, signed_at) 
    VALUES ($1, $2, $3, $4) RETURNING id`,
        [first, last, signature, date]
    );
};
