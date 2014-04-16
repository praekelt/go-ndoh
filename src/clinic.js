go.clinic = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;

    var GoNDOHclinic = App.extend(function(self) {
        App.call(self, 'states:start');
        var $ = self.$;

        self.states.add('states:start', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to The Department of Health\'s ' +
                            'MomConnect programme. Is this no. (MSISDN) ' +
                            'the mobile no. of the pregnant woman to be ' +
                            'registered?'),

                choices: [
                    new Choice('states:clinic_code', 'Yes'),
                    new Choice('states:mobile_no', 'No'),
                ],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:clinic_code', function(name) {
            return new FreeText(name, {
                question: $('Please enter the clinic code for the facility ' +
                            'where this pregnancy is being registered:'),

                next: function() {
                    return 'states:due_date_month';
                }
            });
        });

        self.states.add('states:mobile_no', function(name) {
            return new FreeText(name, {
                question: $('Please input the mobile number of the ' +
                            'pregnant woman to be registered:'),

                next: function() {
                    return 'states:clinic_code';
                }
            });
        });

        self.states.add('states:due_date_month', function(name) {
            return new ChoiceState(name, {
                question: $('Please select the month when the baby is due:'),

                choices: [
                    new Choice('states:id_type', 'Apr'),
                    new Choice('states:id_type', 'May'),
                    new Choice('states:id_type', 'Jun'),
                    new Choice('states:id_type', 'Jul'),
                    new Choice('states:id_type', 'Aug'),
                    new Choice('states:id_type', 'Sept'),
                    new Choice('states:id_type', 'Oct'),
                    new Choice('states:id_type', 'Nov'),
                    new Choice('states:id_type', 'Dec')
                ],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:id_type', function(name) {
            return new ChoiceState(name, {
                question: $('What kind of identification does the pregnant ' +
                            'mother have?'),

                choices: [
                    new Choice('states:sa_id', $('SA ID')),
                    new Choice('states:passport_origin', $('Passport')),
                    new Choice('states:birth_year', $('None')),
                ],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:sa_id', function(name) {
            return new FreeText(name, {
                question: $('Please enter the pregnant mother\'s SA ID ' +
                            'number:'),

                next: function() {
                    return 'states:language';
                }
            });
        });

        self.states.add('states:passport_origin', function(name) {
            return new ChoiceState(name, {
                question: $('What is the country of origin of the passport?'),

                choices: [
                    new Choice('states:passport_no', $('Zimbabwe')),
                    new Choice('states:passport_no', $('Mozambique')),
                    new Choice('states:passport_no', $('Malawi')),
                    new Choice('states:passport_no', $('Nigeria')),
                    new Choice('states:passport_no', $('DRC')),
                    new Choice('states:passport_no', $('Somalia')),
                    new Choice('states:passport_no', $('Other')),
                ],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:passport_no', function(name) {
            return new FreeText(name, {
                question: $('Please enter your Passport number:'),

                next: function() {
                    return 'states:language';
                }
            });
        });

        self.states.add('states:birth_year', function(name) {
            return new FreeText(name, {
                question: $('Since you don\'t have an ID or passport, ' +
                    'please enter the year that you were born (eg ' +
                    '1981)'),

                next: function() {
                    return 'states:birth_month';
                }
            });
        });

        self.states.add('states:birth_month', function(name) {
            return new ChoiceState(name, {
                question: $('Please enter the month that you were born.'),

                choices: [
                    new Choice('states:birth_day', $('Jan')),
                    new Choice('states:birth_day', $('Feb')),
                    new Choice('states:birth_day', $('March')),
                    new Choice('states:birth_day', $('April')),
                    new Choice('states:birth_day', $('May')),
                    new Choice('states:birth_day', $('June')),
                    new Choice('states:birth_day', $('July')),
                    new Choice('states:birth_day', $('August')),
                    new Choice('states:birth_day', $('Sept')),
                    new Choice('states:birth_day', $('Oct')),
                    new Choice('states:birth_day', $('Nov')),
                    new Choice('states:birth_day', $('Dec')),
                ],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('states:birth_day', function(name) {
            return new FreeText(name, {
                question: $('Please enter the day that you were born ' +
                    '(eg 14).'),

                next: function() {
                    return 'states:language';
                }
            });
        });

        self.states.add('states:language', function(name) {
            return new ChoiceState(name, {
                question: $('Please select the language that the ' +
                            'pregnant mother would like to get messages in:'),

                choices: [
                    new Choice('states:end_success', 'English'),
                    new Choice('states:end_success', 'Afrikaans'),
                    new Choice('states:end_success', 'Zulu'),
                    new Choice('states:end_success', 'Xhosa'),
                    new Choice('states:end_success', 'Sotho'),
                ],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // text shortened - too many characters
        self.states.add('states:end_success', function(name) {
            return new EndState(name, {
                text: $('Thank you. The pregnant woman will now ' +
                        'receive weekly messages about her pregnancy ' +
                        'from the Department of Health.'),
                next: 'states:start'
            });
        });

    });

    return {
        GoNDOHclinic: GoNDOHclinic
    };
}();
