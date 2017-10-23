'use strict';

/* eslint no-console: 0 */

const config = require('./config');
const appGenerator = require('./app-generator');
const modelsGenerator = require('./models/generator');

const demoSurveySeed = require('./test/util/demo-survey-seed');
const demoSurveys = require('./test/fixtures/example/demo-survey');

const schema = appGenerator.extractSchema(config.db.schema) || 'public';
const models = modelsGenerator(schema);

const initializeData = function (m) {
    return demoSurveySeed(demoSurveys, m);
};

const sschema = Array.isArray(schema) ? schema[0] : schema;

models.sequelize.query(`SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = '${sschema}' AND table_name = 'survey_user'`, { type: models.sequelize.QueryTypes.SELECT })
    .then((result) => {
        if (result[0].count === '0') {
            return models.sequelize.sync({ force: true })
                .then(() => {
                    if (Array.isArray(schema)) {
                        let pxs = null;
                        schema.forEach((r) => {
                            const px = initializeData(models[r]).then(() => console.log(`${r} initialized.`));
                            if (pxs) {
                                pxs = pxs.then(() => px);
                            } else {
                                pxs = px;
                            }
                        });
                        return pxs;
                    }
                    return initializeData(models);
                })
                .then(() => console.log('success'));
        }
        console.log('already initialized');
        return null;
    })
    .then(() => process.exit(0))
    .catch((err) => {
        console.log('failure');
        console.log(err);
        process.exit(1);
    });
