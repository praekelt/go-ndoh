var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require('lodash');

describe("app", function() {
    describe("for chw use", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoNDOH();
            tester = new AppTester(app);

            tester
                .setup.user.lang('en')
                .setup.char_limit(180)
                .setup.config.app({
                    name: 'test_chw',
                    testing: 'true',
                    testing_today: 'April 4, 2014 07:07:07',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "*120*550*3#"
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user starts a session", function() {
            it("should check if no. belongs to pregnant woman", function() {
                return tester
                    .setup.user.addr('+27001')
                    .start()
                    .check.interaction({
                        state: 'states:start',
                        reply: [
                            'Welcome to The Department of Health\'s ' +
                            'MomConnect. Tell us if this is the no. that ' +
                            'the mother would like to get SMSs on: 0001',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the no. is the pregnant woman's no.", function() {
            it("should ask for the id type", function() {
                return tester
                    .setup.user.state('states:start')
                    .input('1')
                    .check.interaction({
                        state: 'states:id_type',
                        reply: [
                            'What kind of identification does the pregnant ' +
                            'mother have?',
                            '1. SA ID',
                            '2. Passport',
                            '3. None'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the no. is not the pregnant woman's no.", function() {
            it("should ask for the pregnant woman's no.", function() {
                return tester
                    .setup.user.state('states:start')
                    .input('2')
                    .check.interaction({
                        state: 'states:mobile_no',
                        reply: (
                            'Please input the mobile number of the ' +
                            'pregnant woman to be registered:')
                    })
                    .run();
            });
        });

        describe("after entering the pregnant woman's number incorrectly", function() {
            it("should ask for the mobile number again", function() {
                return tester
                    .setup.user.state('states:mobile_no')
                    .input('08212345AB')
                    .check.interaction({
                        state: 'states:mobile_no',
                        reply: (
                            'Sorry, the mobile number did not validate. ' +
                            'Please reenter the mobile number:')
                    })
                    .run();
            });
        });


        describe("after entering the pregnant woman's number", function() {
            it("should ask for the id type", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:mobile_no')
                    .input('0821234567')
                    .check.interaction({
                        state: 'states:id_type',
                        reply: [
                            'What kind of identification does the pregnant ' +
                            'mother have?',
                            '1. SA ID',
                            '2. Passport',
                            '3. None'
                        ].join('\n')
                    })
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.working_on, "+27821234567");
                    })
                    .run();
            });
        });

        describe("if the user selects SA ID (id type)", function() {
            describe("if the user is the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('+270001')
                        .setup.user.state('states:id_type')
                        .input('1')
                        .check.interaction({
                            state: 'states:sa_id',
                            reply: (
                                'Please enter the pregnant mother\'s SA ID ' +
                                'number:')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+270001'
                            });
                            assert.equal(contact.extra.id_type, 'sa_id');
                        })
                        .run();
                });
            });

            describe("if the user is not the pregnant woman", function() {
                it("should set id type, ask for their id number", function() {
                    return tester
                        .setup.user.addr('+270001')
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+270001',
                                extra : {
                                    working_on: '+27821234567'
                                }
                            });
                        })
                        .setup.user.state('states:id_type')
                        .input('1')
                        .check.interaction({
                            state: 'states:sa_id',
                            reply: (
                                'Please enter the pregnant mother\'s SA ID ' +
                                'number:')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27821234567'
                            });
                            assert.equal(contact.extra.id_type, 'sa_id');
                        })
                        .run();
                });
            });
        });

        describe("after the user enters the ID number after '50", function() {
            it("should save ID, extract DOB, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:sa_id')
                    .input('5101015009088')
                    .check.interaction({
                        state: 'states:language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. English',
                            '2. Afrikaans',
                            '3. Zulu',
                            '4. Xhosa',
                            '5. Sotho'
                            ].join('\n')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, '5101015009088');
                        assert.equal(contact.extra.birth_year, '1951');
                        assert.equal(contact.extra.birth_month, '01');
                        assert.equal(contact.extra.birth_day, '01');
                        assert.equal(contact.extra.dob, '1951-01-01');
                    })
                    .run();
            });
        });

        describe("after the user enters the ID number before '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:sa_id')
                    .input('2012315678097')
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, '2012315678097');
                        assert.equal(contact.extra.dob, '2020-12-31');
                    })
                    .run();
            });
        });

        describe("after the user enters the ID number on '50", function() {
            it("should save ID, extract DOB", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:sa_id')
                    .input('5002285000007')
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, '5002285000007');
                        assert.equal(contact.extra.dob, '1950-02-28');
                    })
                    .run();
            });
        });

        describe("after the user enters their ID number incorrectly", function() {
            it("should not save ID, ask them to try again", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:sa_id')
                    .input('1234015009087')
                    .check.interaction({
                        state: 'states:sa_id',
                        reply: 'Sorry, the mother\'s ID number did not validate. ' +
                          'Please reenter the SA ID number:'
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.sa_id, undefined);
                    })
                    .run();
            });
        });

        describe("if the user selects Passport (id type)", function() {
            it("should set id type, ask for their country of origin", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:id_type')
                    .input('2')
                    .check.interaction({
                        state: 'states:passport_origin',
                        reply: ['What is the country of origin of the ' +
                            'passport?',
                            '1. Zimbabwe',
                            '2. Mozambique',
                            '3. Malawi',
                            '4. Nigeria',
                            '5. DRC',
                            '6. Somalia',
                            '7. Other'
                        ].join('\n')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.id_type, 'passport');
                    })
                    .run();
            });
        });

        describe("after the user selects passport country", function() {
            it("should save passport country, ask for their passport number", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:passport_origin')
                    .input('1')
                    .check.interaction({
                        state: 'states:passport_no',
                        reply: 'Please enter your Passport number:'
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.passport_origin, 'zw');
                    })
                    .run();
            });
        });

        describe("after the user enters the passport number", function() {
            it("should save passport no, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:passport_no')
                    .input('12345')
                    .check.interaction({
                        state: 'states:language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. English',
                            '2. Afrikaans',
                            '3. Zulu',
                            '4. Xhosa',
                            '5. Sotho'
                            ].join('\n')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.passport_no, '12345');
                    })
                    .run();
            });
        });

        describe("if the user selects None (id type)", function() {
            it("should set id type, ask for their birth year", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:id_type')
                    .input('3')
                    .check.interaction({
                        state: 'states:birth_year',
                        reply: ('Please enter the year that the pregnant mother was born (eg ' +
                                '1981)')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.id_type, 'none');
                    })
                    .run();
            });
        });

        describe("after the user enters their birth year incorrectly", function() {
            it("should ask for their birth year again", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:birth_year')
                    .input('Nineteen Eighty One')
                    .check.interaction({
                        state: 'states:birth_year',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s year of birth again (eg ' +
                        '2001)')
                    })
                    .run();
            });
        });

        describe("after the user enters their birth year", function() {
            it("should save birth year, ask for their birth month", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:birth_year')
                    .input('1981')
                    .check.interaction({
                        state: 'states:birth_month',
                        reply: ['Please enter the month that you were born.',
                            '1. Jan',
                            '2. Feb',
                            '3. Mar',
                            '4. Apr',
                            '5. May',
                            '6. Jun',
                            '7. Jul',
                            '8. Aug',
                            '9. Sep',
                            '10. Oct',
                            '11. Nov',
                            '12. Dec'
                        ].join('\n')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.birth_year, '1981');
                    })
                    .run();
            });
        });

        describe("after the user enters their birth month", function() {
            it("should save birth month, ask for their birth day", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:birth_month')
                    .input('1')
                    .check.interaction({
                        state: 'states:birth_day',
                        reply: ('Please enter the day that the mother was born ' +
                            '(eg 14).')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.birth_month, '01');
                    })
                    .run();
            });
        });

        describe("after the user enters their birth day incorrectly", function() {
            it("should not save birth day, ask them their birth day again", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.state('states:birth_day')
                    .input('fourteen')
                    .check.interaction({
                        state: 'states:birth_day',
                        reply: ('There was an error in your entry. Please ' +
                        'carefully enter the mother\'s day of birth again (eg ' +
                        '8)')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.birth_day, undefined);
                        assert.equal(contact.extra.dob, undefined);
                    })
                    .run();
            });
        });

        describe("after the user enters the birth day", function() {
            it("should save birth day and dob, ask for pregnant woman's msg language", function() {
                return tester
                    .setup.user.addr('+270001')
                    .setup.user.answers({
                        'states:birth_year': '1981',
                        'states:birth_month': '01'
                    })
                    .setup.user.state('states:birth_day')
                    .input('14')
                    .check.interaction({
                        state: 'states:language',
                        reply: ['Please select the language that the ' +
                            'pregnant mother would like to get messages in:',
                            '1. English',
                            '2. Afrikaans',
                            '3. Zulu',
                            '4. Xhosa',
                            '5. Sotho'
                            ].join('\n')
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store, {
                          msisdn: '+270001'
                        });
                        assert.equal(contact.extra.birth_day, '14');
                        assert.equal(contact.extra.dob, '1981-01-14');
                    })
                    .run();
            });
        });

        describe("after the mom's msg language is selected", function() {
            describe("if the phone used is not the mom's", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('+270001')
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+270001',
                                extra : {
                                    working_on: '+27821234567'
                                }
                            });
                        })
                        .setup.user.state('states:language')
                        .input('1')
                        .check.interaction({
                            state: 'states:end_success',
                            reply: ('Thank you, registration is complete. The ' +
                            'pregnant woman will now receive messages to ' +
                            'encourage her to register at her nearest ' + 
                            'clinic.')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+27821234567'
                            });
                            assert.equal(contact.extra.language_choice, 'en');
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
            
            describe("if the phone used is the mom's", function() {
                it("should save msg language, thank them and exit", function() {
                    return tester
                        .setup.user.addr('+270001')
                        .setup.user.state('states:language')
                        .input('1')
                        .check.interaction({
                            state: 'states:end_success',
                            reply: ('Thank you, registration is complete. The ' +
                            'pregnant woman will now receive messages to ' +
                            'encourage her to register at her nearest ' + 
                            'clinic.')
                        })
                        .check(function(api) {
                            var contact = _.find(api.contacts.store, {
                              msisdn: '+270001'
                            });
                            assert.equal(contact.extra.language_choice, 'en');
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("when a session is terminated", function() {
            describe("when they have not completed registration",function() {
                describe("when they have already been sent a registration sms",function() {
                    it("should not send them an sms",function() {
                        return tester
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273444',
                                    extra : {
                                        redial_sms_sent: 'true'
                                    }
                                });
                            })
                            .setup.user.addr('+273444')
                            .setup.user.state('states:start')
                            .input('1')
                            .input.session_event('close')
                            .check(function(api) {
                                var smses = _.where(api.outbound.store, {
                                    endpoint: 'sms'
                                });
                                assert.equal(smses.length,0);
                            }).run();
                    });
                });

                describe("when they have not been sent a registration sms",function() {
                    it("should send them an sms thanking them for their registration",function() {
                        return tester
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273323',
                                    extra : {}
                                });
                            })
                            .setup.user.addr('+273323')
                            .setup.user.state('states:start')
                            .input(1)
                            .input.session_event('close')
                            .check(function(api) {
                                var smses = _.where(api.outbound.store, {
                                    endpoint: 'sms'
                                });
                                var sms = smses[0];
                                assert.equal(smses.length,1);
                                assert.equal(sms.content, 
                                    "Please dial back in to *120*550*3# to complete the pregnancy registration."
                                );
                                assert.equal(sms.to_addr,'+273323');
                            }).run();
                    });
                });
            });
        });
    });
});
