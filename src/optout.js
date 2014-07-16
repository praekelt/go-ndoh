go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;


        self.init = function() {
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


        self.states.add('states_start', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to MomConnect. Why do you want to ' +
                            'stop receiving our messages?'),

                choices: [
                    new Choice('miscarriage', $('Miscarriage')),
                    new Choice('not_pregnant', $('Not pregnant')),
                    new Choice('not_useful', $('Messages not useful')),
                    new Choice('had_baby', $('Had my baby')),
                    new Choice('other', $('Other'))
                ],

                events: {
                    'state:enter': function() {
                        return self.im.api_request('optout.optout', {
                            address_type: "msisdn",
                            address_value: self.im.user.addr,
                            message_id: self.im.msg.message_id
                        });
                    }
                },

                next: function(choice) {
                    self.contact.extra.opt_out_reason = choice.value;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return 'states_subscribe_option';
                        });
                }

            });
        });

        self.states.add('states_subscribe_option', function(name) {
            return new ChoiceState(name, {
                question: $('We are sorry for your loss. Would you like ' +
                            'to receive a small set of free messages from MomConnect ' +
                            'that could help you in this difficult time?'),

                choices: [
                    new Choice('states_end_yes', $('Yes')),
                    new Choice('states_end_no', $('No'))
                ],

                next: function(choice) {
                    // TODO: do HTTP post of subscription
                    return choice.value;
                }

            });
        });

        self.states.add('states_end_no', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive ' +
                        'messages from us. If you have any medical ' +
                        'concerns please visit your nearest clinic.'),

                next: 'states_start'
            });
        });

        self.states.add('states_end_yes', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will receive support messages ' +
                            'from MomConnect in the coming weeks.'),

                next: 'states_start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

