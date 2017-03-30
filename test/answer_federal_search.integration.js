/* global describe,it*/

'use strict';

process.env.NODE_ENV = 'test';

const chai = require('chai');

const config = require('../config');

const tokener = require('../lib/tokener');
const Generator = require('./util/generator');
const History = require('./util/history');
const registryCommon = require('./util/registry-common');
const federalCommon = require('./util/search/federal-search-common');
const SharedIntegration = require('./util/shared-integration');

const expect = chai.expect;

describe('federal search integration', function federalSearchIntegration() {
    const tests = new federalCommon.IntegrationTests();

    describe('prepare system', tests.prepareSystemFn());

    tests.dbs.forEach((dbName) => {
        const searchTests = tests.searchTestsMap.get(dbName);
        describe(`set up ${dbName} via search tests`, searchTests.answerSearchUnitFn());
    });

    tests.schemas.forEach((schema) => {
        const searchTests = tests.searchTestsMap.get(schema);
        describe(`set up ${schema} via search tests`, searchTests.answerSearchIntegrationFn());
    });

    describe('clean dbs', function cleanDbs() {
        it('close db0 sequelize', function closeDb0Sequelize() {
            return tests.modelsdb0.sequelize.close();
        });
        it('close db1 sequelize', function closeDb1Sequelize() {
            return tests.modelsdb1.sequelize.close();
        });
    });

    describe('start servers', function startServers() {
        tests.dbs.forEach((dbName) => {
            it(`start server ${dbName}`, tests.startServerFn(dbName));
        });
    });

    const generator = new Generator();
    const hxRegistry = new History();
    const rrSuperTest = tests.rrSuperTest;
    const registryTests = new registryCommon.IntegrationTests(rrSuperTest, generator, hxRegistry);
    const shared = new SharedIntegration(rrSuperTest);
    describe('federal', function federal() {
        it('login as super', shared.loginFn(config.superUser));

        tests.registries.forEach((registry, index) => {
            it(`create registry ${index}`, registryTests.createRegistryFn(registry));
            it(`get registry ${index}`, registryTests.getRegistryFn(index));
            if (registry.url) {
                it(`setup environment for registry ${registry.name}`, function setupEnvironment() {
                    const token = tokener.createJWT({ id: 1, originalUsername: 'super' });
                    const key = `RECREG_JWT_${registry.name}`;
                    process.env[key] = token;
                });
            }
        });

        it('federal search case 0', function federalSearch() {
            const searchTestsMap = tests.searchTestsMap;
            const schema0 = tests.registries[0].schema;
            const schema1 = tests.registries[1].schema;
            const { count: count0, criteria: criteria0 } = searchTestsMap.get(schema0).getCriteria(0);
            const { count: count1, criteria: criteria1 } = searchTestsMap.get(schema1).getCriteria(1);
            const { count: count2, criteria: criteria2 } = searchTestsMap.get('recregone').getCriteria(0);
            const { count: count3, criteria: criteria3 } = searchTestsMap.get('recregtwo').getCriteria(1);
            const { count, criteria } = searchTestsMap.get('current').getCriteria(2);
            const federalCriteria = {
                local: { criteria },
                federal: [{
                    registryId: hxRegistry.id(0),
                    criteria: criteria0,
                }, {
                    registryId: hxRegistry.id(1),
                    criteria: criteria1,
                }, {
                    registryId: hxRegistry.id(2),
                    criteria: criteria2,
                }, {
                    registryId: hxRegistry.id(3),
                    criteria: criteria3,
                }],
            };
            return rrSuperTest.post('/answers/federal-queries', federalCriteria, 200)
                .expect((res) => {
                    const expected = {
                        local: { count },
                        federal: [{
                            count: count0,
                        }, {
                            count: count1,
                        }, {
                            count: count2,
                        }, {
                            count: count3,
                        }],
                        total: { count: count + count0 + count1 + count2 + count3 },
                    };
                    expect(res.body).to.deep.equal(expected);
                });
        });

        it('logout as super', shared.logoutFn());
    });

    describe('clean system', function cleanSystem() {
        it('close connections', function closeSequelize() {
            const m = tests.rrSuperTest.app.locals.models;
            return m.sequelize.close();
        });

        tests.dbs.forEach((dbName) => {
            it(`close server ${dbName} sequelize`, tests.closeServerSequelizeFn(dbName));
            it(`close server ${dbName}`, tests.closeServerFn(dbName));
        });
    });
});
