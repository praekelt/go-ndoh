go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states:start');
        var $ = self.$;

        self.init = function() {

            self.im.on('session:close', function(e) {
                if (!self.should_send_dialback(e)) { return; }
                return self.send_dialback();
            });

            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };

        self.should_send_dialback = function(e) {
            return e.user_terminated
                && !go.utils.is(self.contact.extra.redial_sms_sent);
        };

        self.send_dialback = function() {
            return self.im.outbound
                .send_to_user({
                    endpoint: 'sms',
                    content: self.get_finish_reg_sms()
                })
                .then(function() {
                    self.contact.extra.redial_sms_sent = 'true';
                    return self.im.contacts.save(self.contact);
                });
        };

        self.get_finish_reg_sms = function() {
            return $("Please dial back in to {{ USSD_number }} to complete the pregnancy registration.")
                .context({
                    USSD_number: self.im.config.channel
                });
        };


        self.states.add('states:start', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to The Department of Health\'s ' +
                    'MomConnect programme. Please select your preferred ' +
                    'language:'),

                choices: [
                    new Choice('en', $('English')),
                    new Choice('af', $('Afrikaans')),
                    new Choice('zu', $('Zulu')),
                    new Choice('xh', $('Xhosa')),
                    new Choice('so', $('Sotho')),
                ],

                next: function(choice) {
                    return self.im.user.set_lang(choice.value)
                    .then(function() {
                        return 'states:suspect_pregnancy';
                    });
                }
            });
        });

        self.states.add('states:suspect_pregnancy', function(name) {
            return new ChoiceState(name, {
                question: $('MomConnect sends free support SMSs to ' +
                    'pregnant mothers. Are you or do you suspect that you ' +
                    'are pregnant?'),

                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No')),
                ],

                next: function(choice) {
                    return {
                        yes: 'states:id_type',
                        no: 'states:end_not_pregnant'
                    } [choice.value];
                }
            });
        });

        self.states.add('states:end_not_pregnant', function(name) {
            return new EndState(name, {
                text: $('We are sorry but this service is only for ' +
                    'pregnant mothers. If you have other health concerns ' +
                    'please visit your nearest clinic.'),
                next: 'states:start'
            });
        });

        self.states.add('states:id_type', function(name) {
            return new ChoiceState(name, {
                question: $('We need some info to message you. This ' +
                    'is private and will only be used to help you at a ' +
                    'clinic. What kind of ID do you have?'),

                choices: [
                    new Choice('sa_id', $('SA ID')),
                    new Choice('passport', $('Passport')),
                    new Choice('none', $('None')),
                ],

                next: function(choice) {
                    return {
                        sa_id: 'states:sa_id',
                        passport: 'states:passport_origin',
                        none: 'states:birth_year'
                    } [choice.value];
                }
            });
        });

        self.states.add('states:sa_id', function(name, opts) {
            var error = $('Sorry, your ID number did not validate. ' +
                          'Please reenter your SA ID number:');

            var question;
            if (!opts.retry) {
                question = $('Please enter your SA ID number:');
            } else {
                question = error;
            }

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.validate_id_sa(content)) {
                        return error;
                    }
                },

                next: function() {
                    return {
                        name: 'states:end_success',
                        creator_opts: {
                            retry: opts.retry
                        }
                    };
                }
            });
        });

        self.states.add('states:passport_origin', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),

                choices: [
                    new Choice('zw', $('Zimbabwe')),
                    new Choice('mz', $('Mozambique')),
                    new Choice('mw', $('Malawi')),
                    new Choice('ng', $('Nigeria')),
                    new Choice('cd', $('DRC')),
                    new Choice('so', $('Somalia')),
                    new Choice('other', $('Other')),
                ],

                next: 'states:passport_no'
            });
        });

        self.states.add('states:passport_no', function(name) {
            return new FreeText(name, {
                question: $('Please enter your Passport number:'),

                next: 'states:end_success'
            });
        });

        self.states.add('states:birth_year', function(name, opts) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter your year of birth again (eg ' +
                        '2001)');

            var question;
            if (!opts.retry) {
                question = $('Since you don\'t have an ID or passport, ' +
                            'please enter the year that you were born (eg ' +
                            '1981)');
            } else {
                question = error;
            }

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.check_number_in_range(content, 1900, go.utils.get_today(self.im.config.testing_today).getFullYear())) {
                        return error;
                    }
                },

                next: function() {
                    return {
                        name: 'states:birth_month',
                        creator_opts: {
                            retry: opts.retry
                        }
                    };
                }
            });
        });

        self.states.add('states:birth_month', function(name) {
            return new ChoiceState(name, {
                question: $('Please enter the month that you were born.'),

                choices: go.utils.make_month_choices(Choice, $, 0, 12),

                next: 'states:birth_day'
            });
        });

        self.states.add('states:birth_day', function(name, opts) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter your day of birth again (eg ' +
                        '8)');

            var question;
            if (!opts.retry) {
                question = $('Please enter the day that you were born ' +
                    '(eg 14).');
            } else {
                question = error;
            }

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.check_number_in_range(content, 1, 31)) {
                        return error;
                    }
                },

                next: function() {
                    return {
                        name: 'states:end_success',
                        creator_opts: {
                            retry: opts.retry
                        }
                    };
                }
            });
        });

        self.states.add('states:end_success', function(name) {
            return new EndState(name, {
                text: $('Thank you for subscribing to MomConnect. ' +
                        'You will now receive free messages about ' +
                        'MomConnect. Visit your nearest clinic to get ' + 
                        'the full set of messages.'),

                next: 'states:start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
