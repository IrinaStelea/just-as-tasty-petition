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

//get number of signers - this is not necessary as the data is already accessible via the getSigners function
// module.exports.getCount = () => {
//     return db.query(`SELECT COUNT(*) FROM signatures`);
// };

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
