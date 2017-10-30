'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const demoSurvey1 = {
    name: 'Basic Questions',
    questions: [
        {
            text: 'Have you been diagnosed with Alzheimer\'s Disease?',
            required: true,
            type: 'bool',
        },
        {
            text: 'How old are you?',
            required: true,
            type: 'choice',
            choices: [
              { text: 'Younger than 50' },
              { text: '50-55' },
              { text: '55-60' },
              { text: '60-65' },
              { text: '65+' },
            ],
        },
        {
            text: 'Select any other conditions with which you\'ve been diagnosed.',
            required: false,
            type: 'choices',
            choices: [
              { text: 'Arthritis' },
              { text: 'Cancer' },
              { text: 'Heart Disease' },
              { text: 'Diabetes' },
            ],
        },
        {
            text: 'Where were you born?',
            required: true,
            type: 'text',
        }],
};

const demoSurvey2 = {
    name: 'Additional Basic Questions',
    questions: [
        {
            text: 'Do you have memory problems?',
            required: true,
            type: 'bool',
        },
        {
            text: 'What is your gender?',
            required: true,
            type: 'choice',
            choices: [
              { text: 'Female' },
              { text: 'Male' },
              { text: 'Non-binary' },
            ],
        },
        {
            text: 'Select any medications your currently take.',
            required: false,
            type: 'choices',
            choices: [
              { text: 'Donepezil ' },
              { text: 'Galantamine' },
              { text: 'Rivastigmine' },
              { text: 'Memantine' },
            ],
        },
        {
            text: 'What is your weight?',
            required: true,
            type: 'integer',
        }],
};
const demoSurvey3 = {
    name: 'Advanced Survey',
    questions: [
        {
            text: 'Do you have memory problems?',
            required: true,
            type: 'bool',
        },
        {
            text: 'Select any medications your currently take.',
            required: true,
            type: 'choices',
            choices: [
              { text: 'Donepezil ' },
              { text: 'Galantamine' },
              { text: 'Rivastigmine' },
              { text: 'Memantine' },
              { text: 'Other', type: 'text' },
            ],
        }],
};

const demoSurveys = [
    demoSurvey1,
    demoSurvey2,
    demoSurvey3,
];

module.exports = {
    demoSurveys,
};
