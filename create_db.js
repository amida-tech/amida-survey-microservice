'use strict';

const pg = require('pg');
const config = require('./config');

const conStringPri = `postgres://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/postgres`;

pg.connect(conStringPri, (err, client, done) => { // eslint-disable-line no-unused-vars
    if (err) {
        console.log('Database connection failed:', err); // eslint-disable-line no-console
        process.exit(1);
    }
    // create the db and ignore any errors, for example if it already exists.
    client.query(`CREATE DATABASE "${config.db.name}";`, (err1) => { // eslint-disable-line no-unused-vars
        // If in test mode and a database exists don't let it get created
        if (err1) {
            console.log(`Database Creation Failed. Please check to see if the database "${config.db.name}" already exists if so please delete it`); // eslint-disable-line no-console
            process.exit(1);
        } else {
            console.log('Database Creation Succeeded:', config.db.name); // eslint-disable-line no-console
            process.exit(0);
        }
    });
});
