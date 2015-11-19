go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states_start');
        var $ = self.$;

        self.init = function() {
            self.env = self.im.config.env;
            self.metric_prefix = [self.env, self.im.config.name].join('.');
            self.store_name = [self.env, self.im.config.name].join('.');

            go.utils.attach_session_length_helper(self.im);

            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


        self.states.add('states_start', function() {
            // check if message contains a ussd code
            if (self.im.msg.content.indexOf('*120*') > -1 || self.im.msg.content.indexOf('*134*') > -1) {
                return self.states.create("states_dial_not_sms");
            } else {
                // get the first word, remove non-alphanumerics, capitalise
                switch (self.im.msg.content.split(" ")[0].replace(/\W/g, '').toUpperCase()) {
                    case "STOP":
                        return self.states.create("states_opt_out_enter");
                    case "BLOCK":
                        return self.states.create("states_opt_out_enter");
                    case "START":
                        return self.states.create("states_opt_in_enter");
                    default: // Logs a support ticket
                        return self.states.create("states_default_enter");
                }
            }
        });

        self.states.add('states_dial_not_sms', function(name) {
            return new EndState(name, {
                text: $("Please use your handset's keypad to dial the number that you received, " +
                        "rather than sending it to us in an sms."),

                next: 'states_start',
            });
        });

        self.states.add('states_opt_out_enter', function(name) {
            return go.utils
                .nurse_optout(self.im, self.contact, optout_reason='unknown', api_optout=true,
                    unsub_all=true, jembi_optout=true, self.metric_prefix, self.env)
                .then(function() {
                    return self.states.create('states_opt_out');
                });
        });

        self.states.add('states_opt_out', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive messages from us.'),
                next: 'states_start'
            });
        });

        self.states.add('states_opt_in_enter', function(name) {
            return go.utils
                .nurse_opt_in(self.im, self.contact)
                .then(function() {
                    return self.states.create('states_opt_in');
                });
        });

        self.states.add('states_opt_in', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will now receive messages from us again. ' +
                        'If you have any medical concerns please visit your nearest clinic'),

                next: 'states_start'
            });
        });

        self.states.add('states_default_enter', function(name) {
            return go.utils
                .support_log_ticket(self.im.msg.content, self.contact, self.im,
                                    self.metric_prefix)
                .then(function() {
                    return self.states.create('states_default');
                });
        });

        self.states.add('states_default', function(name) {
            var out_of_hours_text =
                $("The helpdesk operates from 8am to 4pm Mon to Fri. " +
                  "Responses will be delayed outside of these hrs. In an " +
                  "emergency please go to your health provider immediately.");

            var weekend_public_holiday_text =
                $("The helpdesk is not currently available during weekends " +
                  "and public holidays. In an emergency please go to your " +
                  "health provider immediately.");

            var business_hours_text =
                $("Thank you for your message, it has been captured and you will receive a " +
                "response soon. Kind regards. MomConnect.");

            if (go.utils.is_out_of_hours(self.im.config)) {
                text = out_of_hours_text;
            } else if (go.utils.is_weekend(self.im.config) ||
              go.utils.is_public_holiday(self.im.config)) {
                text = weekend_public_holiday_text;
            } else {
                text = business_hours_text;
            }

            return new EndState(name, {
                text: text,

                next: 'states_start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();
