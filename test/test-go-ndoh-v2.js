require('mocha-as-promised')();

var vumigo = require("vumigo_v02");
var app = require("../lib/go-ndoh-v2");
var assert = require('assert');

var GoNDOH = app.GoNDOH;
var AppTester = vumigo.AppTester;

fixtures = require('./fixtures');

var make_month_menu = function (preamble) {
  return preamble + '\n' + [
    '1. Jan', '2. Feb', '3. March', '4. April', '5. May', '6. June',
    '7. July', '8. August', '9. Sept', '10. Oct', '11. Nov', '12. Dec'
  ].join('\n');
};

describe('GoNDOH version 2', function () {

  var app;
  var tester;

  describe('opt-in menu', function () {

  beforeEach(function () {
    app = new GoNDOH();
    // mock out the time
    app.get_timestamp = function() {
    return '20130819144811';
    };
    app.get_uuid = function() {
    return 'b18c62b4-828e-4b52-25c9-725a1f43fb37';
    };
    tester = new AppTester(app);

    tester
    .setup.config.app({
      jembi: {
      username: 'foo',
      password: 'bar',
      url: 'http://test/'
      }
    })
    .setup.user({addr: '+27749927190'})
    .setup(function(api) {
      fixtures().forEach(api.http.fixtures.add);
    });
  });

  it('should show the welcome screen', function () {
    return tester
      .start()
      .check.reply((
        'Welcome to MAMA & the DOH Pregnancy Registry. ' +
        'Is this no. (+27749927190) the mobile no. ' +
        'of the pregnant woman to be registered?' +
        '\n\n' +
        '1. Yes\n' +
        '2. No'))
      .check.user.state('states:welcome')
      .run();
  });

  it('should allow for self-optin', function () {
    return tester
      .setup.user.state('states:welcome')
      .input('1')
      .check.reply([
        'What form of identification will you be using?',
        '1. South African ID',
        '2. Facility ID',
        '3. Western Cape ID'
        ].join('\n'))
      .check.user.state('states:opt_in')
      .run();
  });

  it('should allow for opting someone else in', function () {
    return tester
      .setup.user.state('states:welcome')
      .input('2')
      .check.reply((
        'Please input the mobile number of the pregnant woman ' +
        'to be registered'))
      .check.user.state('states:guided_opt_in')
      .run();
  });

  it('should ask for the form of identification', function () {
    return tester
      .setup.user.state('states:guided_opt_in')
      .input('foo')
      .check.reply([
        'What form of identification will you be using?',
        '1. South African ID',
        '2. Facility ID',
        '3. Western Cape ID'
        ].join('\n'))
      .check.user.state('states:opt_in')
      .run();
  });

  it('should ask for the patient\'s identification number', function () {
    return tester
      .setup.user.state('states:opt_in')
      .input('1')
      .check.reply(
        ('Please enter the patient\'s South African ID number'))
      .check.user.state('states:identity_number')
      .run();
  });

  it('should ask for the estimated due date choice', function () {
    return tester
      .setup.user.state('states:identity_number')
      .input('foo')
      .check.reply(
        ('We need to know the estimated due date or the date of ' +
         'the pregnant woman in question\'s last menstrual period.\n' +
         'Please select:\n' +
         '1. Due date\n' +
         '2. Last period'))
      .check.user.state('states:due_date_calculation')
      .run();
  });

  it('should ask for the month last menstrual period', function () {
    return tester
      .setup.user.state('states:due_date_calculation')
      .input('2')
      .check.reply(
        make_month_menu(
          'Please enter the month of the patient\'s last ' +
          'menstrual period.'))
      .check.user.state('states:last_menstruation_month')
      .run();
  });

  it('should ask for the day of the last menstrual period', function () {
    return tester
      .setup.user.state('states:last_menstruation_month')
      .input('1')
      .check.reply(
        'Please enter the day of the patient\'s ' +
        'last menstrual period (eg 14)')
      .check.user.state('states:last_menstruation_day')
      .run();
  });

  it('should ask for the month of the estimated due date', function () {
    return tester
      .setup.user.state('states:due_date_calculation')
      .input('1')
      .check.reply(
        make_month_menu(
          'Please enter the month of the patient\'s ' +
          'estimated due date'))
      .check.user.state('states:due_date_month')
      .run();
  });

  it('should ask for the day of the estimated due date', function () {
    return tester
      .setup.user.state('states:due_date_month')
      .input('1')
      .check.reply(
        'Please enter the day of the patient\'s ' +
        'estimated due date (eg 14)')
      .check.user.state('states:due_date_day')
      .run();

  });

  it('should ask for the facility clinic code', function () {
    return tester
      .setup.user.state('states:due_date_day')
      .input('1')
      .check.reply(
        'Please enter the clinic code for the facility where ' +
        'this pregnancy is being registered.')
      .check.user.state('states:facility_code')
      .run();
  });

  it('should show the registration complete screen', function () {
    return tester
      .setup.user.state('states:facility_code')
      .input('foo')
      .check.reply(
        'Thank you, registration is complete. The pregnant woman should ' +
        'receive a confirmation SMS on her mobile phone. ' +
        'Department of Health')
      .check.user.state('states:end')
      .run();
  });

  it('should send an SMS on completion of the menu');

  it('should send an SMS if the client\'s session times out');

  });
});