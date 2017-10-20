## Survey Service Integration Document

### Introduction

This document gives examples for resources available in Survey Service API.

##### Code Snippets

All node.js code snippets in this document use [superagent](https://github.com/visionmedia/superagent).  This package can be installed by `npm`
```
$ npm install superagent
```

Package needs to be required before running the snippets
```js
const request = require('superagent');
const agent = request.agent();
```
`agent` stores cookies as they are returned from server.

Snippets in later stages of the document can depend on variables that are defined in previous snippets.  Each snippet is a promise and can be chained.  A full chain, [run-all.js](./run-all.js), that starts from a clean database and exercises most of the snippets is included in the repository.

##### Seed Data

Survey Service installations come with a super user.  In this document it is assumed that the username and password are `super` and `Am!d@2017PW` respectively.

### Authentication
<a name="authentication"/>

This API uses Basic Authentication where username and password are passed to an accompanying authentication service that provides a [JSON Web Token](https://jwt.io/) (JWT) as value of a cookie named `auth-jwt-token`.

### Authorization
<a name="authorization"/>

For all API resources that require authorization, the JWT cookie has to be included in the HTTP request.  Browsers and `superagent` do this automatically.

### HTTP Status Codes and Error Messages

This API uses the following HTTP status codes for success

- 200 (OK): Used for request when server responds with a resource (typically [GET]) in the response body.
- 201 (Created): Used for [POST] requests that create new resources.  New resource id is included in the response body (Ex: `{id: 5}`).
- 204 (No Content): Used for all requests (typically [PATCH] or [DELETE]) that contains no content in the response body.

In the case of error the following error codes are used

- 400 (Bad Request): Indicates bad parameter(s) is/are passed to the API.  This can be wrong input object format, invalid value (for example not existing id) or constraint violations such as trying to create a new user with the same username.
- 401 (Unauthorized): Indicates JWT specified in the Authorization header is invalid or does not correspond to an active user.
- 404 (Not Found): Indicates resource does not exist.
- 500 (Internal Server Error): Indicates an unexpected run time error.

When server responds with an error status, an error object is always included in the response body and minimally contains `message` property.

### System Administration
<a name="system-administration"/>

Before any participant can use the system, questions and surveys that are to be answered by the participants must be created.

This section discusses administrative API to achieve these tasks.  Majority of these tasks can also be done during installation with survey service specific system initialization scripts.  In addition the input format of resources (questions, surveys, etc.) are exemplified.


##### Questions

Questions can be created either individually or as part of a survey.  Either way they are stored independently than surveys and can be shared.

There are four basic types of questions: `text`, `bool`, `choice` and `choices`.

Text questions are the simplest kind where answers are expected to be free text

```js
let textQx = {
	type: 'text',
	text: 'Please describe reason for your enrollment?'
};
```

Bool questions are yes/no questions

```js
let boolQx = {
	type: 'bool',
	text: 'Do you own a pet?'
};
```

Choice questions are multiple choice questions where there is only one valid selection

```js
let choiceQx = {
    type: 'choice',
    text: 'What is your hair color?',
    oneOfChoices: [
        'Black',
        'Brown',
        'Blonde',
        'Other'
    ]
};
```

Choices questions are multiple choice questions where multiple selections are possible.  In addition some choices can be free text

```js
let choicesQx = {
    type: 'choices',
    text: 'What kind of exercises do you do?',
    choices: [
        { text: 'Walking' },
        { text: 'Jogging', type: 'bool' },
        { text: 'Cycling', type: 'bool' },
        { text: 'Please specify other', type: 'text' }
    ]
};
```

When not specified `type` property in a `choices` element is assumed to be `bool`.  Choice questions can also be specified in a similar format

```js
choiceQx = {
    type: 'choice',
    text: 'What is your hair color?',
    choices: [
        { text: 'Black'},
        { text: 'Brown'},
        { text: 'Blonde'},
        { text: 'Other'}
    ]
};
```

It an error to specify `type` for a `choices` element for a `choice` question.

Questions are created using the `/questions` resource

```js
let choiceQxId = null;
agent
	.post('http://localhost:9005/api/v1.0/questions')
	.send(choiceQx)
	.then(res => {
		console.log(res.status);  // 201
		console.log(res.body.id); // id of the new question
		choiceQxId = res.body.id;
	});
```

The server responds with the new question `id` in the response body.  In the rest of this document other questions specified in this section is also assumed to have been created similarly.

Questions can be soft deleted by `/questions/{id}` resource.  Questions can only be soft deleted if there are no active surveys that use the questions.

It is possible replace an existing question with a new version by including the query parameter `{ parent: id }` during creation.  In such cases the new and existing questions are linked in the database and the existing question is soft-deleted.  Currently there are no resources that expose linked questions on the API level.

##### Surveys
<a name="admin-surveys"/>

Surveys serve as question containers.  In the simplest case a survey can be defined with its questions.  In that case the questions are created on the fly when the survey is created

```js
let survey = {
    name: 'Example',
    questions: [{
        text: 'Which sports do you like?',
        required: false,
        type: 'choices',
        choices: [
            { text: 'Football' },
            { text: 'Basketball' },
            { text: 'Soccer' },
            { text: 'Tennis' }
        ]
    }, {
        text: 'What is your hair color?',
        required: true,
        type: 'choice',
        choices: [
            { text: 'Black' },
            { text: 'Brown' },
            { text: 'Blonde' },
            { text: 'Other' }
        ]
    }, {
        text: 'Where were you born?',
        required: true,
        type: 'text'
    }, {
        text: 'Are you injured?',
        required: false,
        type: 'bool'
    }]
};
```

Notice that for each question, it must be specified if the question is required to be answered.

Alternatively surveys can be defined using existing questions

```js
survey = {
    name: 'Example',
    questions: [{
        required: false,
        id: textQxId
    }, {
        required: true,
        id: boolQxId
    }, {
        required: true,
        id: choiceQxId
    }, {
        required: false,
        id: choicesQxId
    }]
};
```

A mix is also possible

```js
survey = {
    name: 'Example',
    questions: [{
        required: false,
        id: textQxId
    }, {
        required: true,
        id: boolQxId
    }, {
        text: 'What is your hair color?',
        required: true,
        type: 'choice',
        choices: [
            { text: 'Black' },
            { text: 'Brown' },
            { text: 'Blonde' },
            { text: 'Other' }
        ]
    }, {
        required: false,
        id: choicesQxId
    }]
};
```

Questions can be grouped into sections.  Currenly only one level deep sections are supported

```js
survey = {
    name: 'Example',
    questions: [{
        required: false,
        id: textQxId
    }, {
        required: true,
        id: boolQxId
    }, {
        text: 'What is your hair color?',
        required: true,
        type: 'choice',
        choices: [
            { text: 'Black' },
            { text: 'Brown' },
            { text: 'Blonde' },
            { text: 'Other' }
        ]
    }, {
        required: false,
        id: choicesQxId
    }]
};
```

In addition this API supports a client specific `meta` property which can be used to store any settings that relates to user interface or any other client setting

```js
survey = {
    name: 'Example',
    meta: {
        displayAsWizard: true,
        saveProgress: false
    },
    questions: [{
        required: false,
        id: textQxId
    }, {
        required: true,
        id: boolQxId
    }, {
        text: 'What is your hair color?',
        required: true,
        type: 'choice',
        choices: [
            { text: 'Black' },
            { text: 'Brown' },
            { text: 'Blonde' },
            { text: 'Other' }
        ]
    }, {
        required: false,
        id: choicesQxId
    }]
};
```

Survey `meta` property is stored as a JSON object and subproperties are not validated and fully client specific.  This property is not used in any business logic elsewhere.

Surveys are created using `/surveys` resource

```
let surveyId = null;
agent
	.post('http://localhost:9005/api/v1.0/surveys')
	.send(survey)
	.then(res => {
		console.log(res.status);  // 201
		console.log(res.body.id); // id of the new survey
		surveyId = res.body.id;
	});
```
The server responds with the new survey `id` in the response body.

Surveys can be soft deleted by `/surveys/{id}` resource.  It is also possible replace an existing survey with a new version by including the query parameter `{ parent: id }` during creation.  In such cases the new and existing surveys are linked in the database and the existing survey is soft-deleted.  Currently there are no resources that exposes linked surveys on the API level.

### Questions

A list of all questions is available using resource `/questions`

```js
agent
    .get('http://localhost:9005/api/v1.0/questions')
    .then(res => {
        console.log(res.status);  // 200
        const questionList = res.body;
        console.log(JSON.stringify(questionList, undefined, 4));
    });
```

Server responds with the list in the response body

```js
[
    {
        "id": 1,
        "type": "text",
        "text": "Please describe reason for your enrollment?"
    },
    {
        "id": 2,
        "type": "bool",
        "text": "Do you own a pet?"
    },
    {
        "id": 3,
        "type": "choice",
        "text": "What is your hair color?",
        "choices": [
            {
                "id": 1,
                "text": "Black"
            },
            {
                "id": 2,
                "text": "Brown"
            },
            {
                "id": 3,
                "text": "Blonde"
            },
            {
                "id": 4,
                "text": "Other"
            }
        ]
    },
    {
        "id": 4,
        "type": "choices",
        "text": "What kind of exercises do you do?",
        "choices": [
            {
                "id": 5,
                "type": "bool",
                "text": "Walking"
            },
            {
                "id": 6,
                "type": "bool",
                "text": "Jogging"
            },
            {
                "id": 7,
                "type": "bool",
                "text": "Cycling"
            },
            {
                "id": 8,
                "type": "text",
                "text": "Please specify other"
            }
        ]
    },
    {
        "id": 5,
        "type": "choice",
        "text": "What is your hair color?",
        "choices": [
            {
                "id": 9,
                "text": "Black"
            },
            {
                "id": 10,
                "text": "Brown"
            },
            {
                "id": 11,
                "text": "Blonde"
            },
            {
                "id": 12,
                "text": "Other"
            }
        ]
    },
    {
        "id": 6,
        "type": "choice",
        "text": "Gender",
        "choices": [
            {
                "id": 13,
                "text": "male"
            },
            {
                "id": 14,
                "text": "female"
            },
            {
                "id": 15,
                "text": "other"
            }
        ]
    },
    {
        "id": 7,
        "type": "text",
        "text": "Zip code"
    },
    {
        "id": 8,
        "type": "bool",
        "text": "Family history of memory disorders/AD/dementia?"
    },
    {
        "id": 9,
        "type": "choices",
        "text": "How did you hear about us?",
        "choices": [
            {
                "id": 16,
                "type": "bool",
                "text": "TV"
            },
            {
                "id": 17,
                "type": "bool",
                "text": "Radio"
            },
            {
                "id": 18,
                "type": "bool",
                "text": "Newspaper"
            },
            {
                "id": 19,
                "type": "bool",
                "text": "Facebook/Google Ad/OtherInternet ad"
            },
            {
                "id": 20,
                "type": "bool",
                "text": "Physician/nurse/healthcare professional"
            },
            {
                "id": 21,
                "type": "bool",
                "text": "Caregiver"
            },
            {
                "id": 22,
                "type": "bool",
                "text": "Friend/Family member"
            },
            {
                "id": 23,
                "type": "text",
                "text": "Other source"
            }
        ]
    }
]
```

Individual questions can be shown using `/questions/{id}` resource

```js
agent
    .get('http://localhost:9005/api/v1.0/questions/1')
    .then(res => {
        console.log(res.status);  // 200
        const question = res.body;
        console.log(JSON.stringify(question, undefined, 4));
    });
```

### Surveys
<a name="surveys"/>

A list of all surveys available using resource `/surveys`

```js
agent
	.get('http://localhost:9005/api/v1.0/surveys')
	.then(res => {
		console.log(res.status);  // 200
		const surveyList = res.body;
		console.log(JSON.stringify(surveyList, undefined, 4));
	});
```

Server responds with the list in the response body.  Each entry in the list includes `id` and `name` fields

```js
[
    {
        "id": 1,
        "name": "Example"
    },
    {
        "id": 2,
        "name": "Alzheimer"
    }
]
```

Individual surveys can be shown using `/surveys/{id}` resource

```js
agent
	.get('http://localhost:9005/api/v1.0/surveys/1')
	.then(res => {
		console.log(res.status);  // 200
		const survey = res.body;
		console.log(JSON.stringify(survey, undefined, 4));
	});
```

Server responds with all the survey details and in particular its questions

```js
{
    "id": 1,
    meta: {
        displayAsWizard: true,
        saveProgress: false
    },
    "name": "Example",
    "questions": [
        {
            "id": 1,
            "type": "text",
            "text": "Please describe reason for your enrollment?",
            "required": false
        },
        {
            "id": 2,
            "type": "bool",
            "text": "Do you own a pet?",
            "required": true
        },
        {
            "id": 5,
            "type": "choice",
            "text": "What is your hair color?",
            "choices": [
                {
                    "id": 9,
                    "text": "Black"
                },
                {
                    "id": 10,
                    "text": "Brown"
                },
                {
                    "id": 11,
                    "text": "Blonde"
                },
                {
                    "id": 12,
                    "text": "Other"
                }
            ],
            "required": true
        },
        {
            "id": 4,
            "type": "choices",
            "text": "What kind of exercises do you do?",
            "choices": [
                {
                    "id": 5,
                    "type": "bool",
                    "text": "Walking"
                },
                {
                    "id": 6,
                    "type": "bool",
                    "text": "Jogging"
                },
                {
                    "id": 7,
                    "type": "bool",
                    "text": "Cycling"
                },
                {
                    "id": 8,
                    "type": "text",
                    "text": "Please specify other"
                }
            ],
            "required": false
        }
    ]
}
```

Survey details include `id` fields for the survey, its questions, and question choices.

JSON definition of answers is an array of objects where each object includes the id of the question being answered and the actual answer

```js
const answers = [{
	questionId: 1,
	answer: { textValue: 'Try new medicine' }
}, {
	questionId: 2,
	answer: { boolValue: false }
}, {
	questionId: 5,
	answer: { choice: 4 }
}, {
	questionId: 4,
	answer: {
		choices: [{
			id: 5,
			boolValue: true
		}, {
			id: 7
		}, {
			id: 8,
			textValue: 'Soccer'
		}]
	}
}];
```

Notice that the format of the answer depends on the type of question.  It is an error to use properties for one type of question for the other.  For `choices` type questions `boolValue` property of individual choices can be safely omitted and defaults to `true`.  For bool type questions `boolValue` property is required.  Answers can be posted using `/answers` resource

```js
agent
	.post('http://localhost:9005/api/v1.0/answers')
	.send({ surveyId: 1, answers })
	.then(res => {
		console.log(res.status);  // 204
	});
```

Answers to a survey can be shown using `/answers` resource

```js
agent
	.get('http://localhost:9005/api/v1.0/answers')
	.query({ 'survey-id': 1})
	.then(res => {
		console.log(res.status);  // 200
		console.log(JSON.stringify(res.body, undefined, 4)); // answers
	});
```

Server responds with answers in the the response body and the format is identical to how answers are created except an additional language field which is by default is English (en).  Language field identifies the language that the participant saw the survey in and [dictated by the client](#language_spec)

```js
[
    {
        "questionId": 1,
        "language": "en",
        "answer": {
            "textValue": "Try new medicine"
        }
    },
    {
        "questionId": 2,
        "language": "en",
        "answer": {
            "boolValue": false
        }
    },
    {
        "questionId": 4,
        "language": "en",
        "answer": {
            "choices": [
                {
                    "id": 5,
                    "boolValue": true
                },
                {
                    "id": 7,
                    "boolValue": true
                },
                {
                    "id": 8,
                    "textValue": "Soccer"
                }
            ]
        }
    },
    {
        "questionId": 5,
        "language": "en",
        "answer": {
            "choice": 4
        }
    }
]
```

It is possible to show a survey with its answers using resource `/answered-surveys/{id}`

```js
agent
	.get('http://localhost:9005/api/v1.0/answered-surveys/1')
	.then(res => {
		console.log(res.status);  // 200
		console.log(JSON.stringify(res.body, undefined, 4)); // survey with answers
	});
```

Survey responds with the survey details in the response body.  Survey details is similar to `/surveys/{id}` resource response but also includes the answers for each question

```js
{
    "id": 1,
    "meta": {
        "displayAsWizard": true,
        "saveProgress": false
    },
    "name": "Example",
    "questions": [
        {
            "id": 1,
            "type": "text",
            "text": "Please describe reason for your enrollment?",
            "required": false,
            "language": "en",
            "answer": {
                "textValue": "Try new medicine"
            }
        },
        {
            "id": 2,
            "type": "bool",
            "text": "Do you own a pet?",
            "required": true,
            "language": "en",
            "answer": {
                "boolValue": false
            }
        },
        {
            "id": 5,
            "type": "choice",
            "text": "What is your hair color?",
            "choices": [
                {
                    "id": 9,
                    "text": "Black"
                },
                {
                    "id": 10,
                    "text": "Brown"
                },
                {
                    "id": 11,
                    "text": "Blonde"
                },
                {
                    "id": 12,
                    "text": "Other"
                }
            ],
            "required": true,
            "language": "en",
            "answer": {
                "choice": 4
            }
        },
        {
            "id": 4,
            "type": "choices",
            "text": "What kind of exercises do you do?",
            "choices": [
                {
                    "id": 5,
                    "type": "bool",
                    "text": "Walking"
                },
                {
                    "id": 6,
                    "type": "bool",
                    "text": "Jogging"
                },
                {
                    "id": 7,
                    "type": "bool",
                    "text": "Cycling"
                },
                {
                    "id": 8,
                    "type": "text",
                    "text": "Please specify other"
                }
            ],
            "required": false,
            "language": "en",
            "answer": {
                "choices": [
                    {
                        "id": 5,
                        "boolValue": true
                    },
                    {
                        "id": 7,
                        "boolValue": true
                    },
                    {
                        "id": 8,
                        "textValue": "Soccer"
                    }
                ]
            }
        }
    ]
}
```

### User Surveys
<a name="user-surveys"/>

This API supports use cases where a survey has a status for each participant. Possible status values are `new`, `in-progress` and `completed`. It is clients responsibility to assign status.  To mark a survey `completed` each required question has to be answered; status `in-progress` status allows partial answers where required questions might be left unanswered.

Resource `/user-surveys` is used to list surveys and their status for a user

```js
agent
    .get('http://localhost:9005/api/v1.0/user-surveys')
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // survey list with status with answers
    });
```

Server responds with the list of user surveys in the body

```js
[
    {
        "id": 1,
        "name": "Example",
        "status": "new"
    },
    {
        "id": 2,
        "name": "Alzheimer",
        "status": "new"
    }
]

```

A parameter called "user-survey-status" can be added to filter by status

```js
agent
    .get('http://localhost:9005/api/v1.0/user-surveys?user-survey-status=complete')
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // survey list with status with answers
    });
```

Server responds with the list of user surveys in the body, filtered by status

```js
[
    {
        "id": 3,
        "name": "Completed3",
        "status": "completed"
    },
    {
        "id": 4,
        "name": "Completed4",
        "status": "completed"
    }
]

```


Status can be changed when answering the survey using resource `/user-surveys/{id}/answers`.  If status is set to `in-progress` required questions can be left unanswered

```js
const answers = [{
    questionId: 2,
    answer: { boolValue: true }
}, {
    questionId: 5,
    answer: { choice: 6 }
}];

agent
    .post('http://localhost:9005/api/v1.0/user-surveys/1/answers')
    .send({ status: 'in-progress', answers })
    .then(res => {
        console.log(res.status);  // 204
    });
```

Answers and status are available using resource `/user-surveys/{id}/answers`

```js
agent
    .get('http://localhost:9005/api/v1.0/user-surveys/1/answers')
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // answers with status
    });
```

Server responds with the answers in the body

```js
{
    "status": "in-progress",
    "answers": [
        {
            "questionId": 2,
            "language": "en",
            "answer": {
                "boolValue": true
            }
        },
        {
            "questionId": 5,
            "language": "en",
            "answer": {
                "choice": 6
            }
        }
    ]
}
```

List of user surveys reflect to status change

```
[
    {
        "id": 1,
        "name": "Example",
        "status": "in-progress"
    },
    {
        "id": 2,
        "name": "Alzheimer",
        "status": "new"
    }
]
```

Additional answers can be added and status can be changed to `completed`

```js
const answers = [{
    questionId: 1,
    answer: { textValue: 'Try another medicine' }
}, {
    questionId: 4,
    answer: {
        choices: [{
            id: 5,
            boolValue: true
        }, {
            id: 8,
            textValue: 'Basketball'
        }]
    }
}];

agent
    .post('http://localhost:9005/api/v1.0/user-surveys/1/answers')
    .send({ status: 'completed', answers })
    .then(res => {
        console.log(res.status);  // 204
    });
```

Answers and status are also available using resource `/user-surveys/{id}`.  This resource responds with answers as parts of questions

```js
agent
    .get('http://localhost:9005/api/v1.0/user-surveys/1')
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // answers with status
    });
```

Server responds with the answered survey and the status in the body

```js
{
    "status": "completed",
    "survey": {
        "id": 1,
        "meta": {
            "displayAsWizard": true,
            "saveProgress": false
        },
        "name": "Example",
        "questions": [
            {
                "id": 1,
                "type": "text",
                "text": "Please describe reason for your enrollment?",
                "required": false,
                "language": "en",
                "answer": {
                    "textValue": "Try another medicine"
                }
            },
            {
                "id": 2,
                "type": "bool",
                "text": "Do you own a pet?",
                "required": true,
                "language": "en",
                "answer": {
                    "boolValue": true
                }
            },
            {
                "id": 5,
                "type": "choice",
                "text": "What is your hair color?",
                "choices": [
                    {
                        "id": 9,
                        "text": "Black"
                    },
                    {
                        "id": 10,
                        "text": "Brown"
                    },
                    {
                        "id": 11,
                        "text": "Blonde"
                    },
                    {
                        "id": 12,
                        "text": "Other"
                    }
                ],
                "required": true,
                "language": "en",
                "answer": {
                    "choice": 6
                }
            },
            {
                "id": 4,
                "type": "choices",
                "text": "What kind of exercises do you do?",
                "choices": [
                    {
                        "id": 5,
                        "type": "bool",
                        "text": "Walking"
                    },
                    {
                        "id": 6,
                        "type": "bool",
                        "text": "Jogging"
                    },
                    {
                        "id": 7,
                        "type": "bool",
                        "text": "Cycling"
                    },
                    {
                        "id": 8,
                        "type": "text",
                        "text": "Please specify other"
                    }
                ],
                "required": false,
                "language": "en",
                "answer": {
                    "choices": [
                        {
                            "id": 5,
                            "boolValue": true
                        },
                        {
                            "id": 8,
                            "textValue": "Basketball"
                        }
                    ]
                }
            }
        ]
    }
}
```

### Multi Lingual Support
<a name="multi-lingual-support"/>

This API follows an English first approach where every newly created resource is assumed to be in English. After the resource is created, user facing fields of resources can be translated into any language.

##### Languages

This section describes preloaded language definitions and how to add a new language to the system.

Survey Service installations are preloaded with languages that can be listed by `/languages` resource

```js
agent
    .get('http://localhost:9005/api/v1.0/languages')
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // list of languages
    });
```

Server responds with a list of languages preloaded to the system in the body

```js
[
    {
        "code": "en",
        "name": "English",
        "nativeName": "English"
    },
    {
        "code": "es",
        "name": "Spanish",
        "nativeName": "Español"
    },
    {
        "code": "fr",
        "name": "French",
        "nativeName": "Le français"
    },
    {
        "code": "jp",
        "name": "Japanese",
        "nativeName": "日本語"
    },
    {
        "code": "ru",
        "name": "Russian",
        "nativeName": "Русский"
    }
]
```

Any new language can be created using `/languages` resource

```js
const newLanguage = {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe'
};

agent
    .post('http://localhost:9005/api/v1.0/languages')
    .send(newLanguage)
    .then(res => {
        console.log(res.status);  // 201
        console.log(res.body);    // code of the new language
    });
```

Languages API does not check validity of the two digit ISO codes.  There letter ISO codes or any other language encoding can be used if necessary.  Codes are used in other resources to identify the language and are the only language resource property that are used elsewhere in this API.

Any existing language detail can be shown individually

```js
agent
    .get('http://localhost:9005/api/v1.0/languages/es')
    .then(res => {
        console.log(res.status); // 200
        console.log(res.body);  // definition of spanish
    });
```

Server responds with language details in the body

```js
{
    "code": "es",
    "name": "Spanish",
    "nativeName": "Español"
}
```

Existing languages, including the preloaded ones, can the updated

```js
const languageUpdate = {
    name: 'Castilian Spanish',
    nativeName: 'Castillan'
};

agent
    .patch('http://localhost:9005/api/v1.0/languages/es')
    .send(languageUpdate)
    .then(res => {
        console.log(res.status);  // 204
    });
```

Language code updates are not allowed.  To use a new code for an existing language, the existing language resource has to deleted and recreated with the new code. Deleting a language is possible using `/languages/{code}` resource

```js
agent
    .delete('http://localhost:9005/api/v1.0/languages/fr')
    .then(res => {
        console.log(res.status);  // 204
    });
```

Deleting language resources are only allowed if no other active resource exists in or refer to that language. All changes can be verified listing the languages using `/languages` resource

```js
[
    {
        "code": "en",
        "name": "English",
        "nativeName": "English"
    },
    {
        "code": "es",
        "name": "Castilian Spanish",
        "nativeName": "Castillan"
    },
    {
        "code": "jp",
        "name": "Japanese",
        "nativeName": "日本語"
    },
    {
        "code": "ru",
        "name": "Russian",
        "nativeName": "Русский"
    },
    {
        "code": "tr",
        "name": "Turkish",
        "nativeName": "Türkçe"
    }
]
```

##### Translations

Every resource field in this API that is designed to be user facing (shown to user in a user interface) can be translated into any language that is defined as a language resource. Such fields are referred as `text` fields.

Translations are available to any [GET] request by specifying the language as an url query parameter. If a language is specified as a query parameter but the translation does not exist, server always responds with the English version instead.

English versions of text fields can be updated using the same resources that translates and is specified below; `en` specified as language code for this case.

###### Questions

All question text fields are translated by `/questions/text/{language}` resource

```js
const choicesQxTurkish = {
    'id': 4,
    'text': 'Hangi eksersizleri yapıyorsunuz?',
    'choices': [
        {
            'id': 5,
            'text': 'Yürüyüş'
        },
        {
            'id': 6,
            'text': 'Yavaş Koşu'
        },
        {
            'id': 7,
            'text': 'Koşu'
        },
        {
            'id': 8,
            'text': 'Lütfen başka bir eksersiz belirtiniz.'
        }
    ]
};

agent
    .patch('http://localhost:9005/api/v1.0/questions/text/tr')
    .send(choicesQxTurkish)
    .then(res => {
        console.log(res.status);  // 204
    });
```

Translations are available to any [GET] method that responds with any one of questions text fields by specifying language url query parameter. As an example for `/questions` resource

```js
agent
    .get('http://localhost:9005/api/v1.0/questions/4')
    .query({language: 'tr'})
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // Turkish version of the questions
    });
```

server responds with the Turkish translation in the body

```js
{
    "id": 4,
    "type": "choices",
    "text": "Hangi eksersizleri yapıyorsunuz?"
    ],
    "choices": [
        {
            "id": 5,
            "text": "Yürüyüş",
            "type": "bool"
        },
        {
            "id": 6,
            "text": "Yavaş Koşu",
            "type": "bool"
        },
        {
            "id": 7,
            "text": "Koşu",
            "type": "bool"
        },
        {
            "id": 8,
            "text": "Lütfen başka bir eksersiz belirtiniz.",
            "type": "text"
        }
    ]
}
```

###### Surveys

Survey text fields that do not belong to its questions are translated by `/surveys/text/{language} resource

```js
const surveyTurkish = {
    id: 1,
    name: 'Örnek',
    sections: [{
        id: 1,
        name: 'Kişisel Bilgiler'
    }, {
        id: 2,
        name: 'Sağlık'
    }]
};

agent
    .patch('http://localhost:9005/api/v1.0/surveys/text/tr')
    .send(surveyTurkish)
    .then(res => {
        console.log(res.status);  // 204
    });
```

Currently questions cannot be translated using `/surveys/text/{language}` resource and `/questions/text/{language}` has to be used.  Translations are available to any [GET] method that responds with any one of surveys text fields by specifying language url query parameter. As an example for `/surveys` resource

```js
agent
    .get('http://localhost:9005/api/v1.0/surveys/1')
    .query({language: 'tr'})
    .then(res => {
        console.log(res.status);  // 200
        console.log(JSON.stringify(res.body, undefined, 4)); // Turkish version of the survey
    });
```

responds with the Turkish translation in the body

```js
{
    "id": 1,
    meta: {
        displayAsWizard: true,
        saveProgress: false
    },
    "name": "Örnek",
    "questions": [
        {
            "id": 1,
            "type": "text",
            "text": "Please describe reason for your enrollment?",
            "required": false
        },
        {
            "id": 2,
            "type": "bool",
            "text": "Do you own a pet?",
            "required": true
        },
        {
            "id": 5,
            "type": "choice",
            "text": "What is your hair color?",
            "choices": [
                {
                    "id": 9,
                    "text": "Black"
                },
                {
                    "id": 10,
                    "text": "Brown"
                },
                {
                    "id": 11,
                    "text": "Blonde"
                },
                {
                    "id": 12,
                    "text": "Other"
                }
            ],
            "required": true
        },
        {
            "id": 4,
            "type": "choices",
            "text": "Hangi eksersizleri yapıyorsunuz?",
            "choices": [
                {
                    "id": 5,
                    "type": "bool",
                    "text": "Yürüyüş"
                },
                {
                    "id": 6,
                    "type": "bool",
                    "text": "Yavaş Koşu"
                },
                {
                    "id": 7,
                    "type": "bool",
                    "text": "Koşu"
                },
                {
                    "id": 8,
                    "type": "text",
                    "text": "Lütfen başka bir eksersiz belirtiniz."
                }
            ],
            "required": false
        }
    ]
}
```

Note that all questions that are not yet translated is shown in English.


##### Language Specification
<a name="language_spec"/>

This API keeps track of the language the Questions are in when participants answer questions.  In all cases language has to be specified as a query parameter (Ex: `{ language: 'tr' } and this is client's responsibility.  This applies to the following resources

- `/answers` [POST]
