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
                            address_value: self.im.user_addr
                        });
                    }
                },

                next: function(choice) {
                    self.contact.extra.opt_out_reason = choice.value;

                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return 'states_end';
                        });
                }

            });
        });

        self.states.add('states_end', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive ' +
                        'messages from us. If you have any medical ' +
                        'concerns please visit your nearest clinic.'),

                next: 'states_start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

