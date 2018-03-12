'use strict';

const Base = require('./base');

module.exports = class SectionDAO extends Base {
    listSurveySectionQuestions(surveySectionIds) {
        return this.db.SurveySectionQuestion.findAll({
            where: { surveySectionId: { $in: surveySectionIds } },
            attributes: ['surveySectionId', 'questionId'],
            raw: true,
            order: 'line',
        }).then(questions => {
            console.log("questions")
            console.log(questions)
            return questions
        });
    }

    groupSurveySectionQuestions(surveySectionIds) {
        return this.listSurveySectionQuestions(surveySectionIds)
            .then((surveySectionQuestions) => {
                const map = new Map(surveySectionIds.map(id => [id, []]));
                surveySectionQuestions.forEach(({ surveySectionId, questionId }) => {
                    const questions = map.get(surveySectionId);
                    questions.push(questionId);
                });
                return map;
            });
    }
};
