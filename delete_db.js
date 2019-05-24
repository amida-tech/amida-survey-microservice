'use strict';

const pg = require('pg');
const config = require('./config');
const logger = require('./logger.js');

const conStringPri = `postgres://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/postgres`;

pg.connect(conStringPri, (err, client, done) => { // eslint-disable-line no-unused-vars
    if (err) {
        logger.error('delete_db.js: Failed to connect to database. Threw error:');
        logger.error(err);
        process.exit(1);
    }
    client.query(`DROP DATABASE IF EXISTS "${config.db.name}";`, (err1) => { // eslint-disable-line no-unused-vars
        if (err1) {
            logger.error('delete_db.js: Failed to connect to database. Threw error:');
            logger.error(err1);
            process.exit(1);
        }
        logger.info('Database Deleted:', config.db.name); // eslint-disable-line no-console
        process.exit(0);
    });
});
