createdb petition

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS profiles;

CREATE TABLE users (
id SERIAL PRIMARY KEY,
first VARCHAR NOT NULL CHECK (first != ''),
last VARCHAR NOT NULL CHECK (last != ''),
email VARCHAR UNIQUE NOT NULL CHECK (email != ''),
password VARCHAR NOT NULL CHECK (password != ''),
created_at timestamp default current_timestamp
);

CREATE TABLE signatures (
id SERIAL PRIMARY KEY,
user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
signature VARCHAR NOT NULL CHECK (signature != ''),
signed_at timestamp DEFAULT current_timestamp
);

CREATE TABLE profiles (
id SERIAL PRIMARY KEY,
url VARCHAR,
city VARCHAR,
age INT,
user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE);