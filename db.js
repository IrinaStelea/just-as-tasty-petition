const spicedPg = require("spiced-pg");
const username = "postgres";
const password = "postgres";
const database = "petition"; //this is the database
const db = spicedPg(
    `postgres:${username}:${password}@localhost:5432/${database}`
);

module.exports.getSigners = () => {
    return db.query(`SELECT * FROM signatures`);
};

module.exports.addSigner = (first, last, signature, signed_at) => {
    return db.query(
        `
    INSERT INTO signatures(first, last, signature, signed_at) 
    VALUES ($1, $2, $3, $4)`,
        [first, last, signature, signed_at]
    );
};
