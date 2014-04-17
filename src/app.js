go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    // var LanguageChoice = vumigo.states.LanguageChoice;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states:start');
        var $ = self.$;

        self.make_month_choices = function(start, limit) {
            var choices = [
                    new Choice('1', $('Jan')),
                    new Choice('2', $('Feb')),
                    new Choice('3', $('Mar')),
                    new Choice('4', $('Apr')),
                    new Choice('5', $('May')),
                    new Choice('6', $('Jun')),
                    new Choice('7', $('Jul')),
                    new Choice('8', $('Aug')),
                    new Choice('9', $('Sep')),
                    new Choice('10', $('Oct')),
                    new Choice('11', $('Nov')),
                    new Choice('12', $('Dec')),
                ];

            var choices_show = [];
            var choices_show_count = 0;
            
            for (var i=start; i<limit; i++) {
                var val = (i >= 12 ? (i-12) : i);
                choices_show[choices_show_count] = choices[val];
                choices_show_count++;
            }

            return choices_show;

        };

        self.states.add('states:start', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to The Department of Health\'s ' +
                    'MomConnect programme. Please select your preferred ' +
                    'language:'),

                choices: [
                    new Choice('en', 'English'),
                    new Choice('af', 'Afrikaans'),
                    new Choice('zu', 'Zulu'),
                    new Choice('xh', 'Xhosa'),
                    new Choice('so', 'Sotho'),
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

        // text shortened - too many characters
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

        self.states.add('states:sa_id', function(name) {
            return new FreeText(name, {
                question: $('Please enter your SA ID number:'),

                next: 'states:end_success'
            });
        });

        self.states.add('states:passport_origin', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),

                choices: [
                    new Choice('zimbabwe', $('Zimbabwe')),
                    new Choice('mozambique', $('Mozambique')),
                    new Choice('malawi', $('Malawi')),
                    new Choice('nigeria', $('Nigeria')),
                    new Choice('drc', $('DRC')),
                    new Choice('somalia', $('Somalia')),
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

        self.states.add('states:birth_year', function(name) {
            return new FreeText(name, {
                question: $('Since you don\'t have an ID or passport, ' +
                    'please enter the year that you were born (eg ' +
                    '1981)'),

                next: 'states:birth_month'
            });
        });

        self.states.add('states:birth_month', function(name) {
            return new ChoiceState(name, {
                question: $('Please enter the month that you were born.'),

                choices: self.make_month_choices(0, 12),

                next: 'states:birth_day'
            });
        });

        self.states.add('states:birth_day', function(name) {
            return new FreeText(name, {
                question: $('Please enter the day that you were born ' +
                    '(eg 14).'),

                next: 'states:end_success'
            });
        });

        // text shortened - too many characters
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
