let databaseUrl;
if (process.env.NODE_ENV === "production") {
    databaseUrl = process.env.DATABASE_URL;
} else {
    const {
        DB_USER,
        DB_PASSWORD,
        DB_HOST,
        DB_PORT,
        DB_NAME,
    } = require("./secrets.json");
    databaseUrl = `postgres:${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

const spicedPg = require("spiced-pg");
const bcrypt = require("bcryptjs");
const db = spicedPg(databaseUrl);

//function for hashing the password
function hashPassword(pass) {
    return (
        bcrypt
            .genSalt()
            .then((salt) => {
                return bcrypt.hash(pass, salt);
            })
            //generate the hash
            .then((hashedPassword) => {
                return hashedPassword;
            })
    );
}

//registration
module.exports.insertUser = (first, last, email, password) => {
    return hashPassword(password).then((hashedPass) => {
        return db.query(
            //add user to users table returning the id & first name to store in the cookie session
            `
            INSERT INTO users(first, last, email, password)
            VALUES ($1, $2, $3, $4) RETURNING id, first`,
            [first, last, email, hashedPass]
        );
    });
};

//update user profile including password
module.exports.updateUserWithPassword = (id, first, last, email, password) => {
    return hashPassword(password).then((hashedPass) => {
        return db.query(
            `UPDATE users SET first=$2, last=$3, email=$4, password=$5 WHERE id=$1`,
            [id, first, last, email, hashedPass]
        );
    });
};

//update user profile excluding password
module.exports.updateUserWithoutPassword = (id, first, last, email) => {
    return db.query(
        `UPDATE users SET first=$2, last=$3, email=$4 WHERE id=$1`,
        [id, first, last, email]
    );
};

//upsert query for updating the city, age and homepage
module.exports.updateProfile = (url, city, age, userId) => {
    return db.query(
        `
    INSERT INTO profiles(url, city, age, user_id) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE SET url=$1, city=$2, age=$3`,
        [url, city, age || null, userId]
    );
};

//create user profile
module.exports.insertProfile = (url, city, age, userId) => {
    return db.query(
        `
    INSERT INTO profiles(url, city, age, user_id) 
    VALUES ($1, $2, $3, $4)`,
        [url, city, age || null, userId]
    );
};

//get user profile
module.exports.getProfile = (userId) => {
    return db.query(
        `SELECT * from users FULL OUTER JOIN profiles ON users.id = profiles.user_id WHERE users.id=$1`,
        [userId]
    );
};

//login - check if email is in the db and if the user has signed - note the syntax to rename the id in the signatures table
module.exports.findUser = (email) => {
    return db.query(
        `SELECT users.*, signatures.id as signature_id FROM users LEFT JOIN signatures ON users.id=signatures.user_id WHERE email=$1`,
        [email]
    );
};

//get all petition signers
module.exports.getSigners = () => {
    return db.query(
        `SELECT * from users LEFT OUTER JOIN signatures ON users.id = signatures.user_id LEFT OUTER JOIN profiles ON users.id = profiles.user_id WHERE signatures.signature IS NOT NULL`
    );
};

//get signers by city - join on signatures & profiles, dropping users who do not have a signature; note the use of "LOWER" for case sensitivity
module.exports.getSignersByCity = (city = null) => {
    return db.query(
        `SELECT * from users LEFT OUTER JOIN signatures ON users.id = signatures.user_id LEFT OUTER JOIN profiles ON users.id = profiles.user_id WHERE signatures.signature IS NOT NULL AND LOWER(profiles.city) = LOWER($1)`,
        [city || null]
    );
};

//get signature of signed in user
module.exports.getSignature = (id) => {
    return db.query(`SELECT signature FROM signatures WHERE user_id=$1`, [id]);
};

//add signer returning the id in case of success
module.exports.addSigner = (userId, signature) => {
    return db.query(
        `
    INSERT INTO signatures(user_id, signature) 
    VALUES ($1, $2) RETURNING id`,
        [userId, signature]
    );
};

//delete the signature
module.exports.deleteSignature = (userId) => {
    return db.query(`DELETE FROM signatures WHERE user_id=$1`, [userId]);
};

//delet the entire account - this will delete the user data, profile info and signature bc of the "on delete cascade" constraint
module.exports.deleteAccount = (userId) => {
    return db.query(`DELETE FROM users WHERE id=$1`, [userId]);
};
