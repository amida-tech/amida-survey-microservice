'use strict';

const winston = require('winston');

const config = require('./config');

module.exports = new (winston.Logger)({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true,
        }),
        //new winston.transports.File({
        //    filename: 'combined.log',
        //    level: 'info',
        //}),
    ],
    level: config.logging.level,
});
