'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');

const QuestionGenerator = require('./question-generator');

const questionTypes = QuestionGenerator.questionTypes();

const sectionGenerators = {
    oneLevel(surveyQuestions) {
        const count = surveyQuestions.length;
        if (count < 8) {
            throw new Error('Not enough questions for sections.');
        }
        const sections = Array(3);
        sections[0] = { name: 'section_0', description: 'section_0_description', questions: _.range(0, 6, 2).map(index => surveyQuestions[index]) };
        sections[1] = { name: 'section_1', description: 'section_1_description', questions: _.range(1, 6, 2).map(index => surveyQuestions[index]) };
        sections[2] = { name: 'section_2', description: 'section_2_description', questions: _.rangeRight(count - 3, count).map(index => surveyQuestions[index]) };
        return sections;
    },
    oneLevelMissingName(surveyQuestions) {
        const sections = sectionGenerators.oneLevel(surveyQuestions);
        delete sections[0].name;
        delete sections[0].description;
        delete sections[sections.length - 1].name;
        delete sections[sections.length - 1].description;
        return sections;
    },
    twoLevel(surveyQuestions) {
        const sections = sectionGenerators.oneLevel(surveyQuestions);
        const lastIndex = sections.length - 1;
        sections[lastIndex].name = 'parent_1';
        return [
            { name: 'parent_0', sections: sections.slice(0, lastIndex) },
            sections[2],
        ];
    },
};

module.exports = class SurveyGenerator {
    constructor(questionGenerator, predecessor) {
        this.questionGenerator = questionGenerator || new QuestionGenerator();
        if (predecessor) {
            this.surveyIndex = predecessor.surveyIndex;
        } else {
            this.surveyIndex = -1;
        }
        this.sectionGenerators = ['twoLevel', 'oneLevelMissingName', 'oneLevel'].map(key => sectionGenerators[key]);
    }

    newSurveyGenerator(SurveyGeneratorClass) {
        return new SurveyGeneratorClass(this.questionGenerator, this);
    }

    currentIndex() {
        return this.surveyIndex;
    }

    incrementIndex() {
        this.surveyIndex += 1;
    }

    sectionType() {
        return this.surveyIndex % 4;
    }

    count() { // eslint-disable-line class-methods-use-this
        return null;
    }

    newSurveyQuestion(index, question) {
        if (!question) {
            question = this.questionGenerator.newQuestion();
        }
        question.required = Boolean(index % 2);
        return question;
    }

    newBody() {
        this.surveyIndex += 1;
        const surveyIndex = this.surveyIndex;
        const name = `name_${surveyIndex}`;
        const result = { name };
        if (surveyIndex % 2 === 0) {
            result.description = `description_${surveyIndex}`;
        }
        const metaIndex = surveyIndex % 3;
        if (metaIndex > 0) {
            result.meta = {
                displayAsWizard: metaIndex === 1,
                saveProgress: metaIndex === 2,
            };
        }
        return result;
    }

    newSurvey(options = {}) {
        //console.log("hopefully this will createa survey with sections")
        const result = this.newBody();
        if (options.status) {
            result.status = options.status;
        }
        const sectionType = options.noSection ? 0 : this.sectionType();
        let count = this.count();
        if (!count) {
            count = sectionType ? 10 : questionTypes.length + 1;
        }
        const surveyQuestions = _.range(count).map(index => this.newSurveyQuestion(index));
        const sectionGroup = this.surveyIndex % 8 >= 4;
        if (!options.noSection && !options.noQuestionGroup && sectionGroup) {
            const questionGroupIndex = (this.surveyIndex % 3) + 2;
            const sectionCount = 3 - (this.surveyIndex % 3);
            const sectionSurveyQuestions = _.range(sectionCount).map(index => this.newSurveyQuestion(index));
            surveyQuestions[questionGroupIndex].sections = [{ questions: [...sectionSurveyQuestions] }];
            if (this.surveyIndex % 2) {
                const r = _.range(sectionCount).map(index => this.newSurveyQuestion(index));
                surveyQuestions[questionGroupIndex].sections.push({ name: 'addl_section_name', questions: [...r] });
            }
        }
        if (!sectionType) {
            result.questions = surveyQuestions;
            return result;
        }
        result.sections = this.sectionGenerators[sectionType - 1](surveyQuestions);
        return result;
    }

    newSurveyQuestionIds(questionIds, options = {}) {
        this.surveyIndex += 1;
        const surveyIndex = this.surveyIndex;
        const name = `name_${surveyIndex}`;
        const result = { name };

        if(options.noSection === false) {

            let sectionCount = this._getSectionsCount(questionIds)
            let sectionSize = Math.floor(questionIds.length / sectionCount) === 0 ? 1 : Math.floor(questionIds.length / sectionCount);
            let sections = _.range(sectionCount).map(index => {
                let questions = _.slice(questionIds,(index * sectionSize), (index * sectionSize) + sectionSize);
                return { questions };
            })
            if(sectionSize * sectionCount < questionIds.length) {
                let questions = _.slice(questionIds,(sectionSize * sectionCount), questionIds.length);
                sections.push({questions});
            }
            sections.forEach( (section, indx) => {
                section.name  = `section_${indx}`
                section.description = `description_${indx}`
                section.questions = section.questions.map((id) => {
                    let required = Boolean(surveyIndex % 2);
                    if (options.noneRequired) {
                        required = false;
                    }
                    return { id, required };
                });

            })
            result.sections = sections;

        } else {
            result.questions = questionIds.map((id) => {
                let required = Boolean(surveyIndex % 2);
                if (options.noneRequired) {
                    required = false;
                }
                return { id, required };
            });
        }

        return result;
    }

    _getSectionsCount(questionIds) {
        let sectionCount = 3 - (this.surveyIndex % 3);
        if(questionIds.length === 0) {
            return 1;
        }
        while(sectionCount > questionIds.length) {
            sectionCount = sectionCount - 1;
        }
        return sectionCount;
    }
};
