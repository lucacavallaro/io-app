/**
 * The screen to display to the user the various types of errors that occurred during the transaction.
 * Inside the cancel and retry buttons are conditionally returned.
 */
import { Option } from "fp-ts/lib/Option";
import { RptId, RptIdFromString } from "italia-pagopa-commons/lib/pagopa";
import * as React from "react";
import { Image, ImageSourcePropType, SafeAreaView } from "react-native";
import { NavigationInjectedProps } from "react-navigation";
import { connect } from "react-redux";
import { View } from "native-base";
import { ComponentProps } from "react";
import * as t from "io-ts";
import {
  openInstabugQuestionReport,
  setInstabugUserAttribute
} from "../../../boot/configureInstabug";
import BaseScreenComponent from "../../../components/screens/BaseScreenComponent";
import I18n from "../../../i18n";
import { navigateToPaymentManualDataInsertion } from "../../../store/actions/navigation";
import { Dispatch } from "../../../store/actions/types";
import {
  backToEntrypointPayment,
  paymentAttiva,
  paymentIdPolling,
  paymentVerifica
} from "../../../store/actions/wallet/payment";
import { paymentsLastDeletedStateSelector } from "../../../store/reducers/payments/lastDeleted";
import { GlobalState } from "../../../store/reducers/types";
import { PayloadForAction } from "../../../types/utils";
import { ErrorMacros, getV2ErrorMacro } from "../../../utils/payment";
import { useHardwareBackButton } from "../../../features/bonus/bonusVacanze/components/hooks/useHardwareBackButton";
import { InfoScreenComponent } from "../../../components/infoScreen/InfoScreenComponent";
import { Detail_v2Enum } from "../../../../definitions/backend/PaymentProblemJson";
import { H4 } from "../../../components/core/typography/H4";
import CopyButtonComponent from "../../../components/CopyButtonComponent";
import { FooterStackButton } from "../../../features/bonus/bonusVacanze/components/buttons/FooterStackButtons";
import {
  cancelButtonProps,
  confirmButtonProps
} from "../../../features/bonus/bonusVacanze/components/buttons/ButtonConfigurations";
import { IOStyles } from "../../../components/core/variables/IOStyles";
import { emptyContextualHelp } from "../../../utils/emptyContextualHelp";

type NavigationParams = {
  error: Option<
    PayloadForAction<
      | typeof paymentVerifica["failure"]
      | typeof paymentAttiva["failure"]
      | typeof paymentIdPolling["failure"]
    >
  >;
  rptId: RptId;
  onCancel: () => void;
  onRetry: () => void;
};

type OwnProps = NavigationInjectedProps<NavigationParams>;

type Props = OwnProps &
  ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;

// Save the rptId as attribute and open the Instabug report
const requestAssistanceForPaymentFailure = (rptId: RptId) => {
  setInstabugUserAttribute(
    "blockedPaymentRptId",
    RptIdFromString.encode(rptId)
  );
  openInstabugQuestionReport();
};
const baseIconPath = "../../../../img/";
const imageMapping: Record<ErrorMacros, ImageSourcePropType> = {
  DATA: require(baseIconPath + "pictograms/doubt.png"),
  DUPLICATED: require(baseIconPath + "pictograms/fireworks.png"),
  EC: require(baseIconPath + "wallet/errors/payment-unavailable-icon.png"),
  EXPIRED: require(baseIconPath + "servicesStatus/error-detail-icon.png"),
  ONGOING: require(baseIconPath + "pictograms/hourglass.png"),
  REVOKED: require(baseIconPath + "servicesStatus/error-detail-icon.png"),
  UNCOVERED: require(baseIconPath + "/wallet/errors/generic-error-icon.png"),
  TECHNICAL: require(baseIconPath + "servicesStatus/error-detail-icon.png")
};

type ScreenUIContents = {
  image: ImageSourcePropType;
  title: string;
  subtitle?: React.ReactNode;
  footerButtons?: ComponentProps<typeof FooterStackButton>["buttons"];
};

const ErrorCodeCopyComponent = ({
  error
}: {
  error: keyof typeof Detail_v2Enum;
}): React.ReactElement => (
  <>
    <H4 weight={"Regular"}>{I18n.t("wallet.errors.assistanceLabel")}</H4>
    <H4 weight={"Bold"}>{error}</H4>
    <View spacer />
    <CopyButtonComponent textToCopy={error} />
  </>
);

export const errorTransactionUIElements = (
  maybeError: NavigationParams["error"],
  rptId: RptId,
  onCancel: () => void
): ScreenUIContents => {
  const errorORUndefined = maybeError.toUndefined();

  if (errorORUndefined === "PAYMENT_ID_TIMEOUT") {
    return {
      image: require(baseIconPath +
        "wallet/errors/missing-payment-id-icon.png"),
      title: I18n.t("wallet.errors.MISSING_PAYMENT_ID")
    };
  }

  const errorMacro = getV2ErrorMacro(errorORUndefined);
  const validError = t.keyof(Detail_v2Enum).decode(errorORUndefined);
  const subtitle = validError.fold(
    _ => (
      <H4 weight={"Regular"}>
        {I18n.t("wallet.errors.GENERIC_ERROR_SUBTITLE")}
      </H4>
    ),
    error => <ErrorCodeCopyComponent error={error} />
  );

  const image = errorMacro
    ? imageMapping[errorMacro]
    : require(baseIconPath + "/wallet/errors/generic-error-icon.png");

  const sendReportButtons = [
    confirmButtonProps(
      () => requestAssistanceForPaymentFailure(rptId),
      I18n.t("wallet.errors.sendReport")
    )
  ];

  switch (errorMacro) {
    case "TECHNICAL":
      return {
        image,
        title: I18n.t("wallet.errors.TECHNICAL"),
        subtitle,
        footerButtons: sendReportButtons
      };
    case "DATA":
      return {
        image,
        title: I18n.t("wallet.errors.DATA"),
        subtitle,
        footerButtons: sendReportButtons
      };
    case "EC":
      return {
        image,
        title: I18n.t("wallet.errors.EC"),
        subtitle,
        footerButtons: [
          ...sendReportButtons,
          cancelButtonProps(onCancel, I18n.t("global.buttons.close"))
        ]
      };
    case "DUPLICATED":
      return {
        image,
        title: I18n.t("wallet.errors.PAYMENT_DUPLICATED"),
        footerButtons: [
          cancelButtonProps(onCancel, I18n.t("global.buttons.close"))
        ]
      };
    case "ONGOING":
      return {
        image,
        title: I18n.t("wallet.errors.PAYMENT_ONGOING"),
        subtitle: (
          <H4 weight={"Regular"} style={{ textAlign: "center" }}>
            {I18n.t("wallet.errors.ONGOING_SUBTITLE")}
          </H4>
        ),
        footerButtons: [
          confirmButtonProps(onCancel, I18n.t("global.buttons.close")),
          ...sendReportButtons
        ]
      };
    case "EXPIRED":
      return {
        image,
        title: I18n.t("wallet.errors.EXPIRED"),
        subtitle: (
          <H4 weight={"Regular"} style={{ textAlign: "center" }}>
            {I18n.t("wallet.errors.contactECsubtitle")}
          </H4>
        ),
        footerButtons: [
          cancelButtonProps(onCancel, I18n.t("global.buttons.close"))
        ]
      };
    case "REVOKED":
      return {
        image,
        title: I18n.t("wallet.errors.REVOKED"),
        subtitle: (
          <H4 weight={"Regular"} style={{ textAlign: "center" }}>
            {I18n.t("wallet.errors.contactECsubtitle")}
          </H4>
        ),
        footerButtons: [
          cancelButtonProps(onCancel, I18n.t("global.buttons.close"))
        ]
      };
    case "UNCOVERED":
    default:
      return {
        image,
        title: I18n.t("wallet.errors.GENERIC_ERROR"),
        subtitle,
        footerButtons: [
          confirmButtonProps(onCancel, I18n.t("global.buttons.close")),
          ...sendReportButtons
        ]
      };
  }
};

const TransactionErrorScreen = (props: Props) => {
  const rptId = props.navigation.getParam("rptId");
  const error = props.navigation.getParam("error");
  const onCancel = props.navigation.getParam("onCancel");

  const { title, subtitle, footerButtons, image } = errorTransactionUIElements(
    error,
    rptId,
    onCancel
  );

  const handleBackPress = () => {
    props.backToEntrypointPayment();
    return true;
  };

  useHardwareBackButton(handleBackPress);

  return (
    <BaseScreenComponent contextualHelp={emptyContextualHelp}>
      <SafeAreaView style={IOStyles.flex}>
        <InfoScreenComponent
          image={<Image source={image} />}
          title={title}
          body={subtitle}
        />
        {footerButtons && <FooterStackButton buttons={footerButtons} />}
      </SafeAreaView>
    </BaseScreenComponent>
  );
};

const mapStateToProps = (state: GlobalState) => ({
  lastDeleted: paymentsLastDeletedStateSelector(state)
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  navigateToPaymentManualDataInsertion: (isInvalidAmount: boolean) =>
    dispatch(navigateToPaymentManualDataInsertion({ isInvalidAmount })),
  backToEntrypointPayment: () => dispatch(backToEntrypointPayment())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TransactionErrorScreen);
