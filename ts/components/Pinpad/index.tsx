import { Tuple2 } from "italia-ts-commons/lib/tuples";
import { Text, View } from "native-base";
import * as React from "react";
import { Alert, StyleSheet } from "react-native";

import { debounce } from "lodash";
import I18n from "../../i18n";
import { BiometryPrintableSimpleType } from "../../screens/onboarding/FingerprintScreen";
import variables from "../../theme/variables";
import { PinString } from "../../types/PinString";
import { ComponentProps } from "../../types/react";
import { NEW_PIN_LENGTH, PIN_LENGTH } from "../../utils/constants";
import { ShakeAnimation } from "../animations/ShakeAnimation";
import { KeyPad } from "./KeyPad";
import { Baseline, Bullet } from "./Placeholders";

interface Props {
  activeColor: string;
  delayOnFailureMillis?: number;
  clearOnInvalid?: boolean;
  isFingerprintEnabled?: any;
  biometryType?: any;
  compareWithCode?: string;
  inactiveColor: string;
  disabled?: boolean;
  buttonType: ComponentProps<typeof KeyPad>["buttonType"];
  onFulfill: (code: PinString, isValid: boolean) => void;
  onCancel?: () => void;
  onPinResetHandler?: () => void;
  onFingerPrintReq?: () => void;
  onDeleteLastDigit?: () => void;
}

interface State {
  value: string;
  isDisabled: boolean;
  pinLength: number;
  pinPadValue: ReadonlyArray<string>;
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flexDirection: "row",
    justifyContent: "center"
  },
  text: {
    alignSelf: "center",
    justifyContent: "center",
    color: variables.colorWhite
  }
});

/**
 * A customized CodeInput component.
 */
class Pinpad extends React.PureComponent<Props, State> {
  private onFulfillTimeoutId?: number;
  private onDelayOnFailureTimeoutId?: number;
  private shakeAnimationRef = React.createRef<ShakeAnimation>();
  // Utility array of as many elements as how many digits the pin has.
  // Its map method will be used to render the pin's placeholders.
  private placeholderPositions: ReadonlyArray<undefined>;

  /**
   * Print the only BiometrySimplePrintableType values that are passed to the UI
   * @param biometrySimplePrintableType
   */
  private renderBiometryType(
    biometryPrintableSimpleType: BiometryPrintableSimpleType
  ): string {
    switch (biometryPrintableSimpleType) {
      case "FINGERPRINT":
        return "fingerprint-onboarding-icon.png";
      case "FACE_ID":
        return "faceid-onboarding-icon.png";
      case "TOUCH_ID":
        return "fingerprint-onboarding-icon.png";
    }
  }

  private deleteLastDigit = () => {
    this.setState(prev => ({
      value:
        prev.value.length > 0
          ? prev.value.slice(0, prev.value.length - 1)
          : prev.value
    }));
    if (this.props.onDeleteLastDigit) {
      this.props.onDeleteLastDigit();
    }
  };

  private pinPadDigits = (): ComponentProps<typeof KeyPad>["digits"] => {
    const { pinPadValue } = this.state;

    return [
      [
        Tuple2(pinPadValue[0], () => this.handlePinDigit(pinPadValue[0])),
        Tuple2(pinPadValue[1], () => this.handlePinDigit(pinPadValue[1])),
        Tuple2(pinPadValue[2], () => this.handlePinDigit(pinPadValue[2]))
      ],
      [
        Tuple2(pinPadValue[3], () => this.handlePinDigit(pinPadValue[3])),
        Tuple2(pinPadValue[4], () => this.handlePinDigit(pinPadValue[4])),
        Tuple2(pinPadValue[5], () => this.handlePinDigit(pinPadValue[5]))
      ],
      [
        Tuple2(pinPadValue[6], () => this.handlePinDigit(pinPadValue[6])),
        Tuple2(pinPadValue[7], () => this.handlePinDigit(pinPadValue[7])),
        Tuple2(pinPadValue[8], () => this.handlePinDigit(pinPadValue[8]))
      ],
      [
        this.props.onCancel
          ? Tuple2(
              I18n.t("global.buttons.cancel").toUpperCase(),
              this.props.onCancel
            )
          : this.props.isFingerprintEnabled &&
            this.props.biometryType &&
            this.props.onFingerPrintReq
            ? Tuple2(
                // set the image name
                this.renderBiometryType(this.props.biometryType),
                this.props.onFingerPrintReq
              )
            : undefined,
        Tuple2("0", () => this.handlePinDigit("0")),
        Tuple2("<", this.deleteLastDigit)
      ]
    ];
  };

  private confirmResetAlert = () =>
    Alert.alert(
      I18n.t("pin_login.forgetPin.confirmTitle"),
      I18n.t("pin_login.forgetPin.confirmMsg"),
      [
        {
          text: I18n.t("global.buttons.confirm"),
          style: "default",
          onPress: this.props.onPinResetHandler
        },
        {
          text: I18n.t("global.buttons.cancel"),
          style: "cancel"
        }
      ],
      { cancelable: false }
    );

  constructor(props: Props) {
    super(props);
    this.placeholderPositions = [...new Array(PIN_LENGTH)];
    this.state = {
      value: "",
      isDisabled: false,
      pinLength: PIN_LENGTH,
      pinPadValue: new Array("1", "2", "3", "4", "5", "6", "7", "8", "9")
    };
  }

  public componentWillMount() {
    const { pinPadValue } = this.state;

    // tslint:disable-next-line: readonly-array
    const newPinPadValue = (pinPadValue as string[]).sort(() => {
      return Math.random() - 0.5;
    });

    if (
      (this.props.compareWithCode && this.props.compareWithCode.length > 5) ||
      this.props.compareWithCode === undefined
    ) {
      // tslint:disable-next-line: no-object-mutation
      this.placeholderPositions = [...new Array(NEW_PIN_LENGTH)];
      this.setState({
        pinLength: NEW_PIN_LENGTH,
        pinPadValue: newPinPadValue
      });
    } else {
      this.setState({
        pinPadValue: newPinPadValue
      });
    }
  }

  public componentWillUnmount() {
    if (this.onFulfillTimeoutId) {
      clearTimeout(this.onFulfillTimeoutId);
    } else if (this.onDelayOnFailureTimeoutId) {
      clearTimeout(this.onDelayOnFailureTimeoutId);
    }
  }

  private handleChangeText = (inputValue: string) => {
    // if the component is disabled don't handle any input
    if (this.props.disabled) {
      return;
    }
    this.setState({ value: inputValue });

    // Pin is fulfilled
    if (inputValue.length === this.state.pinLength) {
      const isValid = inputValue === this.props.compareWithCode;

      if (!isValid && this.props.clearOnInvalid) {
        this.debounceClear();
        if (this.props.delayOnFailureMillis) {
          // disable click keypad
          this.setState({
            isDisabled: true
          });

          // re-enable after delayOnFailureMillis milliseconds
          // tslint:disable-next-line: no-object-mutation
          this.onDelayOnFailureTimeoutId = setTimeout(() => {
            this.setState({
              isDisabled: false
            });
          }, this.props.delayOnFailureMillis);
          // start animation 'shake'
          if (this.shakeAnimationRef.current) {
            this.shakeAnimationRef.current.shake();
          }
        }
      }

      // Fire the callback asynchronously, otherwise this component
      // will be unmounted before the render of the last bullet placeholder.
      // tslint:disable-next-line no-object-mutation
      this.onFulfillTimeoutId = setTimeout(() =>
        this.props.onFulfill(inputValue as PinString, isValid)
      );
    }
  };

  private handlePinDigit = (digit: string) =>
    this.handleChangeText(`${this.state.value}${digit}`);

  private renderPlaceholder = (_: undefined, i: number) => {
    const isPlaceholderPopulated = i <= this.state.value.length - 1;
    const { activeColor, inactiveColor } = this.props;

    return isPlaceholderPopulated ? (
      <Bullet color={activeColor} key={`baseline-${i}`} />
    ) : (
      <Baseline color={inactiveColor} key={`baseline-${i}`} />
    );
  };

  public debounceClear = debounce(() => {
    this.setState({ value: "" });
  }, 100);

  public render() {
    return (
      <React.Fragment>
        <View style={styles.placeholderContainer}>
          {this.placeholderPositions.map(this.renderPlaceholder)}
        </View>
        <View spacer={true} />
        {this.props.onPinResetHandler !== undefined && (
          <React.Fragment>
            <Text
              primary={true}
              onPress={this.confirmResetAlert}
              style={styles.text}
            >
              {I18n.t("pin_login.pin.reset.button")}
            </Text>
            <View spacer={true} />
          </React.Fragment>
        )}
        <View spacer={true} />
        <ShakeAnimation duration={600} ref={this.shakeAnimationRef}>
          <KeyPad
            digits={this.pinPadDigits()}
            buttonType={this.props.buttonType}
            isDisabled={this.state.isDisabled}
          />
        </ShakeAnimation>
      </React.Fragment>
    );
  }
}

export default Pinpad;
