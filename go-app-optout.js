var go = {};
go;

var _ = require('lodash');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var Choice = vumigo.states.Choice;

// override moment default century switch at '68 with '49
moment.parseTwoDigitYear = function (input) {
    return +input + (+input > 49 ? 1900 : 2000);
};

go.utils = {
    // Shared utils lib

    // make choices options with options
    make_month_choices: function($, start, limit) {
            // start should be 0 for Jan - array position
            var choices = [
                    new Choice('01', $('Jan')),
                    new Choice('02', $('Feb')),
                    new Choice('03', $('Mar')),
                    new Choice('04', $('Apr')),
                    new Choice('05', $('May')),
                    new Choice('06', $('Jun')),
                    new Choice('07', $('Jul')),
                    new Choice('08', $('Aug')),
                    new Choice('09', $('Sep')),
                    new Choice('10', $('Oct')),
                    new Choice('11', $('Nov')),
                    new Choice('12', $('Dec')),
                ];

            var choices_show = [];
            var choices_show_count = 0;
            var end = start + limit;
            
            for (var i=start; i<end; i++) {
                var val = (i >= 12 ? (i-12) : i);
                choices_show[choices_show_count] = choices[val];
                choices_show_count++;
            }

            return choices_show;

    },  

    get_today: function(config) {
        var today;
        if (config.testing_today) {
            today = new Date(config.testing_today);
        } else {
            today = new Date();
        }
        return today;
    },

    check_valid_number: function(input){
        // an attempt to solve the insanity of JavaScript numbers
        var numbers_only = new RegExp('^\\d+$');
        if (input !== '' && numbers_only.test(input) && !Number.isNaN(Number(input))){
            return true;
        } else {
            return false;
        }
    },

    check_number_in_range: function(input, start, end){
        return go.utils.check_valid_number(input) && (parseInt(input) >= start) && (parseInt(input) <= end);
    },

    validate_id_sa: function(id) {
        var i, c,
            even = '',
            sum = 0,
            check = id.slice(-1);

        if (id.length != 13 || id.match(/\D/)) {
            return false;
        }
        id = id.substr(0, id.length - 1);
        for (i = 0; id.charAt(i); i += 2) {
            c = id.charAt(i);
            sum += +c;
            even += id.charAt(i + 1);
        }
        even = '' + even * 2;
        for (i = 0; even.charAt(i); i++) {
            c = even.charAt(i);
            sum += +c;
        }
        sum = 10 - ('' + sum).charAt(1);
        return ('' + sum).slice(-1) == check;
    },

    extract_id_dob: function(id) {
        return moment(id.slice(0,6), 'YYMMDD').format('YYYY-MM-DD');
    },

    is_true: function(boolean) {
        //If is is not undefined and boolean is true
        return (!_.isUndefined(boolean) && (boolean==='true' || boolean===true));
    },

    readable_sa_msisdn: function(msisdn) {
        readable_no = '0' + msisdn.slice(3,12);
        return readable_no;
    },

    normalise_sa_msisdn: function(msisdn) {
        denormalised_no = '+27' + msisdn.slice(1,10);
        return denormalised_no;
    },

};
go.app = function() {
    var vumigo = require('vumigo_v02');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var GoNDOH = App.extend(function(self) {
        App.call(self, 'states:start');
        var $ = self.$;


        self.states.add('states:start', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to MomConnect. Why do you want to ' +
                            'stop receiving our messages?'),

                choices: [
                    new Choice('miscarriage', $('Miscarriage')),
                    new Choice('not_pregnant', $('Not pregnant')),
                    new Choice('not_useful', $('Messages not useful')),
                    new Choice('had_baby', $('Had my baby')),
                    new Choice('other', $('Other')),
                ],

                next: function(choice) {
                    console.log(self.im);
                    return self.im.api_request('optout.status', {
                        address_type: "msisdn",
                        address_value: self.im.user_addr
                        })
                        .then(function(result){
                            console.log(result.opted_out);
                        })
                        .then(function() {
                            return 'states:end';
                        });
                }
            });
        });

        self.states.add('states:end', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive ' +
                        'messages from us. If you have any medical ' +
                        'concerns please visit your nearest clinic.'),

                next: 'states:start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();


// self.add_creator('optstatus', function (state_name, im) {
//     var p = im.api_request('optout.status', {
//         address_type: "msisdn",
//         address_value: im.user_addr
//     });
//     p.add_callback(function (result) {
 
//         if(result.opted_out) {
//             return new ChoiceState(
//                 state_name,
//                 function(choice) {
//                     return (choice.value == 'yes' ?
//                             'opt_back_in' : 'remain_opted_out');
//                 },
//                 ('You have previously opted-out of this service. ' +
//                  'Do you want to opt-back in again?'),
//                 [
//                     new Choice('yes', 'Yes please.'),
//                     new Choice('no', 'No thank you.')
//                 ]);
//         }
 
//         return new LanguageChoice(
//             'language_selection',
//             'user_status',
//             ('To get MAMA messages, we need to ask you 4 questions. '+
//              'What language would you like?'),
//             [
//                 new Choice('english', 'English'),
//                 new Choice('zulu', 'Zulu'),
//                 new Choice('xhosa', 'Xhosa'),
//                 new Choice('afrikaans', 'Afrikaans'),
//                 new Choice('sotho', 'Sotho'),
//                 new Choice('setswana', 'Setswana')
//             ]
//         );
//     });
//     return p;
// });
 
// self.add_creator('opt_back_in', function (state_name, im) {
//     var p = im.api_request('optout.cancel_optout', {
//         address_type: 'msisdn',
//         address_value: im.user_addr
//     });
//     p.add_callback(function (result) {
//         return new ChoiceState(
//             state_name,
//             'optstatus',
//             'You have opted-back in to MAMA. Press 1 to continue.',
//             [
//                 new Choice('1', 'Continue')
//             ]);
//     });
//     return p;
// });
go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
