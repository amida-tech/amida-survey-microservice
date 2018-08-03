'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const demoSurvey4 = {
    name: 'Another Round of Basic Questions',
    questions: [
        {
            text: 'Have you been diagnosed with Cancer?',
            required: true,
            type: 'bool',
        },
        {
            text: 'How old are you?',
            required: true,
            type: 'choice',
            choices: [
              { text: 'Younger than 40' },
              { text: '40-49' },
              { text: '50-59' },
              { text: '60-69' },
              { text: '70+' },
            ],
        },
        {
            text: 'Select any other organs you have had medical conditions with.',
            required: false,
            type: 'choices',
            choices: [
              { text: 'Liver' },
              { text: 'Lungs' },
              { text: 'Heart' },
              { text: 'Other' },
            ],
        },
        {
            text: 'Where do you live?',
            required: true,
            type: 'text',
        }],
};

const demoSurvey5 = {
    name: 'Yet More Additional Basic Questions',
    questions: [
        {
            text: 'Are you involved in any treatments?',
            required: true,
            type: 'bool',
        },
        {
            text: 'What is your sex?',
            required: true,
            type: 'choice',
            choices: [
              { text: 'Female' },
              { text: 'Male' },
              { text: 'Other' },
            ],
        },
        {
            text: 'Select any over the counter drugs your currently take.',
            required: false,
            type: 'choices',
            choices: [
              { text: 'Claritin' },
              { text: 'Aspirin' },
              { text: 'Ibuprofen' },
              { text: 'Robitussin' },
            ],
        },
        {
            text: 'How many times do you visit the doctor each year?',
            required: true,
            type: 'integer',
        }],
};
const demoSurvey6 = {
    name: 'Another Advanced Survey',
    questions: [
        {
            text: 'Do you have bowel problems?',
            required: true,
            type: 'bool',
        },
        {
            text: 'Select any bad habits you currently have.',
            required: true,
            type: 'choices',
            choices: [
              { text: 'Smoking' },
              { text: 'Drinking' },
              { text: 'Lack of Exercise' },
              { text: 'High Fat Diet' },
              { text: 'Other', type: 'text' },
            ],
        }],
};

const demoSurveys2 = [
    demoSurvey4,
    demoSurvey5,
    demoSurvey6,
];

module.exports = {
    demoSurveys2,
};
