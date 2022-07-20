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

//profile
module.exports.insertProfile = (url, city, age, userId) => {
    return db.query(
        `
    INSERT INTO profiles(url, city, age, user_id) 
    VALUES ($1, $2, $3, $4)`,
        [url, city, age || null, userId]
    );
};

//login function
module.exports.findUser = (email) => {
    return db.query(`SELECT * FROM users WHERE email = '${email}'`);
};

module.exports.getSigners = () => {
    // return db.query(`SELECT * FROM signatures`);

    return db.query(
        `SELECT * from users LEFT OUTER JOIN signatures ON users.id = signatures.user_id LEFT OUTER JOIN profiles ON users.id = profiles.user_id WHERE signatures.signature IS NOT NULL`
    );
    // - join on profiles
    // - join on signatures
    // WHERE clause for the city pages
    // ).then(({rows}) => rows.map(({first, last}) => ({} //throw away all the users that do not have a connected signature)
};

module.exports.getSignature = (id) => {
    return db.query(`SELECT signature FROM signatures WHERE user_id = '${id}'`);
};

//add returning statement to get the id of the current entry as result of this function
module.exports.addSigner = (userId, signature) => {
    return db.query(
        `
    INSERT INTO signatures(user_id, signature) 
    VALUES ($1, $2) RETURNING id`,
        [userId, signature]
    );
};
