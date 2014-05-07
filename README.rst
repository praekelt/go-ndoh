NDOH MomConnect Apps
====================

Includes 3 different apps - for use by:
1. Clinic workers - upon confirmed pregnancy
2. Community Health Workers - for suspected pregnancy
3. Public use

Idea is:

1. Clinic worker gathers mom's data:
    1. Phone number
    2. Due date
    3. Identification
    4. Language pref

2. CHW worker gathers woman's data:
    1. Phone number
    2. Identification
    3. Language pref

3. Public registration:
    1. Choose their language
    2. Ask if they suspect pregnancy
    3. Supply ID

Metrics produced:

* sum.unique_users
* clinic.sum.unique_users
* chw.sum.unique_users
* personal.sum.unique_users

* percentage_users (clinic + chw + personal = 100)

* clinic.<state-name>.sum.fatal_dropoffs (records number of fatal dropoffs for each state)
* chw.<state-name>.sum.fatal_dropoffs
* personal.<state-name>.sum.fatal_dropoffs

* clinic.avg.sessions_to_register (records avg number of sessions to complete registration)
* chw.avg.sessions_to_register
* personal.avg.sessions_to_register

* clinic.sum.sent_to_hie (records number of complete registrations sent to HIE)
* chw.sum.sent_to_hie
* personal.sum.sent_to_hie

* clinic.percentage_complete_registrations (complete + incomplete registrations = 100)
* chw.percentage_complete_registrations
* personal.percentage_complete_registrations

Analytics produced:

* waiting on responses from Debbie