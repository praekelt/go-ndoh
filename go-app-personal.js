var go = {};
go;

var _ = require('lodash');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var Choice = vumigo.states.Choice;
var utils = vumigo.utils;
var libxml = require('libxmljs');
var crypto = require('crypto');
var HttpApi = vumigo.http.api.HttpApi;

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
                    new Choice('12', $('Dec'))
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
        return go.utils.check_valid_number(input) && (parseInt(input, 10) >= start) && (parseInt(input, 10) <= end);
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

    is_true: function(bool) {
        //If is is not undefined and boolean is true
        return (!_.isUndefined(bool) && (bool==='true' || bool===true));
    },

    readable_sa_msisdn: function(msisdn) {
        readable_no = '0' + msisdn.slice(3,12);
        return readable_no;
    },

    normalise_sa_msisdn: function(msisdn) {
        denormalised_no = '+27' + msisdn.slice(1,10);
        return denormalised_no;
    },

    // Thanks SO!
    // http://stackoverflow.com/a/1685917
    toFixed: function(x) {
      var e;
      if (Math.abs(x) < 1.0) {
        e = parseInt(x.toString().split('e-')[1], 10);
        if (e) {
            x *= Math.pow(10,e-1);
            x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
        }
      } else {
        e = parseInt(x.toString().split('+')[1], 10);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10,e);
            x += (new Array(e+1)).join('0');
        }
      }
      return x;
    },

    // HERE BE SEMI-TAMED DRAGONS


    get_uuid: function () {
        return utils.uuid();
    },

    get_oid: function () {
        var uuid = go.utils.get_uuid();
        var hex = uuid.replace('-', '');
        var number = parseInt(hex, 16);
        return '2.25.' + go.utils.toFixed(number);
    },

    get_timestamp: function() {
        return moment().unix();
    },

    // CLARIFY NEW STRATEGY
    get_patient_id: function(contact) {
        var formatter = {
          'sa_id': function () {
            return contact.extra.sa_id + '^^^ZAF^NI';
          },
          'passport': function () {
            return contact.extra.passport_no + '^^^' + contact.extra.passport_origin.toUpperCase() + '^FI';
          },
          'none': function () { // TODO - CHECK
            return 'NI';
          }
        }[contact.extra.id_type];
        return formatter();
    },

    build_metadata: function(cda_docstr, contact) {

        var shasum = crypto.createHash('sha1');
        shasum.update(cda_docstr);

        return {
          "documentEntry": {
            "patientId": go.utils.get_patient_id(contact),
            "uniqueId": go.utils.get_oid(),
            "entryUUID": "urn:uuid:" + go.utils.get_uuid(),
            // NOTE: these need to be these hard coded values according to
            //       https://jembiprojects.jira.com/wiki/display/NPRE/Save+Registration+Encounter
            "classCode": { "code": "51855-5", "codingScheme": "2.16.840.1.113883.6.1", "codeName": "Patient Note" },
            "typeCode": { "code": "51855-5", "codingScheme": "2.16.840.1.113883.6.1", "codeName": "Patient Note" },
            "formatCode": { "code": "npr-pn-cda", "codingScheme": "4308822c-d4de-49db-9bb8-275394ee971d", "codeName": "NPR Patient Note CDA" },
            "mimeType": "text/xml",
            "hash": shasum.digest('hex'),
            "size": cda_docstr.length
          }
        };
    },

    replace_element: function (element, content) {
        var parent = element.parent();
        var replacement = new libxml.Element(
          element.doc(), element.name(), content);
        parent.addChild(replacement);
        element.remove();
        return replacement;
    },

    null_element: function (element) {
        var parent = element.parent();
        var replacement = new libxml.Element(
          element.doc(), element.name(), null);
        replacement.attr({'nullFlavor': 'NI'});
        parent.addChild(replacement);
        element.remove();
        return replacement;
    },

    update_attr: function (element, attname, attvalue) {
        var attrs = {};
        attrs[attname] = attvalue;
        return element.attr(attrs);
    },

    get_clinic_id: function(contact, element){
        if (_.isUndefined(contact.extra.clinic_code)){
            // temp hardcode instructed
            return go.utils.update_attr(element, 'extension', '11399');
        } else {
            return go.utils.update_attr(element, 'extension', contact.extra.clinic_code);
        }
    },

    get_hcw_msisdn: function(user, contact, element){
        if (!_.isUndefined(user.extra.working_on)){
          // user is a hcw
            return go.utils.update_attr(element, 'value', 'tel:' + user.msisdn);
        } else {
           // user is contact - no way to know hcw currently
            return go.utils.null_element(element);
        }
    },

    get_birthdate: function(contact, element){
        if (!_.isUndefined(contact.extra.dob)){
            return go.utils.update_attr(
              element, 'value', moment(contact.extra.dob, 'YYYY-MM-DD').format('YYYYMMDD'));
        } else {
            return go.utils.null_element(element);
        }
    },

    build_cda_doc: function(contact, user) {
        /**

        HERE BE MODERATE DRAGONS

        **/
        var xml_template = go.utils.get_CDA_template();
        var doc = libxml.parseXmlString(xml_template);
        var map = {
          '//*[@root="${uniqueId}"]': function (element) {
            return go.utils.update_attr(element, 'root', go.utils.get_uuid());
          },
          '//*[@value="${createdTime}"]': function (element) {
            return go.utils.update_attr(element, 'value', go.utils.get_timestamp());
          },
          '//*[@extension="${pidCX}"]': function (element) { // TODO Fix
            return go.utils.update_attr(element, 'extension', go.utils.get_patient_id(contact));
          },
          '//*[@value="tel:${cellNumber}"]': function (element) {
            return go.utils.update_attr(element, 'value', 'tel:' + contact.msisdn);
          },
          // Not in Scope
          '//*[text()="${givenName}"]': function (element) {
            return go.utils.null_element(element);
          },
          // Not in Scope
          '//*[text()="${familyName}"]': function (element) {
            return go.utils.null_element(element);
          },
          '//*[@value="${birthDate}"]': function (element) {
            return go.utils.get_birthdate(contact, element);
          },
          '//*[@code="${languageCode}"]': function (element) {
            return go.utils.update_attr(
              element, 'code', contact.extra.language_choice);
          },
          '//*[@value="${time}"]': function (element) {
            return go.utils.update_attr(
              element, 'value', go.utils.get_timestamp());
          },
          '//*[@value="tel:${hcwCellNumber}"]': function (element) {
            return go.utils.get_hcw_msisdn(user, contact, element);
          },
          // Only possible on Clinic line
          '//*[@extension="${hcwCode}"]': function (element) {
            return go.utils.get_clinic_id(contact, element);
          },
          // Not in Scope
          '//*[text()="${hcwGivenName}"]': function (element) {
            return go.utils.null_element(element);
          },
          // Not in Scope
          '//*[text()="${hcwFamilyName}"]': function (element) {
            return go.utils.null_element(element);
          },
          // Only possible on Clinic line
          '//*[@extension="${facilityCode}"]': function (element) {
            return go.utils.get_clinic_id(contact, element);
          },
          // Not in scope
          '//*[text()="${facilityName}"]': function (element) {
            return go.utils.null_element(element);
          },
          '//*[@value="${encounterDateTime}"]': function (element) {
            return go.utils.update_attr(element, 'value', go.utils.get_timestamp().toString().slice(0, 8));
          },
          '//*[@value="${effectiveTime}"]': function (element) {
            return go.utils.update_attr(element, 'value', go.utils.get_timestamp().toString().slice(0, 8));
          },
          '//*[@value="${date}"]': function (element) {
            return go.utils.update_attr(element, 'value', go.utils.get_timestamp().toString().slice(0, 8));
          },
          '//*[@code="${mobileHealthApplicationCode}"]': function (element) {
            return go.utils.update_attr(element, 'code', 'PF');
          },
          '//*[text()="${softwareName}"]': function (element) {
            return go.utils.replace_element(element, 'Vumi');
          }
        };
        Object.keys(map).forEach(function (key) {
          var elements = doc.find(key);
          elements.forEach(function (element) {
            handler = map[key];
            handler(element);
          });
        });
        return doc;
    },

    build_multipart_data: function(boundary, parts) {
        return parts.map(function (part) {
          return [
            '--' + boundary,
            'Content-Disposition: form-data; name="' + part.name + '"; filename="' + part.file_name + '"',
            'Content-Type: ' + part.content_type,
            '',
            part.body,
            ''
          ].join('\n');
        }).join('\n').trim();
    },

    build_request_data: function (doc, boundary, contact) {
        var docstr = doc.toString().trim();
        return go.utils.build_multipart_data(boundary, [
          {
            name: "ihe-mhd-metadata",
            file_name: 'MHDMetadata.json',
            content_type: 'application/json',
            body: JSON.stringify(go.utils.build_metadata(docstr, contact))
          },
          {
            name: 'content',
            file_name: 'CDARequest.xml',
            content_type: 'text/xml',
            body: docstr
          }
        ]);
    },

    jembi_api_call: function (doc, contact, im) {
        var http = new HttpApi(im, {
          auth: {
            username: im.config.jembi.username,
            password: im.config.jembi.password
          }
        });
        return http.post(im.config.jembi.url, {
          data: go.utils.build_request_data(doc, 'yolo', contact),
          headers: {
            'Content-Type': ['multipart/form-data; boundary=yolo']
          }
        });
    },

    get_CDA_template: function () {
        var CDA_Template = [
            '<?xml version="1.0"?>',
            '<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:cda="urn:hl7-org:v3" xmlns:voc="urn:hl7-org:v3/voc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:pcc="urn:ihe:pcc:hl7v3" xmlns:lab="urn:oid:1.3.6.1.4.1.19376.1.3.2" xmlns:sdtc="urn:hl7-org:sdtc" xsi:schemaLocation="urn:hl7-org:v3 CDA.xsd">',
            '<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>',
            '<templateId root="2.16.840.1.113883.10" extension="IMPL_CDAR2_LEVEL1"/>',
            '<id root="${uniqueId}"/>',
            '<code code="51855-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
            '<title>SA National Pregnancy Register - Patient Note</title>',
            '<!-- Creation time of document, e.g. 20140217121212 -->',
            '<effectiveTime value="${createdTime}"/>',
            '<confidentialityCode code="N" displayName="Normal" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality"/>',
            '<languageCode code="en-UK"/>',
            '<!-- Client details -->',
            '<recordTarget>',
            '  <patientRole>',
            '    <!-- Patient Identifier -->',
            '    <!-- The value for extension must be specified in HL7 CX format: -->',
            '    <!-- id^^^assigningAuthority^typeCode -->',
            '    <!-- The typeCode specified the type of identifier, e.g. NI for National Identifier or PPN for Passport Number -->',
            '    <!-- The assigningAuthority specifies the issuer of the id, e.g. ZAF for South Africa -->',
            '    <!-- An example for a South African National ID is: -->',
            '    <!-- <id extension="7612241234567^^^ZAF^NI" root="526ef9c3-6f18-420a-bc53-9b733920bc67" /> -->',
            '    <id extension="${pidCX}" root="526ef9c3-6f18-420a-bc53-9b733920bc67"/>',
            '    <!-- Telephone number in RFC3966 format, e.g. tel:+27731234567 -->',
            '    <telecom value="tel:${cellNumber}"/>',
            '    <patient>',
            '      <name>',
            '        <given nullFlavor="NI"/>',
            '        <family nullFlavor="NI"/>',
            '      </name>',
            '      <administrativeGenderCode code="F" codeSystem="2.16.840.1.113883.5.1"/>',
            '      <!-- If available, else set nullFlavor -->',
            '      <!-- Format yyyy[MM[dd]] e.g. 19700123 or 197001 for an estimated date -->',
            '      <birthTime value="${birthDate}"/>',
            '      <languageCommunication>',
            '        <languageCode code="${languageCode}"/>',
            '        <preferenceInd value="true"/>',
            '      </languageCommunication>',
            '    </patient>',
            '  </patientRole>',
            '</recordTarget>',
            '<author>',
            '  <time value="${time}"/>',
            '  <assignedAuthor>',
            '    <id root="833f2856-b9e1-4f54-8694-c74c4283755f"/>',
            '    <telecom value="tel:${hcwCellNumber}"/>',
            '    <assignedPerson/>',
            '    <!-- if facility code available, else leave out representedOrganization -->',
            '    <representedOrganization>',
            '      <id extension="${facilityCode}" root="9a560d61-85f1-4d7b-8ee2-090d2900f836"/>',
            '    </representedOrganization>',
            '  </assignedAuthor>',
            '</author>',
            '<author>',
            '  <time value="${time}"/>',
            '  <assignedAuthor>',
            '    <id root="9a560d61-85f1-4d7b-8ee2-090d2900f836"/>',
            '    <assignedAuthoringDevice>',
            '      <code code="${mobileHealthApplicationCode}" codeSystem="56877fb7-e3a9-4ad5-bfb5-64d48a045e83"/>',
            '      <softwareName>${softwareName}</softwareName>',
            '    </assignedAuthoringDevice>',
            '  </assignedAuthor>',
            '</author>',
            '<custodian>',
            '  <assignedCustodian>',
            '    <representedCustodianOrganization>',
            '      <id root="a5881e6c-b42e-4559-a1fd-d1dc52379658"/>',
            '      <name>SA National Department of Health</name>',
            '    </representedCustodianOrganization>',
            '  </assignedCustodian>',
            '</custodian>',
            '<documentationOf>',
            '  <serviceEvent classCode="PCPR">',
            '    <effectiveTime value="${encounterDateTime}"/>',
            '  </serviceEvent>',
            '</documentationOf>',
            '<component>',
            '  <structuredBody>',
            '    <component>',
            '      <section>',
            '        <code code="57060-6" displayName="Estimated date of delivery Narrative" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
            '        <text>',
            '          <table>',
            '            <thead>',
            '              <tr>',
            '                <td>Pregnancy status</td>',
            '                <td>Note Date</td>',
            '                <td>Delivery Date (Estimated)</td>',
            '              </tr>',
            '            </thead>',
            '            <tbody>',
            '              <!-- e.g. -->',
            '              <tr>',
            '                <td>Pregnancy confirmed</td>',
            '                <td>2014-02-17</td>',
            '                <td>2014-10-17</td>',
            '              </tr>',
            '            </tbody>',
            '          </table>',
            '        </text>',
            '        <entry>',
            '          <!-- Pregnancy Status -->',
            '          <observation classCode="OBS" moodCode="EVN">',
            '            <code code="11449-6" displayName="Pregnancy status" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
            '            <text/>',
            '            <statusCode code="completed"/>',
            '            <!-- e.g. 20140217 -->',
            '            <effectiveTime value="${effectiveTime}"/>',
            '            <value xsi:type="CE" code="77386006" displayName="Pregnancy confirmed" codeSystem="2.16.840.1.113883.6.96" codeSystemName="SNOMED CT"/>',
            '            <!-- For CHW identification use case, use "Unconfirmed pregnancy" -->',
            '            <!--<value xsi:type="CE" code="102874004" displayName="Unconfirmed pregnancy" codeSystem="2.16.840.1.113883.6.96" codeSystemName="SNOMED CT"/>-->',
            '            <entryRelationship typeCode="SPRT" inversionInd="true">',
            '              <!-- Delivery Date -->',
            '              <observation classCode="OBS" moodCode="EVN">',
            '                <code code="11778-8" displayName="Delivery date Estimated" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
            '                <text/>',
            '                <statusCode code="completed"/>',
            '                <!-- e.g. 20141017 -->',
            '                <!-- use yyyyMM if only estimated up to month level -->',
            '                <value xsi:type="TS" value="${date}"/>',
            '              </observation>',
            '            </entryRelationship>',
            '          </observation>',
            '        </entry>',
            '      </section>',
            '    </component>',
            '  </structuredBody>',
            '</component>',
            '</ClinicalDocument>'
        ].join('\n');
        return CDA_Template;
    }
};
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
                && !go.utils.is_true(self.contact.extra.redial_sms_sent);
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
                    new Choice('so', $('Sotho'))
                ],

                next: function(choice) {
                    self.contact.extra.language_choice = choice.value;

                    return self.im.user.set_lang(choice.value)
                        .then(function() {
                            return self.im.contacts.save(self.contact);
                        })
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
                    new Choice('no', $('No'))
                ],

                next: function(choice) {
                    self.contact.extra.suspect_pregnancy = choice.value;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                yes: 'states:id_type',
                                no: 'states:end_not_pregnant'
                            } [choice.value];
                        });
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
                    new Choice('none', $('None'))
                ],

                next: function(choice) {
                    self.contact.extra.id_type = choice.value;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                sa_id: 'states:sa_id',
                                passport: 'states:passport_origin',
                                none: 'states:birth_year'
                            } [choice.value];
                        });
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

                next: function(content) {
                    self.contact.extra.sa_id = content;

                    var id_date_of_birth = go.utils.extract_id_dob(content);
                    self.contact.extra.birth_year = id_date_of_birth.slice(0,4);
                    self.contact.extra.birth_month = id_date_of_birth.slice(5,7);
                    self.contact.extra.birth_day = id_date_of_birth.slice(8,10);
                    self.contact.extra.dob = id_date_of_birth;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                name: 'states:end_success'
                            };
                        });
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
                    new Choice('other', $('Other'))
                ],

                next: function(choice) {
                    self.contact.extra.passport_origin = choice.value;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                name: 'states:passport_no'
                            };
                        });
                }
            });
        });

        self.states.add('states:passport_no', function(name) {
            return new FreeText(name, {
                question: $('Please enter your Passport number:'),

                next: function(content) {
                    self.contact.extra.passport_no = content;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                name: 'states:end_success'
                            };
                        });
                }
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
                    if (!go.utils.check_number_in_range(content, 1900, go.utils.get_today(self.im.config).getFullYear())) {
                        return error;
                    }
                },

                next: function(content) {
                    self.contact.extra.birth_year = content;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                name: 'states:birth_month'
                            };
                        });
                }
            });
        });

        self.states.add('states:birth_month', function(name) {
            return new ChoiceState(name, {
                question: $('Please enter the month that you were born.'),

                choices: go.utils.make_month_choices($, 0, 12),

                next: function(choice) {
                    self.contact.extra.birth_month = choice.value;

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                name: 'states:birth_day'
                            };
                        });
                }
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

                next: function(content) {
                    if (content.length === 1) {
                        content = '0' + content;
                    }
                    self.contact.extra.birth_day = content;
                    self.contact.extra.dob = (self.im.user.answers['states:birth_year'] +
                        '-' + self.im.user.answers['states:birth_month'] +
                        '-' + content);
                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return {
                                name: 'states:end_success'
                            };
                        });
                }
            });
        });

        self.states.add('states:end_success', function(name) {
            return new EndState(name, {
                text: $('Thank you for subscribing to MomConnect. ' +
                        'You will now receive free messages about ' +
                        'MomConnect. Visit your nearest clinic to get ' +
                        'the full set of messages.'),

                next: 'states:start',
                events: {
                    'state:enter': function() {
                        // var built_json_doc = go.utils.build_cda_doc(self.contact, self.user);
                        // return go.utils.jembi_api_call(built_doc, self.contact, self.im)
                        //     .then(function(result) {
                        //         if (result.code >= 200 && result.code < 300){
                        //             // TODO: Log metric
                        //             // console.log('end_success');
                        //         } else {
                        //             // TODO: Log metric
                        //             // console.log('error');
                        //         }
                        //         return true;
                        //     });
                    }
                }
            });
        });

        self.states.add('states:error', function(name) {
            return new EndState(name, {
              text: 'Sorry, something went wrong when saving the data. Please try again.',
              next: 'states:start'
            });
        });

    });

    return {
        GoNDOH: GoNDOH
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoNDOH = go.app.GoNDOH;


    return {
        im: new InteractionMachine(api, new GoNDOH())
    };
}();
