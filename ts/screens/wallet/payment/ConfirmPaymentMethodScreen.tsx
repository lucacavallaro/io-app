import { StackScreenProps } from "@react-navigation/stack";
import { fromNullable, none, Option, some } from "fp-ts/lib/Option";
import { AmountInEuroCents, RptId } from "italia-pagopa-commons/lib/pagopa";
import { ActionSheet, Content, Text, View } from "native-base";
import * as React from "react";
import { Alert, StyleSheet } from "react-native";
import { connect } from "react-redux";
import { ImportoEuroCents } from "../../../../definitions/backend/ImportoEuroCents";
import { PaymentRequestsGetResponse } from "../../../../definitions/backend/PaymentRequestsGetResponse";
import ButtonDefaultOpacity from "../../../components/ButtonDefaultOpacity";
import ContextualInfo from "../../../components/ContextualInfo";
import { H4 } from "../../../components/core/typography/H4";
import { Link } from "../../../components/core/typography/Link";
import { withLightModalContext } from "../../../components/helpers/withLightModalContext";
import { withLoadingSpinner } from "../../../components/helpers/withLoadingSpinner";
import BaseScreenComponent, {
  ContextualHelpPropsMarkdown
} from "../../../components/screens/BaseScreenComponent";
import IconFont from "../../../components/ui/IconFont";
import { LightModalContextInterface } from "../../../components/ui/LightModal";
import Markdown from "../../../components/ui/Markdown";
import CardComponent from "../../../components/wallet/card/CardComponent";
import PaymentBannerComponent from "../../../components/wallet/PaymentBannerComponent";
import { PayWebViewModal } from "../../../components/wallet/PayWebViewModal";
import { pagoPaApiUrlPrefix, pagoPaApiUrlPrefixTest } from "../../../config";
import {
  isError,
  isLoading,
  isReady
} from "../../../features/bonus/bpd/model/RemoteValue";
import I18n from "../../../i18n";
import {
  navigateToPaymentOutcomeCode,
  navigateToPaymentPickPaymentMethodScreen,
  navigateToPaymentPickPspScreen
} from "../../../store/actions/navigation";
import { Dispatch } from "../../../store/actions/types";
import { paymentOutcomeCode } from "../../../store/actions/wallet/outcomeCode";
import {
  abortRunningPayment,
  paymentCompletedFailure,
  paymentCompletedSuccess,
  paymentExecuteStart,
  paymentWebViewEnd,
  PaymentWebViewEndReason
} from "../../../store/actions/wallet/payment";
import { fetchTransactionsRequestWithExpBackoff } from "../../../store/actions/wallet/transactions";
import { isPagoPATestEnabledSelector } from "../../../store/reducers/persistedPreferences";
import { GlobalState } from "../../../store/reducers/types";
import { outcomeCodesSelector } from "../../../store/reducers/wallet/outcomeCode";
import {
  paymentStartPayloadSelector,
  PaymentStartWebViewPayload,
  pmSessionTokenSelector
} from "../../../store/reducers/wallet/payment";
import variables from "../../../theme/variables";
import customVariables from "../../../theme/variables";
import { OutcomeCodesKey } from "../../../types/outcomeCode";
import { Psp, Wallet } from "../../../types/pagopa";
import { PayloadForAction } from "../../../types/utils";
import { getLocalePrimaryWithFallback } from "../../../utils/locale";
import { isPaymentOutcomeCodeSuccessfully } from "../../../utils/payment";
import { getLookUpIdPO } from "../../../utils/pmLookUpId";
import { showToast } from "../../../utils/showToast";
import { formatNumberCentsToAmount } from "../../../utils/stringBuilder";

export type NavigationParams = Readonly<{
  ConfirmPaymentMethodScreen: {
    rptId: RptId;
    initialAmount: AmountInEuroCents;
    verifica: PaymentRequestsGetResponse;
    idPayment: string;
    wallet: Wallet;
    psps: ReadonlyArray<Psp>;
  };
}>;

type OwnProps = StackScreenProps<
  NavigationParams,
  "ConfirmPaymentMethodScreen"
>;

type Props = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps> &
  LightModalContextInterface &
  OwnProps;

const styles = StyleSheet.create({
  child: {
    flex: 1,
    alignContent: "center"
  },
  childTwice: {
    flex: 2,
    alignContent: "center"
  },
  parent: {
    flexDirection: "row"
  },
  paddedLR: {
    paddingLeft: variables.contentPadding,
    paddingRight: variables.contentPadding
  },
  textRight: {
    textAlign: "right"
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: variables.brandGray
  },
  textCenter: {
    textAlign: "center"
  },
  padded: { paddingHorizontal: customVariables.contentPadding },
  alert: {
    backgroundColor: customVariables.brandHighLighter,
    paddingHorizontal: customVariables.contentPadding,
    paddingVertical: 11,
    flexDirection: "row"
  },
  alertIcon: {
    alignSelf: "center",
    paddingRight: 18
  },
  flex: { flex: 1 },
  textColor: { color: customVariables.brandDarkGray }
});

const contextualHelpMarkdown: ContextualHelpPropsMarkdown = {
  title: "wallet.whyAFee.title",
  body: "wallet.whyAFee.text"
};

const payUrlSuffix = "/v3/webview/transactions/pay";
const webViewExitPathName = "/v3/webview/logout/bye";
const webViewOutcomeParamName = "outcome";

const ConfirmPaymentMethodScreen: React.FC<Props> = (props: Props) => {
  React.useEffect(() => {
    // show a toast if we got an error while retrieving pm session token
    if (props.retrievingSessionTokenError.isSome()) {
      showToast(I18n.t("global.actions.retry"));
    }
  }, [props.retrievingSessionTokenError]);

  const showHelp = () => {
    props.showModal(
      <ContextualInfo
        onClose={props.hideModal}
        title={I18n.t("wallet.whyAFee.title")}
        body={() => <Markdown>{I18n.t("wallet.whyAFee.text")}</Markdown>}
      />
    );
  };
  const urlPrefix = props.isPagoPATestEnabled
    ? pagoPaApiUrlPrefixTest
    : pagoPaApiUrlPrefix;

  const verifica: PaymentRequestsGetResponse = props.route.params.verifica;
  const wallet: Wallet = props.route.params.wallet;
  const idPayment: string = props.route.params.idPayment;
  const paymentReason = verifica.causaleVersamento;
  const maybePsp = fromNullable(wallet.psp);
  const fee = maybePsp.fold(undefined, psp => psp.fixedCost.amount);

  const totalAmount = maybePsp.fold(
    verifica.importoSingoloVersamento,
    fee =>
      (verifica.importoSingoloVersamento as number) +
      (fee.fixedCost.amount as number)
  );

  // emit an event to inform the pay web view finished
  // dispatch the outcome code and navigate to payment outcome code screen
  const handlePaymentOutcome = (maybeOutcomeCode: Option<string>) => {
    // the outcome is a payment done successfully
    if (
      maybeOutcomeCode.isSome() &&
      isPaymentOutcomeCodeSuccessfully(
        maybeOutcomeCode.value,
        props.outcomeCodes
      )
    ) {
      // store the rptid of a payment done
      props.dispatchPaymentCompleteSuccessfully(props.route.params.rptId);
      // refresh transactions list
      props.loadTransactions();
    } else {
      props.dispatchPaymentFailure(
        maybeOutcomeCode.filter(OutcomeCodesKey.is).toUndefined(),
        idPayment
      );
    }
    props.dispatchEndPaymentWebview("EXIT_PATH");
    props.dispatchPaymentOutCome(maybeOutcomeCode);
    props.navigateToOutComePaymentScreen();
  };

  // the user press back during the pay web view challenge
  const handlePayWebviewGoBack = () => {
    Alert.alert(I18n.t("payment.abortWebView.title"), "", [
      {
        text: I18n.t("payment.abortWebView.confirm"),
        onPress: () => {
          props.dispatchCancelPayment();
          props.dispatchEndPaymentWebview("USER_ABORT");
        },
        style: "cancel"
      },
      {
        text: I18n.t("payment.abortWebView.cancel")
      }
    ]);
  };

  const formData = props.payStartWebviewPayload
    .map<Record<string, string | number>>(payload => ({
      ...payload,
      ...getLookUpIdPO()
    }))
    .getOrElse({});

  return (
    <BaseScreenComponent
      goBack={props.onCancel}
      headerTitle={I18n.t("wallet.ConfirmPayment.header")}
      contextualHelpMarkdown={contextualHelpMarkdown}
      faqCategories={["payment"]}
    >
      <Content noPadded={true} bounces={false}>
        <PaymentBannerComponent
          currentAmount={verifica.importoSingoloVersamento}
          paymentReason={paymentReason}
          fee={fee as ImportoEuroCents}
        />
        <View style={styles.padded}>
          <View spacer={true} />
          <CardComponent
            type={"Full"}
            wallet={wallet}
            hideMenu={true}
            hideFavoriteIcon={true}
          />
          <View spacer={true} />
          {maybePsp.isNone() ? (
            <H4 weight={"Regular"}>{I18n.t("payment.noPsp")}</H4>
          ) : (
            <H4 weight={"Regular"}>
              {I18n.t("payment.currentPsp")}
              <H4>{` ${maybePsp.value.businessName}`}</H4>
            </H4>
          )}
          <Link onPress={props.pickPsp} weight={"Bold"}>
            {I18n.t("payment.changePsp")}
          </Link>
          <View spacer={true} large={true} />
          <Link onPress={showHelp} testID="why-a-fee">
            {I18n.t("wallet.whyAFee.title")}
          </Link>
        </View>
      </Content>

      <View style={styles.alert}>
        <IconFont
          style={styles.alertIcon}
          name={"io-notice"}
          size={24}
          color={customVariables.brandDarkGray}
        />
        <Text style={[styles.flex, styles.textColor]}>
          <Text bold={true}>{I18n.t("global.genericAlert")}</Text>
          {` ${I18n.t("wallet.ConfirmPayment.info")}`}
        </Text>
      </View>

      <View footer={true}>
        <ButtonDefaultOpacity
          block={true}
          primary={true}
          // a payment is running
          disabled={props.payStartWebviewPayload.isSome()}
          onPress={() =>
            props.dispatchPaymentStart({
              idWallet: wallet.idWallet,
              idPayment,
              language: getLocalePrimaryWithFallback()
            })
          }
        >
          <Text>{`${I18n.t(
            "wallet.ConfirmPayment.goToPay"
          )} ${formatNumberCentsToAmount(totalAmount, true)}`}</Text>
        </ButtonDefaultOpacity>
        <View spacer={true} />
        <View style={styles.parent}>
          <ButtonDefaultOpacity
            style={styles.child}
            block={true}
            cancel={true}
            onPress={props.onCancel}
          >
            <Text>{I18n.t("global.buttons.cancel")}</Text>
          </ButtonDefaultOpacity>
          <View hspacer={true} />
          <ButtonDefaultOpacity
            style={styles.childTwice}
            block={true}
            bordered={true}
            onPress={props.pickPaymentMethod}
          >
            <Text>{I18n.t("wallet.ConfirmPayment.change")}</Text>
          </ButtonDefaultOpacity>
        </View>
      </View>
      {props.payStartWebviewPayload.isSome() && (
        <PayWebViewModal
          postUri={urlPrefix + payUrlSuffix}
          formData={formData}
          finishPathName={webViewExitPathName}
          onFinish={handlePaymentOutcome}
          outcomeQueryparamName={webViewOutcomeParamName}
          onGoBack={handlePayWebviewGoBack}
          modalHeaderTitle={I18n.t("wallet.challenge3ds.header")}
        />
      )}
    </BaseScreenComponent>
  );
};

const mapStateToProps = (state: GlobalState) => {
  const pmSessionToken = pmSessionTokenSelector(state);
  const paymentStartPayload = paymentStartPayloadSelector(state);
  const payStartWebviewPayload: Option<PaymentStartWebViewPayload> =
    isReady(pmSessionToken) && paymentStartPayload
      ? some({ ...paymentStartPayload, sessionToken: pmSessionToken.value })
      : none;
  return {
    isPagoPATestEnabled: isPagoPATestEnabledSelector(state),
    outcomeCodes: outcomeCodesSelector(state),
    payStartWebviewPayload,
    isLoading: isLoading(pmSessionToken),
    retrievingSessionTokenError: isError(pmSessionToken)
      ? some(pmSessionToken.error.message)
      : none
  };
};

const mapDispatchToProps = (dispatch: Dispatch, props: OwnProps) => {
  const dispatchCancelPayment = () => {
    dispatch(abortRunningPayment());
    showToast(I18n.t("wallet.ConfirmPayment.cancelPaymentSuccess"), "success");
  };
  return {
    pickPaymentMethod: () =>
      dispatch(
        navigateToPaymentPickPaymentMethodScreen({
          rptId: props.route.params.rptId,
          initialAmount: props.route.params.initialAmount,
          verifica: props.route.params.verifica,
          idPayment: props.route.params.idPayment
        })
      ),
    pickPsp: () =>
      dispatch(
        navigateToPaymentPickPspScreen({
          rptId: props.route.params.rptId,
          initialAmount: props.route.params.initialAmount,
          verifica: props.route.params.verifica,
          idPayment: props.route.params.idPayment,
          psps: props.route.params.psps,
          wallet: props.route.params.wallet,
          chooseToChange: true
        })
      ),
    onCancel: () => {
      ActionSheet.show(
        {
          options: [
            I18n.t("wallet.ConfirmPayment.confirmCancelPayment"),
            I18n.t("wallet.ConfirmPayment.confirmContinuePayment")
          ],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          title: I18n.t("wallet.ConfirmPayment.confirmCancelTitle")
        },
        buttonIndex => {
          if (buttonIndex === 0) {
            dispatchCancelPayment();
          }
        }
      );
    },
    dispatchPaymentStart: (
      payload: PayloadForAction<typeof paymentExecuteStart["request"]>
    ) => dispatch(paymentExecuteStart.request(payload)),
    dispatchEndPaymentWebview: (reason: PaymentWebViewEndReason) => {
      dispatch(paymentWebViewEnd(reason));
    },
    dispatchCancelPayment,
    dispatchPaymentOutCome: (outComeCode: Option<string>) =>
      dispatch(paymentOutcomeCode(outComeCode)),
    navigateToOutComePaymentScreen: () =>
      dispatch(navigateToPaymentOutcomeCode()),
    loadTransactions: () =>
      dispatch(fetchTransactionsRequestWithExpBackoff({ start: 0 })),

    dispatchPaymentCompleteSuccessfully: (rptId: RptId) =>
      dispatch(
        paymentCompletedSuccess({
          kind: "COMPLETED",
          rptId,
          transaction: undefined
        })
      ),
    dispatchPaymentFailure: (
      outcomeCode: OutcomeCodesKey | undefined,
      paymentId: string
    ) => dispatch(paymentCompletedFailure({ outcomeCode, paymentId }))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withLightModalContext(withLoadingSpinner(ConfirmPaymentMethodScreen)));
