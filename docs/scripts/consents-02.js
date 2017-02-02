'use strict';

module.exports = function (locals) {
    console.log(`------ start ${module.filename}`);

    return locals.agent
        .get('http://localhost:9005/api/v1.0/consents')
        .then(res => {
            console.log(res.status); // 200
            console.log(JSON.stringify(res.body, undefined, 4)); // list of consents
        })
        .then(() => {
            console.log(`------ end ${module.filename}`);
            return locals;
        });
};