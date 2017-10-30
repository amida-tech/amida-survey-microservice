'use strict';

exports.healthCheck = function healthCheck(req, res) {
    return res.status(200).json({ code: 200, message: 'OK' });
};
