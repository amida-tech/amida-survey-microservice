'use strict';

const SPromise = require('.//promise');

const errors = {};

class RRError extends Error {
    constructor(code, ...params) {
        let error = errors[code];
        if (!error) {
            code = 'unknown';
            error = errors.unknown;
        }
        const msg = RRError.injectParams(error.msg, params);
        super(msg);
        this.code = code;
    }

    static reject(code, params) {
        const err = new RRError(code, params);
        return SPromise.reject(err);
    }

    static injectParams(msg, params) {
        if (params.length) {
            params.forEach((param, index) => {
                const expr = `\\$${index}`;
                const re = new RegExp(expr, 'g');
                msg = msg.replace(re, param);
            });
        }
        return msg;
    }

    static message(code, ...params) {
        const msg = (errors[code] || errors.unknown).msg;
        return RRError.injectParams(msg, params);
    }

    toObject() {
        return {
            message: this.message,
            code: this.code
        };
    }
}

module.exports = RRError;

errors.unknown = {
    msg: 'Internal unknown error.'
};

errors.test = {
    msg: 'Testing.'
};

errors.testParams1 = {
    msg: 'Testing $0.'
};

errors.testParams2 = {
    msg: 'Testing $1 and $0 and $1.'
};

errors.qxNotFound = {
    msg: 'No such question.'
};

errors.surveyNotFound = {
    msg: 'No such survey.'
};

errors.surveyNoQuestions = {
    msg: 'Surveys without questions are not accepted.'
};

errors.noSystemConsentDocuments = {
    msg: 'System does not have the required consent sections uploaded.'
};

errors.profileSignaturesMissing = {
    msg: 'Required consent section signatures are not included.'
};

errors.jsonSchemaFailed = {
    msg: 'JSON schema validation for $0 failed.'
};

errors.registryNoProfileSurvey = {
    msg: 'No profile survey has been specified for the registry.'
};

errors.answerRequiredMissing = {
    msg: 'Not all required questions are answered.'
};

errors.answerQxNotInSurvey = {
    msg: 'Invalid question ids for answers.'
};

errors.qxReplaceWhenActiveSurveys = {
    msg: 'Question in active surveys cannot be removed or replaced.'
};

errors.consentTypeNotFound = {
    msg: 'No such consent type.'
};

errors.consentTypeDeleteOnConsent = {
    msg: 'Consent type cannot be removed because it is used by one or more consents.'
};

errors.smtpNotSpecified = {
    msg: 'Smtp specifications are not specified.'
};

errors.smtpTextNotSpecified = {
    msg: 'Email content and/or subject not specified for reset token.'
};
