module.exports = function() {
    return [{
        'request': {
            'method': 'POST',
            'headers': {
                'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                'Content-Type': ['multipart/formdata; boundary=yolo']
            },
            'url': 'http://test/v1/',
            'body': [
                '--yolo',
                'Content-Disposition: form-data; name="ihe-mhd-metadata"; filename="MHDMetadata.json"',
                'Content-Type: application/json',
                '',
                '{"documentEntry":{"patientId":"1234567890ABCDEF^^^ZAF^NI","uniqueId":"2.25.195216509534862","entryUUID":"urn:uuid:b18c62b4-828e-4b52-25c9-725a1f43fb37","classCode":{"code":"51855-5","codingScheme":"2.16.840.1.113883.6.1","codeName":"Patient Note"},"typeCode":{"code":"51855-5","codingScheme":"2.16.840.1.113883.6.1","codeName":"Patient Note"},"formatCode":{"code":"npr-pn-cda","codingScheme":"4308822c-d4de-49db-9bb8-275394ee971d","codeName":"NPR Patient Note CDA"},"mimeType":"text/xml","hash":"ed10333eabd3cc8f560ac8851add04e6e8be920a","size":5448}}',
                '',
                '--yolo',
                'Content-Disposition: form-data; name="content"; filename="CDARequest.xml"',
                'Content-Type: text/xml',
                '',
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:cda="urn:hl7-org:v3" xmlns:voc="urn:hl7-org:v3/voc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:pcc="urn:ihe:pcc:hl7v3" xmlns:lab="urn:oid:1.3.6.1.4.1.19376.1.3.2" xmlns:sdtc="urn:hl7-org:sdtc" xsi:schemaLocation="urn:hl7-org:v3 CDA.xsd">',
                '<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>',
                '<templateId root="2.16.840.1.113883.10" extension="IMPL_CDAR2_LEVEL1"/>',
                '<id root="b18c62b4-828e-4b52-25c9-725a1f43fb37"/>',
                '<code code="51855-5" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
                '<title>SA National Pregnancy Register - Patient Note</title>',
                '<!-- Creation time of document, e.g. 20140217121212 -->',
                '<effectiveTime value="20130819144811"/>',
                '<confidentialityCode code="N" displayName="Normal" codeSystem="2.16.840.1.113883.5.25" codeSystemName="Confidentiality"/>',
                '<languageCode code="en-UK"/>',
                '<!-- Client details -->',
                '<recordTarget>',
                '  <patientRole>',
                ' <!-- Patient Identifier -->',
                ' <!-- The value for extension must be specified in HL7 CX format: -->',
                ' <!-- id^^^assigningAuthority^typeCode -->',
                ' <!-- The typeCode specified the type of identifier, e.g. NI for National Identifier or PPN for Passport Number -->',
                ' <!-- The assigningAuthority specifies the issuer of the id, e.g. ZAR for South Africa -->',
                ' <!-- An example for a South African National ID is: -->',
                ' <!-- <id extension="7612241234567^^^ZAF^NI" root="526ef9c3-6f18-420a-bc53-9b733920bc67" /> -->',
                ' <id extension="1234567890ABCDEF^^^ZAF^NI" root="526ef9c3-6f18-420a-bc53-9b733920bc67"/>',
                ' <addr/>',
                ' <!-- Telephone number in RFC3966 format, e.g. tel:+27731234567 -->',
                ' <telecom value="tel:user_default"/>',
                ' <patient>',
                '   <name>',
                '   ', // NOTE: white space is important here, xmljs inserts it.
                '   ',
                '   <given>Simon</given><family>de Haan</family></name>',
                '   <administrativeGenderCode code="F" codeSystem="2.16.840.1.113883.5.1"/>',
                '   <!-- e.g. 19700123 -->',
                '   <birthTime value="19800730"/>',
                '   <languageCommunication>',
                '   <languageCode code="en"/>',
                '   <preferenceInd value="true"/>',
                '   </languageCommunication>',
                ' </patient>',
                '  </patientRole>',
                '</recordTarget>',
                '<!-- HCW Details -->',
                '<author>',
                '  <time value="20130819144811"/>',
                '  <assignedAuthor>',
                ' <id extension="1234" root="833f2856-b9e1-4f54-8694-c74c4283755f" assigningAuthorityName="HCW Code"/>',
                ' <addr/>',
                ' <telecom value="tel:user_default"/>',
                ' <assignedPerson>',
                '   <name>',
                '   ', // NOTE: white space is important here, xmljs inserts it.
                '   ',
                '   <given>Grace</given><family>Doctor</family></name>',
                ' </assignedPerson>',
                ' <representedOrganization>',
                '   <id extension="2345" root="ab8c9bd1-26e9-47bf-8bbe-3524fccb9f2c" assigningAuthorityName="Facility Code"/>',
                '   ', // NOTE: white space is important here, xmljs inserts it.
                ' <name>Good Health Center</name></representedOrganization>',
                '  </assignedAuthor>',
                '</author>',
                '<custodian>',
                '  <assignedCustodian>',
                ' <representedCustodianOrganization>',
                '   <id root="a5881e6c-b42e-4559-a1fd-d1dc52379658"/>',
                '   <name>SA National Department of Health</name>',
                ' </representedCustodianOrganization>',
                '  </assignedCustodian>',
                '</custodian>',
                '<documentationOf>',
                '  <serviceEvent classCode="PCPR">',
                ' <effectiveTime value="20130819"/>',
                '  </serviceEvent>',
                '</documentationOf>',
                '<component>',
                '  <structuredBody>',
                ' <component>',
                '   <section>',
                '   <code code="57060-6" displayName="Estimated date of delivery Narrative" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
                '   <text>',
                '     <table>',
                '     <thead>',
                '       <tr>',
                '       <td>Pregnancy status</td>',
                '       <td>Note Date</td>',
                '       <td>Delivery Date (Estimated)</td>',
                '       </tr>',
                '     </thead>',
                '     <tbody>',
                '       <!-- e.g. -->',
                '       <tr>',
                '       <td>Pregnancy confirmed</td>',
                '       <td>2014-02-17</td>',
                '       <td>2014-10-17</td>',
                '       </tr>',
                '     </tbody>',
                '     </table>',
                '   </text>',
                '   <entry>',
                '     <!-- Pregnancy Status -->',
                '     <observation classCode="OBS" moodCode="EVN">',
                '     <code code="11449-6" displayName="Pregnancy status" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
                '     <text/>',
                '     <statusCode code="completed"/>',
                '     <!-- e.g. 20140217 -->',
                '     <effectiveTime value="20130819"/>',
                '     <!-- one of \'value\' -->',
                '     <value xsi:type="CE" code="77386006" displayName="Pregnancy confirmed" codeSystem="2.16.840.1.113883.6.96" codeSystemName="SNOMED CT"/>',
                '     <!--<value xsi:type="CE" code="102874004" displayName="Unconfirmed pregnancy" codeSystem="2.16.840.1.113883.6.96" codeSystemName="SNOMED CT"/>-->',
                '     <!--<value xsi:type="CE" code="60001007" displayName="Not pregnant" codeSystem="2.16.840.1.113883.6.96" codeSystemName="SNOMED CT"/>-->',
                '     <!--<value xsi:type="CE" code="289256000" displayName="Mother delivered" codeSystem="2.16.840.1.113883.6.96" codeSystemName="SNOMED CT"/>-->',
                '     <!-- Remove entryRelationship if \'Not pregnant\' -->',
                '     <entryRelationship typeCode="SPRT" inversionInd="true">',
                '       <!-- Delivery Date -->',
                '       <observation classCode="OBS" moodCode="EVN">',
                '       <!-- one of \'code\' -->',
                '       <code code="11778-8" displayName="Delivery date Estimated" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/>',
                '       <!-- <code code="8665-2" displayName="Last menstrual period start date" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/> -->',
                '       <!-- Delivery Date (if \'Mother Delivered\') -->',
                '       <!-- <code code="21112-8" displayName="Birth date" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC"/> -->',
                '       <text/>',
                '       <statusCode code="completed"/>',
                '       <!-- e.g. 20141017 -->',
                '       <value xsi:type="TS" value="20130819"/>',
                '       </observation>',
                '     </entryRelationship>',
                '     </observation>',
                '   </entry>',
                '   </section>',
                ' </component>',
                '  </structuredBody>',
                '</component>',
                '</ClinicalDocument>'
            ].join('\n')
        },
        'response': {
            'body': ''
        }
    }];
};