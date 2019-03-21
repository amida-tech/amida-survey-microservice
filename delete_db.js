'use strict';

const pg = require('pg');
const config = require('./config');

console.log(config.db);

const conStringPri = `postgres://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/postgres`;

pg.connect(conStringPri, (err, client, done) => { // eslint-disable-line no-unused-vars
    client.query(`DROP DATABASE IF EXISTS "${config.db.name}";`, (err1) => { // eslint-disable-line no-unused-vars
        console.log('Database Deleted:', config.db.name); // eslint-disable-line no-console
        process.exit(0);
    });
});
