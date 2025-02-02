import { createStackNavigator } from "react-navigation-stack";
import { bonusVacanzeEnabled, bpdEnabled, cgnEnabled } from "../config";
import BonusVacanzeNavigator from "../features/bonus/bonusVacanze/navigation/navigator";
import BONUSVACANZE_ROUTES from "../features/bonus/bonusVacanze/navigation/routes";
import BpdNavigator from "../features/bonus/bpd/navigation/navigator";
import BPD_ROUTES from "../features/bonus/bpd/navigation/routes";
import CgnNavigator from "../features/bonus/cgn/navigation/navigator";
import CGN_ROUTES from "../features/bonus/cgn/navigation/routes";
import BancomatDetailScreen from "../features/wallet/bancomat/screen/BancomatDetailScreen";
import BPayDetailScreen from "../features/wallet/bancomatpay/screen/BPayDetailScreen";
import CobadgeDetailScreen from "../features/wallet/cobadge/screen/CobadgeDetailScreen";
import CreditCardDetailScreen from "../features/wallet/creditCard/screen/CreditCardDetailScreen";
import AddDigitalMethodScreen from "../features/wallet/onboarding/AddDigitalMethodScreen";
import WalletAddBancomatNavigator from "../features/wallet/onboarding/bancomat/navigation/navigator";
import WALLET_ONBOARDING_BANCOMAT_ROUTES from "../features/wallet/onboarding/bancomat/navigation/routes";
import PaymentMethodOnboardingBPayNavigator from "../features/wallet/onboarding/bancomatPay/navigation/navigator";
import WALLET_ONBOARDING_BPAY_ROUTES from "../features/wallet/onboarding/bancomatPay/navigation/routes";
import PaymentMethodOnboardingCoBadgeNavigator from "../features/wallet/onboarding/cobadge/navigation/navigator";
import WALLET_ONBOARDING_COBADGE_ROUTES from "../features/wallet/onboarding/cobadge/navigation/routes";
import PaymentMethodOnboardingPrivativeNavigator from "../features/wallet/onboarding/privative/navigation/navigator";
import WALLET_ONBOARDING_PRIVATIVE_ROUTES from "../features/wallet/onboarding/privative/navigation/routes";
import PaymentMethodOnboardingSatispayNavigator from "../features/wallet/onboarding/satispay/navigation/navigator";
import WALLET_ONBOARDING_SATISPAY_ROUTES from "../features/wallet/onboarding/satispay/navigation/routes";
import PrivativeDetailScreen from "../features/wallet/privative/screen/PrivativeDetailScreen";
import SatispayDetailScreen from "../features/wallet/satispay/screen/SatispayDetailScreen";
import AddCardScreen from "../screens/wallet/AddCardScreen";
import AddCreditCardOutcomeCodeMessage from "../screens/wallet/AddCreditCardOutcomeCodeMessage";
import AddPaymentMethodScreen from "../screens/wallet/AddPaymentMethodScreen";
import ConfirmCardDetailsScreen from "../screens/wallet/ConfirmCardDetailsScreen";
import CreditCardOnboardingAttemptDetailScreen from "../screens/wallet/creditCardOnboardingAttempts/CreditCardOnboardingAttemptDetailScreen";
import CreditCardOnboardingAttemptsScreen from "../screens/wallet/creditCardOnboardingAttempts/CreditCardOnboardingAttemptsScreen";
import ConfirmPaymentMethodScreen from "../screens/wallet/payment/ConfirmPaymentMethodScreen";
import ManualDataInsertionScreen from "../screens/wallet/payment/ManualDataInsertionScreen";
import PaymentOutcomeCodeMessage from "../screens/wallet/payment/PaymentOutcomeCodeMessage";
import PickPaymentMethodScreen from "../screens/wallet/payment/PickPaymentMethodScreen";
import PickPspScreen from "../screens/wallet/payment/PickPspScreen";
import ScanQrCodeScreen from "../screens/wallet/payment/ScanQrCodeScreen";
import TransactionErrorScreen from "../screens/wallet/payment/TransactionErrorScreen";
import TransactionSuccessScreen from "../screens/wallet/payment/TransactionSuccessScreen";
import TransactionSummaryScreen from "../screens/wallet/payment/TransactionSummaryScreen";
import PaymentHistoryDetailsScreen from "../screens/wallet/PaymentHistoryDetailsScreen";
import PaymentsHistoryScreen from "../screens/wallet/PaymentsHistoryScreen";
import TransactionDetailsScreen from "../screens/wallet/TransactionDetailsScreen";
import WalletHomeScreen from "../screens/wallet/WalletHomeScreen";
import ROUTES from "./routes";

const baseRouteConfigMap = {
  [ROUTES.WALLET_HOME]: {
    screen: WalletHomeScreen
  },
  [ROUTES.WALLET_ADD_PAYMENT_METHOD]: {
    screen: AddPaymentMethodScreen
  },
  [ROUTES.WALLET_TRANSACTION_DETAILS]: {
    screen: TransactionDetailsScreen
  },
  [ROUTES.WALLET_CREDIT_CARD_DETAIL]: {
    screen: CreditCardDetailScreen
  },
  [ROUTES.WALLET_BANCOMAT_DETAIL]: {
    screen: BancomatDetailScreen
  },
  [ROUTES.WALLET_SATISPAY_DETAIL]: {
    screen: SatispayDetailScreen
  },
  [ROUTES.WALLET_BPAY_DETAIL]: {
    screen: BPayDetailScreen
  },
  [ROUTES.WALLET_COBADGE_DETAIL]: {
    screen: CobadgeDetailScreen
  },
  [ROUTES.WALLET_PRIVATIVE_DETAIL]: {
    screen: PrivativeDetailScreen
  },
  [ROUTES.WALLET_ADD_CARD]: {
    screen: AddCardScreen
  },
  [ROUTES.WALLET_ADD_DIGITAL_PAYMENT_METHOD]: {
    screen: AddDigitalMethodScreen
  },
  [ROUTES.WALLET_CONFIRM_CARD_DETAILS]: {
    screen: ConfirmCardDetailsScreen
  },
  [ROUTES.PAYMENT_SCAN_QR_CODE]: {
    screen: ScanQrCodeScreen
  },
  [ROUTES.PAYMENT_MANUAL_DATA_INSERTION]: {
    screen: ManualDataInsertionScreen
  },
  [ROUTES.PAYMENT_TRANSACTION_SUMMARY]: {
    screen: TransactionSummaryScreen
  },
  [ROUTES.PAYMENT_TRANSACTION_SUCCESS]: {
    screen: TransactionSuccessScreen
  },
  [ROUTES.PAYMENT_TRANSACTION_ERROR]: {
    screen: TransactionErrorScreen
  },
  [ROUTES.PAYMENT_CONFIRM_PAYMENT_METHOD]: {
    screen: ConfirmPaymentMethodScreen
  },
  [ROUTES.PAYMENT_PICK_PSP]: {
    screen: PickPspScreen
  },
  [ROUTES.PAYMENT_PICK_PAYMENT_METHOD]: {
    screen: PickPaymentMethodScreen
  },
  [ROUTES.PAYMENTS_HISTORY_SCREEN]: {
    screen: PaymentsHistoryScreen
  },
  [ROUTES.PAYMENT_HISTORY_DETAIL_INFO]: {
    screen: PaymentHistoryDetailsScreen
  },
  [ROUTES.CREDIT_CARD_ONBOARDING_ATTEMPTS_SCREEN]: {
    screen: CreditCardOnboardingAttemptsScreen
  },
  [ROUTES.CREDIT_CARD_ONBOARDING_ATTEMPT_DETAIL]: {
    screen: CreditCardOnboardingAttemptDetailScreen
  },
  [ROUTES.ADD_CREDIT_CARD_OUTCOMECODE_MESSAGE]: {
    screen: AddCreditCardOutcomeCodeMessage
  },
  [ROUTES.PAYMENT_OUTCOMECODE_MESSAGE]: {
    screen: PaymentOutcomeCodeMessage
  }
};

const bonusVacanzeConfigMap = bonusVacanzeEnabled
  ? {
      [BONUSVACANZE_ROUTES.MAIN]: {
        screen: BonusVacanzeNavigator
      }
    }
  : {};

const bpdConfigMap = bpdEnabled
  ? {
      [BPD_ROUTES.MAIN]: {
        screen: BpdNavigator
      },
      [WALLET_ONBOARDING_BANCOMAT_ROUTES.MAIN]: {
        screen: WalletAddBancomatNavigator
      },
      [WALLET_ONBOARDING_SATISPAY_ROUTES.MAIN]: {
        screen: PaymentMethodOnboardingSatispayNavigator
      },
      [WALLET_ONBOARDING_BPAY_ROUTES.MAIN]: {
        screen: PaymentMethodOnboardingBPayNavigator
      },
      [WALLET_ONBOARDING_COBADGE_ROUTES.MAIN]: {
        screen: PaymentMethodOnboardingCoBadgeNavigator
      },
      [WALLET_ONBOARDING_PRIVATIVE_ROUTES.MAIN]: {
        screen: PaymentMethodOnboardingPrivativeNavigator
      }
    }
  : {};

const cgnConfigMap = cgnEnabled
  ? {
      [CGN_ROUTES.MAIN]: {
        screen: CgnNavigator
      }
    }
  : {};

const routeConfig = {
  ...baseRouteConfigMap,
  ...bonusVacanzeConfigMap,
  ...bpdConfigMap,
  ...cgnConfigMap
};

/**
 * TODO: migrate WALLET_TRANSACTION_SUMMARY on a new navigator for screens which does not visualize the footer menu.
 *   @https://www.pivotaltracker.com/n/projects/2048617/stories/158221096
 */
const WalletNavigator = createStackNavigator(routeConfig, {
  // Let each screen handle the header and navigation
  headerMode: "none",
  defaultNavigationOptions: {
    gesturesEnabled: false
  }
});

export default WalletNavigator;
