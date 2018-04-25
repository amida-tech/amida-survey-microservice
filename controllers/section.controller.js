'use strict';

const _ = require('lodash');
const intoStream = require('into-stream');

const shared = require('./shared.js');

exports.exportSections = function exportSections(req, res) {
    req.models.section.listSections({ scope: 'export' })
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};

exports.exportSectionscsv = function exportSectionscsv(req, res) {
    req.models.section.exportSectionscsv()
        .then((csvContent) => {
            res.header('Content-disposition', 'attachment; filename=section.csv');
            res.type('text/csv');
            res.status(200).send(csvContent);
        })
        .catch(shared.handleError(res));
};

exports.importSections = function importSections(req, res) {
    const csvFile = _.get(req, 'swagger.params.sectioncsv.value');
    const stream = intoStream(csvFile.buffer);
    req.models.section.importSections(stream)
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
};
