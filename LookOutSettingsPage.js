import React, { Fragment, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Page, PageContent, PageHeader, Typography } from 'siei-ui-components';
import { withRouter } from 'react-router';
import { FormattedMessage } from 'react-intl';

import { alertDetailsSelector, savedAlertsActions } from 'modules/Incidents/features/Common';
import { withCloseAction } from 'modules/Common/components/Modals';
import { BackButton } from 'modules/Common';
import { incidentsTranslations } from 'translations';
import { historyService } from 'services';
import { AlertsService, NoVariablesWarningModal, hasVariables } from 'modules/Common/features/Alerts';

import { AssignAlertToDivision } from '../../../Common/components/AssignAlertToDivision';
import { IncidentsAlertTableActions } from '../../../Common/components/IncidentsAlertTableActions';
import { IncidentsAlerts } from '../../../Common/containers/IncidentsAlerts';
import { ChooseAlertType } from '../../../Common/components/ChooseAlertType';
import { IncidentsAlertModal } from '../../../Common/components/IncidentsAlertModal';
import { lookOutIncidentsActions, lookOutIncidentsSelectors } from '../../ducks';

const LookOutSettingsActions = withCloseAction();

const handleAlertCreate = () => {
    historyService.forwardTo('./settings/create');
};

//TODO: THINK IF WE CAN CREATE SOME WRAP FOR SETTINGS PAGES

export const LookOutSettingsPage = ({
    history,
    activeDivisionId,
    resetActiveDivision,
    setActiveDivision,
    removeDivisionAlert,
    submitDivsionAlert,
    getLookOutOptionsRequest,
    preparedDivisions,
    preparedDivisionsIds,
    alertDetails,
    alertList,
    applyFilters,
    resetFilters,
    divisionAlerts
}) => {
    const [currentModal, setCurrentModal] = useState(false);
    const [warningModal, setWarningModal] = useState(false);
    const [chosenAlertUUID, chooseAlertUUID] = useState(false);
    const [chosenAlertId, chooseAlertId] = useState(false);

    useEffect(() => {
        if (preparedDivisionsIds.length) {
            getLookOutOptionsRequest(preparedDivisionsIds);
        }
    }, [preparedDivisionsIds, getLookOutOptionsRequest]);

    const handleNewAlertAssign = useCallback(
        currentAlert => {
            const assignAlertToDivisionData = {
                alertId: currentAlert.id,
                alertUUID: currentAlert.uuid,
                orgId: activeDivisionId
            };

            submitDivsionAlert(activeDivisionId, assignAlertToDivisionData, () => {
                getLookOutOptionsRequest(preparedDivisionsIds);
            });
        },
        [activeDivisionId, submitDivsionAlert, getLookOutOptionsRequest, preparedDivisionsIds]
    );

    useEffect(() => {
        if (alertDetails.alertName) {
            AlertsService.getSavedAlertByName(alertDetails.alertName.trim()).then(data => {
                if (data) {
                    handleNewAlertAssign({ id: data.id, uuid: data.uuid });
                }
            });
        }
    }, [alertDetails, alertList, handleNewAlertAssign]);

    const handleAlertConfirmation = () => {
        AlertsService.getSavedAlertById(chosenAlertUUID).then(({ data: alert }) => {
            if (!hasVariables(alert, 'lookout')) {
                setCurrentModal(false);
                setWarningModal(true);
            } else {
                handleContinueToSave();
            }
        });
    };

    const handleContinueToSave = () => {
        const assignAlertToDivisionData = {
            alertId: chosenAlertId,
            alertUUID: chosenAlertUUID,
            orgId: activeDivisionId
        };

        submitDivsionAlert(activeDivisionId, assignAlertToDivisionData, () => {
            getLookOutOptionsRequest(preparedDivisionsIds);
            toggleAlertModal(false);
        });
        setWarningModal(false);
        setCurrentModal(false);
    };

    const toggleAlertModal = value => id => {
        setCurrentModal(value);
        if (value) {
            setActiveDivision(id);
        } else {
            resetActiveDivision();
            chooseAlertUUID(false);
            chooseAlertId(null);
        }
    };

    const handlechooseAlert = (uuid, id) => {
        chooseAlertUUID(uuid);
        chooseAlertId(id);
    };

    const modalContent = {
        alertType: {
            title: <FormattedMessage {...incidentsTranslations.ng_incidents_assignAlert_title} />,
            modalActions: <LookOutSettingsActions onClose={toggleAlertModal(false)} />,
            modalBody: (
                <Fragment>
                    <Typography variant="p14">
                        <FormattedMessage {...incidentsTranslations.ng_incidents_lookOut_assignAlert_body} />
                    </Typography>
                    <ChooseAlertType onCreate={handleAlertCreate} onSelect={() => setCurrentModal('existingAlerts')} />
                </Fragment>
            ),
            classNames: 'siei-incidents-alert-modal modal-md'
        },
        existingAlerts: {
            title: <FormattedMessage {...incidentsTranslations.ng_incidents_assignAlertTable_title} />,
            modalActions: (
                <IncidentsAlertTableActions
                    handleAlertConfirmation={handleAlertConfirmation}
                    isAlertChosen={!!chosenAlertId}
                    onCancel={() => setCurrentModal('alertType')}
                />
            ),
            modalBody: (
                <IncidentsAlerts
                    chosenAlertId={chosenAlertUUID}
                    storedAlertId={divisionAlerts[activeDivisionId]}
                    activeDivisionId={activeDivisionId}
                    chooseAlert={handlechooseAlert}
                    onFilterSubmit={applyFilters}
                    resetFilters={resetFilters}
                />
            ),
            classNames: 'siei-incidents-alert-table modal-md'
        }
    };

    const handleBackToAlert = () => {
        setWarningModal(false);
        setCurrentModal('existingAlerts');
    };

    return (
        <Page>
            <PageHeader
                leftAction={<BackButton onClick={() => history.push('/incident-management/lookout')} />}
                title={<FormattedMessage {...incidentsTranslations.ng_incidentsSettings_title} />}
            />
            <PageContent>
                <AssignAlertToDivision
                    alertList={alertList}
                    removeDivisionAlert={removeDivisionAlert}
                    activeDivisionId={activeDivisionId}
                    preparedDivisions={preparedDivisions}
                    toggleContactModal={toggleAlertModal('alertType')}
                    divisionAlerts={divisionAlerts}
                    subtitle={
                        <FormattedMessage {...incidentsTranslations.ng_assign_alert_to_division_lookOut_subtitle} />
                    }
                    searchBarFeatureFlag={'lookOutSettingsBar'}
                />
                {currentModal && (
                    <IncidentsAlertModal
                        handleCancel={toggleAlertModal(false)}
                        modalIsOpened={true}
                        title={modalContent[currentModal].title}
                        modalActions={modalContent[currentModal].modalActions}
                        modalBody={modalContent[currentModal].modalBody}
                        classNames={modalContent[currentModal].classNames}
                    />
                )}
                <NoVariablesWarningModal
                    isOpen={warningModal}
                    onBack={handleBackToAlert}
                    onContinue={handleContinueToSave}
                    onCancel={() => setWarningModal(false)}
                />
            </PageContent>
        </Page>
    );
};

LookOutSettingsPage.propTypes = {
    activeDivisionId: PropTypes.string,
    applyFilters: PropTypes.func.isRequired,
    divisionAlerts: PropTypes.object.isRequired,
    getLookOutOptionsRequest: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    preparedDivisions: PropTypes.object.isRequired,
    preparedDivisionsIds: PropTypes.array.isRequired,
    removeDivisionAlert: PropTypes.func.isRequired,
    resetActiveDivision: PropTypes.func.isRequired,
    resetFilters: PropTypes.func.isRequired,
    setActiveDivision: PropTypes.func.isRequired,
    submitDivsionAlert: PropTypes.func.isRequired
};

export default withRouter(
    connect(
        state => ({
            activeDivisionId: lookOutIncidentsSelectors.getActiveDivision(state),
            divisionAlerts: lookOutIncidentsSelectors.getDivisionAlerts(state),
            preparedDivisionsIds: lookOutIncidentsSelectors.getPreparedDivisionsIds(state),
            preparedDivisions: lookOutIncidentsSelectors.getPreparedDivisions(state),
            alertDetails: alertDetailsSelector(state),
            alertList: lookOutIncidentsSelectors.getDivisionAlertsList(state)
        }),
        {
            removeDivisionAlert: lookOutIncidentsActions.removeDivisionAlertRequest,
            setActiveDivision: lookOutIncidentsActions.setActiveDivision,
            submitDivsionAlert: lookOutIncidentsActions.submitDivsionAlert,
            resetActiveDivision: lookOutIncidentsActions.resetActiveDivision,
            getLookOutOptionsRequest: lookOutIncidentsActions.getLookOutOptionsRequest,
            applyFilters: savedAlertsActions.applyFilters,
            resetFilters: savedAlertsActions.resetFilters
        }
    )(LookOutSettingsPage)
);
