go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var BookletState = vumigo.states.BookletState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;

        self.init = function() {
            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

            self.im.on('session:new', function(e) {
                self.contact.extra.ussd_sessions = go.utils.incr_user_extra(
                    self.contact.extra.ussd_sessions, 1);
                self.contact.extra.metric_sum_sessions = go.utils.incr_user_extra(self.contact.extra.metric_sum_sessions, 1);
                
                return Q.all([
                    self.im.contacts.save(self.contact),
                    self.im.metrics.fire.inc([self.env, 'sum.sessions'].join('.'), 1),
                    self.fire_incomplete(e.im.state.name, -1)
                ]);
            });

            self.im.on('session:close', function(e) {
                return Q.all([
                    self.fire_incomplete(e.im.state.name, 1),
                    self.dial_back(e)
                ]);
            });

            self.im.user.on('user:new', function(e) {
                return Q.all([
                    go.utils.fire_users_metrics(self.im, self.store_name, self.env, self.metric_prefix),
                    // TODO re-evaluate the use of this metric
                    // self.fire_incomplete('states_start', 1)
                ]);
            });

            self.im.on('state:enter', function(e) {
                self.contact.extra.last_stage = e.state.name;
                return self.im.contacts.save(self.contact);
            });
            
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };

        self.should_send_dialback = function(e) {
            var dial_back_states = [
                'states_language',
                'states_register_info',
                'states_suspect_pregnancy',
                'states_id_type',
                'states_sa_id',
                'states_passport_origin',
                'states_passport_no',
                'states_birth_year',
                'states_birth_month',
                'states_birth_day'
            ];
            return e.user_terminated
                && !go.utils.is_true(self.contact.extra.redial_sms_sent)
                && _.contains(dial_back_states, e.im.state.name);
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

        self.dial_back = function(e) {
            if (!self.should_send_dialback(e)) { return; }
            return self.send_dialback();
        };

        self.get_finish_reg_sms = function() {
            return $("Please dial back in to {{ USSD_number }} to complete the pregnancy registration.")
                .context({
                    USSD_number: self.im.config.channel
                });
        };

        self.fire_incomplete = function(name, val) {
            var ignore_states = ['states_end_success', 'states_end_not_pregnant'];
            if (!_.contains(ignore_states, name)) {
                return self.im.metrics.fire.inc(([self.metric_prefix, name, "no_incomplete"].join('.')), {amount: val});
            }
        };




        self.states.add('states_start', function() {
            if (_.isUndefined(self.contact.extra.is_registered)
                || self.contact.extra.is_registered === 'false') {
                // hasn't completed registration on any line
                return self.states.create('states_language');

            } else if (self.contact.extra.is_registered_by === 'clinic') {
                // registered on clinic line
                go.utils.set_language(self.im.user, self.contact);
                return self.states.create('states_registered_full');
                    
            } else {
                // registered on chw / public lines
                go.utils.set_language(self.im.user, self.contact);
                return self.states.create('states_registered_not_full');
            }
        });



        self.states.add('states_registered_full', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to the Department of Health\'s ' +
                    'MomConnect. Please choose an option:'),

                choices: [
                    new Choice('info', $('Baby and pregnancy info')),
                    new Choice('compliment', $('Send us a compliment')),
                    new Choice('complaint', $('Send us a complaint'))
                ],

                next: function(choice) {
                    return {
                        info: 'states_faq_topics',
                        compliment: 'states_end_compliment',
                        complaint: 'states_end_complaint'
                    } [choice.value];
                }
            });
        });

        self.states.add('states_end_compliment', function(name) {
            return new EndState(name, {
                text: $('Thank you. We will send you a message ' +
                    'shortly with instructions on how to send us ' +
                    'your compliment.'),
                
                next: 'states_start',

                events: {
                    'state:enter': function() {
                        return self.im.outbound.send_to_user({
                            endpoint: 'sms',
                            content: $('Please reply to this message with your compliment. If your compliment ' +
                                'relates to the service you received at a clinic, please tell us the name of ' +
                                'the clinic or clinic worker who you interacted with. Thank you for using our ' +
                                'service. MomConnect.')
                        });
                    }
                }
            });
        });

        self.states.add('states_end_complaint', function(name) {
            return new EndState(name, {
                text: $('Thank you. We will send you a message ' +
                    'shortly with instructions on how to send us ' +
                    'your complaint.'),
                next: 'states_start',

                events: {
                    'state:enter': function() {
                        return self.im.outbound.send_to_user({
                            endpoint: 'sms',
                            content: $('Please reply to this message with your complaint. If your complaint ' +
                                'relates to the service you received at a clinic, please tell us the name of ' +
                                'the clinic or clinic worker who you interacted with. The more detail you ' +
                                'supply, the easier it will be for us to follow up for you. Kind regards. ' + 
                                'MomConnect')
                        });
                    }
                }
            });
        });



        self.states.add('states_registered_not_full', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to the Department of Health\'s ' +
                    'MomConnect. Choose an option:'),

                choices: [
                    new Choice('info', $('Baby and pregnancy info (English only)')),
                    new Choice('full_set', $('Get the full set of messages'))
                ],

                next: function(choice) {
                    return {
                        info: 'states_faq_topics',
                        full_set: 'states_end_go_clinic'
                    } [choice.value];
                }
            });
        });

        self.states.add('states_end_go_clinic', function(name) {
            return new EndState(name, {
                text: $('To register for the full set of MomConnect ' +
                    'messages, please visit your nearest clinic.'),
                next: 'states_start'
            });
        });



        self.states.add('states_language', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to the Department of Health\'s MomConnect. Choose your language:'),

                choices: [
                    new Choice('en', $('Eng')),
                    new Choice('af', $('Afrik')),
                    new Choice('zu', $('Zulu')),
                    new Choice('xh', $('Xhosa')),
                    new Choice('st', $('Sotho')),
                    new Choice('tn', $('Setswana'))
                ],

                next: function(choice) {
                    self.contact.extra.language_choice = choice.value;
                    return self.im.groups.get(choice.value)
                        .then(function(group) {
                            self.contact.groups.push(group.key);
                            return self.im.user
                                .set_lang(choice.value)
                                .then(function() {
                                    if (_.isUndefined(self.contact.extra.is_registered)) {
                                        return Q.all([
                                            go.utils.incr_kv(self.im, [self.store_name, 'no_incomplete_registrations'].join('.')),
                                            go.utils.adjust_percentage_registrations(self.im, self.metric_prefix)
                                        ]);
                                    }
                                })
                                .then(function() {
                                    self.contact.extra.is_registered = 'false';
                                    return self.im.contacts.save(self.contact);
                                })
                                .then(function() {
                                    return 'states_register_info';
                                });
                        });
                }
            });
        });

        self.states.add('states_register_info', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to the Department of Health\'s ' +
                    'MomConnect. Please select:'),

                choices: [
                    new Choice('register', $('Register for messages')),
                    new Choice('info', $('Baby and Pregnancy info (English only)'))
                ],

                next: function(choice) {
                    return {
                        register: 'states_suspect_pregnancy',
                        info: 'states_faq_topics'
                    } [choice.value];
                }
            });
        });


        self.states.add('states_suspect_pregnancy', function(name) {
            return new ChoiceState(name, {
                question: $('MomConnect sends free support SMSs to ' +
                    'pregnant mothers. Are you or do you suspect that you ' +
                    'are pregnant?'),

                choices: [
                    new Choice('yes', $('Yes')),
                    new Choice('no', $('No'))
                ],

                next: function(choice) {
                    self.contact.extra.suspect_pregnancy = choice.value;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                yes: 'states_id_type',
                                no: 'states_end_not_pregnant'
                            } [choice.value];
                        });
                }
            });
        });

        self.states.add('states_end_not_pregnant', function(name) {
            return new EndState(name, {
                text: $('We are sorry but this service is only for ' +
                    'pregnant mothers. If you have other health concerns ' +
                    'please visit your nearest clinic.'),
                next: 'states_start'
            });
        });

        self.states.add('states_id_type', function(name) {
            return new ChoiceState(name, {
                question: $('We need some info to message you. This ' +
                    'is private and will only be used to help you at a ' +
                    'clinic. What kind of ID do you have?'),

                choices: [
                    new Choice('sa_id', $('SA ID')),
                    new Choice('passport', $('Passport')),
                    new Choice('none', $('None'))
                ],

                next: function(choice) {
                    self.contact.extra.id_type = choice.value;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                sa_id: 'states_sa_id',
                                passport: 'states_passport_origin',
                                none: 'states_birth_year'
                            } [choice.value];
                        });
                }
            });
        });

        self.states.add('states_sa_id', function(name, opts) {
            var error = $('Sorry, your ID number did not validate. ' +
                          'Please reenter your SA ID number:');

            var question = $('Please enter your SA ID number:');

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.validate_id_sa(content)) {
                        return error;
                    }
                },

                next: function(content) {
                    self.contact.extra.sa_id = content;

                    var id_date_of_birth = go.utils.extract_id_dob(content);
                    self.contact.extra.birth_year = id_date_of_birth.slice(0,4);
                    self.contact.extra.birth_month = id_date_of_birth.slice(5,7);
                    self.contact.extra.birth_day = id_date_of_birth.slice(8,10);
                    self.contact.extra.dob = id_date_of_birth;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                name: 'states_end_success'
                            };
                        });
                }
            });
        });

        self.states.add('states_passport_origin', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),

                choices: [
                    new Choice('zw', $('Zimbabwe')),
                    new Choice('mz', $('Mozambique')),
                    new Choice('mw', $('Malawi')),
                    new Choice('ng', $('Nigeria')),
                    new Choice('cd', $('DRC')),
                    new Choice('so', $('Somalia')),
                    new Choice('other', $('Other'))
                ],

                next: function(choice) {
                    self.contact.extra.passport_origin = choice.value;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                name: 'states_passport_no'
                            };
                        });
                }
            });
        });

        self.states.add('states_passport_no', function(name) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter your passport number again.');
            var question = $('Please enter your Passport number:');

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.is_alpha_numeric_only(content) || content.length <= 4) {
                        return error;
                    }
                },

                next: function(content) {
                    self.contact.extra.passport_no = content;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                name: 'states_end_success'
                            };
                        });
                }
            });
        });

        self.states.add('states_birth_year', function(name, opts) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter your year of birth again (for ' +
                        'example: 2001)');

            var question = $('Since you don\'t have an ID or passport, ' +
                            'please enter the year that you were born (for ' +
                            'example: 1981)');

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.check_number_in_range(content, 1900, go.utils.get_today(self.im.config).getFullYear())) {
                        return error;
                    }
                },

                next: function(content) {
                    self.contact.extra.birth_year = content;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                name: 'states_birth_month'
                            };
                        });
                }
            });
        });

        self.states.add('states_birth_month', function(name) {
            return new ChoiceState(name, {
                question: $('Please enter the month that you were born.'),

                choices: go.utils.make_month_choices($, 0, 12),

                next: function(choice) {
                    self.contact.extra.birth_month = choice.value;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return {
                                name: 'states_birth_day'
                            };
                        });
                }
            });
        });

        self.states.add('states_birth_day', function(name, opts) {
            var error = $('There was an error in your entry. Please ' +
                        'carefully enter your day of birth again (for ' +
                        'example: 8)');

            var question = $('Please enter the day that you were born ' +
                    '(for example: 14).');

            return new FreeText(name, {
                question: question,

                check: function(content) {
                    if (!go.utils.check_number_in_range(content, 1, 31)) {
                        return error;
                    }
                },

                next: function(content) {
                    if (content.length === 1) {
                        content = '0' + content;
                    }
                    self.contact.extra.birth_day = content;
                    self.contact.extra.dob = (self.im.user.answers.states_birth_year +
                        '-' + self.im.user.answers.states_birth_month +
                        '-' + content);
                    self.contact.extra.is_registered = 'true';
                    self.contact.extra.is_registered_by = 'personal';
                    self.contact.extra.metric_sessions_to_register = self.contact.extra.ussd_sessions;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return Q.all([
                                self.im.metrics.fire.avg((self.metric_prefix + ".avg.sessions_to_register"),
                                    parseInt(self.contact.extra.ussd_sessions, 10)),
                                go.utils.incr_kv(self.im, [self.store_name, 'no_complete_registrations'].join('.')),
                                go.utils.decr_kv(self.im, [self.store_name, 'no_incomplete_registrations'].join('.')),
                                go.utils.adjust_percentage_registrations(self.im, self.metric_prefix)
                            ]);
                        })
                        .then(function() {
                            self.contact.extra.ussd_sessions = '0';
                            return self.im.contacts.save(self.contact);
                        })
                        .then(function() {
                            return {
                                name: 'states_end_success'
                            };
                        });
                }
            });
        });

        self.states.add('states_end_success', function(name) {
            return new EndState(name, {
                text: $('Thank you for subscribing to MomConnect. ' +
                        'You will now receive free messages about ' +
                        'MomConnect. Visit your nearest clinic to get ' +
                        'the full set of messages.'),

                next: 'states_start',

                events: {
                    'state:enter': function() {
                        opts = go.utils.subscription_type_and_rate(self.contact, self.im);
                        self.contact.extra.subscription_type = opts.sub_type.toString();
                        self.contact.extra.subscription_rate = opts.sub_rate.toString();
                        return Q.all([
                            go.utils.jembi_send_json(self.contact, self.contact, 'subscription', self.im, self.metric_prefix),
                            go.utils.subscription_send_doc(self.contact, self.im, self.metric_prefix, opts),
                            self.im.outbound.send_to_user({
                                endpoint: 'sms',
                                content: "Congratulations on your pregnancy. You will now get free SMSs about MomConnect. " +
                                         "You can register for the full set of FREE helpful messages at a clinic."
                            }),
                            self.im.contacts.save(self.contact)
                        ]);
                    }
                }
            });
        });

        self.states.add('states_error', function(name) {
            return new EndState(name, {
              text: 'Sorry, something went wrong when saving the data. Please try again.',
              next: 'states_start'
            });
        });




        // FAQ Browser
        // Select topic
        self.states.add('states_faq_topics', function(name) {
            return go.utils.get_snappy_topics(self.im, self.im.config.snappy.default_faq)
                .then(function(response) {
                    if (typeof response.data.error  !== 'undefined') {
                        // TODO Throw proper error
                        return error;
                    } else {
                        return _.map(_.sortBy(response.data, 'id'), function(d) {
                            return new Choice(d.id, d.topic);
                        });
                    }
                })
                .then(function(choices) {
                    return new PaginatedChoiceState(name, {
                        question: $('We have gathered information in the areas below. Please select:'),
                        choices: choices,
                        options_per_page: 8,
                        next: 'states_faq_questions'
                    });
                });
        });

        // Show questions in selected topic
        self.states.add('states_faq_questions', function(name, opts) {
            return go.utils.get_snappy_topic_content(self.im, 
                        self.im.config.snappy.default_faq, self.im.user.answers.states_faq_topics)
                .then(function(response) {
                    if (typeof response.data.error  !== 'undefined') {
                        // TODO Throw proper error
                        return error;
                    } else {
                        var choices = response.data.map(function(d) {
                            return new Choice(d.id, d.question);
                        });

                        return new PaginatedChoiceState(name, {
                            question: $('Please choose a question:'),
                            choices: choices,
                            // TODO calculate options_per_page once content length is known
                            options_per_page: 2,
                            next: function() {
                                return {
                                    name: 'states_faq_answers',
                                    creator_opts: {
                                        response: response
                                    }
                                };
                            }
                        });
                    }
                });
        });

        // Show answer to selected question
        self.states.add('states_faq_answers', function(name, opts) {
            var id = self.im.user.answers.states_faq_questions;
            var index = _.findIndex(opts.response.data, { 'id': id });
            var footer_text = [
                    "1. Prev",
                    "2. Next",
                    "0. Send to me by SMS"
                ].join("\n");
            var num_chars = 160 - footer_text.length;
            // TODO update footer_text length calc for translations
            var answer = opts.response.data[index].answer.trim();
            var sms_content = answer;
            var answer_split = [];

            while (answer.length > 0 && answer.length > num_chars) {
                answer_max_str = answer.substr(0,num_chars);
                space_index = answer_max_str.lastIndexOf(' ');
                answer_sub = answer.substr(0, space_index);
                answer_split.push(answer_sub);
                answer = answer.slice(space_index+1);
            }
            answer_split.push(answer);

            return new BookletState(name, {
                pages: answer_split.length,
                page_text: function(n) {return answer_split[n];},
                buttons: {"1": -1, "2": +1, "0": "exit"},
                footer_text: footer_text,
                next: function() {
                    return {
                        name: 'states_faq_end',
                        creator_opts: {
                            sms_content: sms_content
                        }
                    };
                }
            });
        });

        // FAQ End
        self.states.add('states_faq_end', function(name, opts) {
            return new EndState(name, {
                text: $('Thank you. Your SMS will be delivered shortly.'),

                next: 'states_start',

                events: {
                    'state:enter': function() {
                        return self.im.outbound.send_to_user({
                            endpoint: 'sms',
                            content: opts.sms_content
                        });
                    }
                }
            });
        });



    });

    return {
        GoNDOH: GoNDOH
    };
}();
