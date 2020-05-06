import { isToday } from "date-fns";
import { fromNullable, Option } from "fp-ts/lib/Option";
import { capitalize } from "lodash";
import { Text, View } from "native-base";
import React from "react";
import { StyleSheet } from "react-native";
import { connect } from "react-redux";
import { CreatedMessageWithContent } from "../../../definitions/backend/CreatedMessageWithContent";
import { ServicePublic } from "../../../definitions/backend/ServicePublic";
import I18n from "../../i18n";
import { NavigationParams } from "../../screens/wallet/payment/TransactionSummaryScreen";
import {
  navigateToMessageDetailScreenAction,
  navigateToPaymentTransactionSummaryScreen,
  navigateToWalletHome
} from "../../store/actions/navigation";
import { loadServiceDetail } from "../../store/actions/services";
import { Dispatch } from "../../store/actions/types";
import { paymentInitializeState } from "../../store/actions/wallet/payment";
import { serverInfoDataSelector } from "../../store/reducers/backendInfo";
import { PaidReason } from "../../store/reducers/entities/payments";
import { isProfileEmailValidatedSelector } from "../../store/reducers/profile";
import { GlobalState } from "../../store/reducers/types";
import variables from "../../theme/variables";
import { isUpdateNeeded } from "../../utils/appVersion";
import {
  format,
  formatDateAsDay,
  formatDateAsMonth,
} from "../../utils/dates";
import {
  getMessagePaymentExpirationInfo,
  isExpirable,
  isExpired,
  MessagePaymentExpirationInfo
} from "../../utils/messages";
import {
  formatPaymentAmount,
  getAmountFromPaymentAmount,
  getRptIdFromNoticeNumber
} from "../../utils/payment";
import CalendarIconComponent from "../CalendarIconComponent";
import StyledIconFont from "../ui/IconFont";
import CalendarEventButton from "./CalendarEventButton";
import PaymentButton from "./PaymentButton";

type OwnProps = {
  message: CreatedMessageWithContent;
  service?: ServicePublic;
  payment?: PaidReason;
  small?: boolean;
  disabled?: boolean;
};

type Props = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;

const styles = StyleSheet.create({
  topContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center"
  },
  topContainerLarge: {
    paddingVertical: variables.contentPadding / 2,
    paddingHorizontal: variables.contentPadding,
    backgroundColor: variables.brandGray
  },
  topContainerPaid: {
    paddingVertical: 0,
    paddingHorizontal: 0
  },
  bottomContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: variables.contentPadding / 2,
    paddingHorizontal: variables.contentPadding
  },
  bottomContainerValid: {
    backgroundColor: variables.brandGray
  },
  bottomContainerExpiring: {
    backgroundColor: "#D0021B"
  },
  bottomContainerExpired: {
    backgroundColor: variables.brandDarkGray
  },
  bottomContainerText: {
    flex: 1,
    flexWrap: "wrap",
    marginLeft: 16
  }
});

/**
 * A component to show the action buttons on a message.
 * For messages with the proper configuration, the user can:
 * - add a message-related calendar event
 * - start the message-related payment
 */
class MessageCTABar extends React.PureComponent<Props/*,State*/> {
  private navigateToMessageDetail = () => {
    const { message, navigateToMessageDetail } = this.props;
    navigateToMessageDetail(message.id);
  };

  get paid(): boolean {
    return this.props.payment !== undefined;
  }


  private renderCalendarIcon = (
    maybeMessagePaymentExpirationInfo: Option<MessagePaymentExpirationInfo>
  ) => {
    const { message, small } = this.props;
    const { due_date } = message.content;

    // if the message is relative to a payment and it is paid
    // calendar icon will be never shown
    if (this.paid) {
      return null;
    }
    if (!due_date) {
      return null;
    }

    if (
      !small &&
      maybeMessagePaymentExpirationInfo.isSome() &&
      isExpired(maybeMessagePaymentExpirationInfo.value)
    ) {
      return null;
    }

    const isPaymentExpiring =
      maybeMessagePaymentExpirationInfo.isSome() &&
      maybeMessagePaymentExpirationInfo.value.kind === "EXPIRABLE" &&
      maybeMessagePaymentExpirationInfo.value.expireStatus === "EXPIRING";

    return (
      <CalendarIconComponent
        small={small}
        month={capitalize(formatDateAsMonth(due_date))}
        day={formatDateAsDay(due_date)}
        backgroundColor={
          isPaymentExpiring
            ? variables.calendarExpirableColor
            : variables.brandDarkGray
        }
        textColor={variables.colorWhite}
      />
    );
  };

  private renderCalendarEventButton = (
    maybeMessagePaymentExpirationInfo: Option<MessagePaymentExpirationInfo>
  ) => {
    const {
      message,
      small,
      disabled
    } = this.props;
    const { due_date } = message.content;

    // if the message is relative to a payment and it is paid
    // reminder will be never shown
    if (this.paid || due_date === undefined) {
      return null;
    }

    if (
      maybeMessagePaymentExpirationInfo.isSome() &&
      isExpired(maybeMessagePaymentExpirationInfo.value)
    ) {
      return null;
    }
    
    return (
      <CalendarEventButton
        small={small}
        disabled={disabled}
        message={this.props.message}
      />
    );
  };

  private renderPaymentButton(
    maybeMessagePaymentExpirationInfo: Option<MessagePaymentExpirationInfo>
  ) {
    const { message, service, small, disabled } = this.props;

    if (
      maybeMessagePaymentExpirationInfo.isNone() ||
      (!small && isExpired(maybeMessagePaymentExpirationInfo.value))
    ) {
      return null;
    }

    const messagePaymentExpirationInfo =
      maybeMessagePaymentExpirationInfo.value;

    const expired = isExpired(messagePaymentExpirationInfo);
    const rptId = fromNullable(service).chain(_ =>
      getRptIdFromNoticeNumber(
        _.organization_fiscal_code,
        messagePaymentExpirationInfo.noticeNumber
      )
    );
    const amount = getAmountFromPaymentAmount(
      messagePaymentExpirationInfo.amount
    );

    const onPressHandler = expired
      ? this.navigateToMessageDetail
      : !disabled && !this.paid && amount.isSome() && rptId.isSome()
        ? () => {
            this.props.refreshService(message.sender_service_id);
            // TODO: optimize the managment of the payment initialization https://www.pivotaltracker.com/story/show/169702534
            if (
              this.props.isEmailValidated &&
              !this.props.isUpdatedNeededPagoPa
            ) {
              this.props.paymentInitializeState();
              this.props.navigateToPaymentTransactionSummaryScreen({
                rptId: rptId.value,
                initialAmount: amount.value
              });
            } else {
              // Navigating to Wallet home, having the email address is not validated,
              // it will be displayed RemindEmailValidationOverlay
              this.props.navigateToWalletHomeScreen();
            }
          }
        : undefined;

    return (
      <PaymentButton
        paid={this.paid}
        messagePaymentExpirationInfo={messagePaymentExpirationInfo}
        small={small}
        disabled={disabled}
        onPress={onPressHandler}
      />
    );
  }

  private renderTopContainer = (
    maybeMessagePaymentExpirationInfo: Option<MessagePaymentExpirationInfo>
  ) => {
    const { small } = this.props;

    const calendarIcon = this.renderCalendarIcon(
      maybeMessagePaymentExpirationInfo
    );
    const calendarEventButton = this.renderCalendarEventButton(
      maybeMessagePaymentExpirationInfo
    );
    const paymentButton = this.renderPaymentButton(
      maybeMessagePaymentExpirationInfo
    );
    if (
      calendarIcon !== null ||
      calendarEventButton !== null ||
      paymentButton !== null
    ) {
      return (
        <View
          style={[
            styles.topContainer,
            this.paid ? styles.topContainerPaid : undefined,
            !small && styles.topContainerLarge
          ]}
        >
          {calendarIcon !== null && (
            <React.Fragment>
              {calendarIcon}
              <View style={{ marginLeft: 8 }} />
            </React.Fragment>
          )}

          {calendarEventButton !== null && (
            <React.Fragment>
              {calendarEventButton}
              <View style={{ marginLeft: 8 }} />
            </React.Fragment>
          )}

          {paymentButton}
        </View>
      );
    }

    return null;
  };

  private renderBottomContainer = (
    maybeMessagePaymentExpirationInfo: Option<MessagePaymentExpirationInfo>
  ) => {
    const { small } = this.props;

    if (
      !small &&
      maybeMessagePaymentExpirationInfo.isSome() &&
      isExpirable(maybeMessagePaymentExpirationInfo.value)
    ) {
      const messagePaymentExpirationInfo =
        maybeMessagePaymentExpirationInfo.value;

      const dueDate = messagePaymentExpirationInfo.dueDate;

      if (messagePaymentExpirationInfo.expireStatus === "VALID") {
        const time = format(dueDate, "HH.mm");
        const day = format(dueDate, I18n.t("global.dateFormats.dayMonthYear"));

        const block1 = I18n.t("messages.cta.payment.validAlert.block1");
        const block2 = I18n.t("messages.cta.payment.validAlert.block2", {
          time,
          day
        });

        return (
          <View style={[styles.bottomContainer, styles.bottomContainerValid]}>
            <StyledIconFont name="io-timer" size={24} />
            <Text style={styles.bottomContainerText}>
              {block1} <Text bold={true}>{block2}</Text>
            </Text>
          </View>
        );
      } else if (messagePaymentExpirationInfo.expireStatus === "EXPIRING") {
        const time = format(dueDate, "HH.mm");
        const todayOrTomorrow = isToday(dueDate)
          ? I18n.t("global.date.today")
          : I18n.t("global.date.tomorrow");

        const block1 = I18n.t("messages.cta.payment.expiringAlert.block1");
        const block2 = I18n.t("messages.cta.payment.expiringAlert.block2", {
          todayOrTomorrow
        });
        const block3 = I18n.t("messages.cta.payment.expiringAlert.block3");

        return (
          <View
            style={[styles.bottomContainer, styles.bottomContainerExpiring]}
          >
            <StyledIconFont
              name="io-timer"
              size={24}
              color={variables.colorWhite}
            />
            <Text white={true} style={styles.bottomContainerText}>
              {block1}{" "}
              <Text white={true} bold={true}>
                {block2}
              </Text>{" "}
              {block3}{" "}
              <Text white={true} bold={true}>
                {time}
              </Text>
            </Text>
          </View>
        );
      } else {
        const time = format(dueDate, "HH.mm");
        const day = format(dueDate, I18n.t("global.dateFormats.dayMonthYear"));
        const amount = formatPaymentAmount(messagePaymentExpirationInfo.amount);

        const block1 = I18n.t("messages.cta.payment.expiredAlert.block1");
        const block2 = I18n.t("messages.cta.payment.expiredAlert.block2", {
          amount
        });
        const block3 = I18n.t("messages.cta.payment.expiredAlert.block3");
        const block4 = I18n.t("messages.cta.payment.expiredAlert.block4");
        const block5 = I18n.t("messages.cta.payment.expiredAlert.block5");
        const block6 = I18n.t("messages.cta.payment.expiredAlert.block6");

        return (
          <View style={[styles.bottomContainer, styles.bottomContainerExpired]}>
            <CalendarIconComponent
              small={this.props.small}
              month={formatDateAsMonth(dueDate).toUpperCase()}
              day={formatDateAsDay(dueDate)}
              backgroundColor={variables.colorWhite}
              textColor={variables.brandDarkGray}
            />
            <Text white={true} style={styles.bottomContainerText}>
              {block1}{" "}
              <Text white={true} bold={true}>
                {block2}
              </Text>{" "}
              {block3}{" "}
              <Text white={true} bold={true}>
                {block4}
              </Text>{" "}
              {block5}{" "}
              <Text white={true} bold={true}>
                {time}
              </Text>{" "}
              {block6}{" "}
              <Text white={true} bold={true}>
                {day}
              </Text>
            </Text>
          </View>
        );
      }
    }

    return null;
  };

  public render() {
    const { message } = this.props;
    const { payment_data, due_date } = message.content;

    const maybeMessagePaymentExpirationInfo = fromNullable(payment_data).map(
      paymentData => getMessagePaymentExpirationInfo(paymentData, due_date)
    );

    return (
      <React.Fragment>
        {this.renderTopContainer(maybeMessagePaymentExpirationInfo)}
        {this.renderBottomContainer(maybeMessagePaymentExpirationInfo)}
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: GlobalState) => ({
  isEmailValidated: isProfileEmailValidatedSelector(state),
  isUpdatedNeededPagoPa: isUpdateNeeded(
    serverInfoDataSelector(state),
    "min_app_version_pagopa"
  )
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  refreshService: (serviceId: string) =>
    dispatch(loadServiceDetail.request(serviceId)),
  navigateToMessageDetail: (messageId: string) =>
    dispatch(navigateToMessageDetailScreenAction({ messageId })),
  navigateToWalletHomeScreen: () => dispatch(navigateToWalletHome()),
  paymentInitializeState: () => dispatch(paymentInitializeState()),
  navigateToPaymentTransactionSummaryScreen: (params: NavigationParams) =>
    dispatch(navigateToPaymentTransactionSummaryScreen(params)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MessageCTABar);
