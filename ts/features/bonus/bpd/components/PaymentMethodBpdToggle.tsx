import * as pot from "italia-ts-commons/lib/pot";
import { View } from "native-base";
import * as React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet } from "react-native";
import { NavigationContext, NavigationEvents } from "react-navigation";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import image from "../../../../../img/wallet/cards-icons/pagobancomat.png";
import { Body } from "../../../../components/core/typography/Body";
import { IOColors } from "../../../../components/core/variables/IOColors";
import IconFont from "../../../../components/ui/IconFont";
import Switch from "../../../../components/ui/Switch";
import { GlobalState } from "../../../../store/reducers/types";
import {
  bpdPaymentMethodActivation,
  BpdPaymentMethodActivation,
  BpdPmActivationStatus,
  bpdUpdatePaymentMethodActivation,
  HPan
} from "../store/actions/paymentMethods";
import { bpdPaymentMethodValueSelector } from "../store/reducers/details/paymentMethods";

type OwnProps = { hPan: HPan };

export type Props = ReturnType<typeof mapDispatchToProps> &
  ReturnType<typeof mapStateToProps> &
  OwnProps;

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48
  },
  cardIcon: {
    width: 40,
    height: 25,
    overflow: "hidden",
    resizeMode: "contain"
  }
});

type GraphicalState = "loading" | "ready" | "notActivable" | "update";

type GraphicalValue = {
  state: GraphicalState;
  value: BpdPmActivationStatus | undefined;
};

const renderToggle = (
  state: GraphicalValue,
  onValueChanged: (b: boolean) => void
) => {
  switch (state.state) {
    case "loading":
      return (
        <ActivityIndicator
          color={"black"}
          accessible={false}
          importantForAccessibility={"no-hide-descendants"}
          accessibilityElementsHidden={true}
        />
      );

    case "notActivable":
      return <IconFont name={"io-notice"} size={24} color={IOColors.blue} />;
    case "ready":
    case "update":
      return (
        <Switch
          value={state.value === "active"}
          disabled={state.state === "update"}
          onValueChange={onValueChanged}
        />
      );
  }
};

// TODO: retry on error, "notActivable" -> when no capability
const testCalculateGraphicalState = (
  potBpdActivation: pot.Pot<BpdPaymentMethodActivation, Error>
): GraphicalValue =>
  pot.fold<BpdPaymentMethodActivation, Error, GraphicalValue>(
    potBpdActivation,
    () => ({ state: "loading", value: undefined }),
    () => ({ state: "loading", value: undefined }),
    _ => ({ state: "loading", value: undefined }),
    _ => ({ state: "loading", value: undefined }),
    value => ({ state: "ready", value: value.activationStatus }),
    value => ({ state: "loading", value: value.activationStatus }),
    (_, newValue) => ({
      state: "update",
      value: newValue.activationStatus
    }),
    value => ({ state: "ready", value: value.activationStatus })
  );
/**
 * This component represents the activation state of bpd on a payment method.
 * - Load the initial value (is bpd active on the payment method)
 * - The toggle allows the user to enable or disable bpd on the payment method
 * - Sync the remote communication with the graphical states
 * @constructor
 */
const PaymentMethodBpdToggle: React.FunctionComponent<Props> = props => {
  const graphicalState = testCalculateGraphicalState(props.bpdPotActivation);
  const timerRetry = useRef<number | undefined>(undefined);
  const navigation = useContext(NavigationContext);

  console.log("render");
  const retry = () => {
    console.log("tic tac");
    // eslint-disable-next-line functional/immutable-data
    timerRetry.current = undefined;
    props.loadActualValue(props.hPan);
  };

  useEffect(() => {
    console.log("effect" + timerRetry.current);
    console.log("is Focus" + navigation.isFocused());
    if (props.bpdPotActivation === pot.none) {
      props.loadActualValue(props.hPan);
    } else if (
      pot.isNone(props.bpdPotActivation) &&
      pot.isError(props.bpdPotActivation) &&
      timerRetry.current === undefined
    ) {
      console.log("----> schedule");
      // eslint-disable-next-line functional/immutable-data
      timerRetry.current = setTimeout(retry, 10000);
    }
  }, [props.bpdPotActivation, timerRetry.current]);

  useEffect(
    () => () => {
      console.log("clean");
      clearTimeout(timerRetry.current);
    },
    []
  );

  return (
    <>
      <View style={styles.row}>
        <NavigationEvents
          onDidBlur={() => {
            console.log("blur");
            clearTimeout(timerRetry.current);
          }}
          onDidFocus={() => {
            console.log("focus");
            timerRetry.current = undefined;
          }}
        />
        <View style={{ flexDirection: "row", flex: 1 }}>
          <Image source={image} style={styles.cardIcon} />
          <View hspacer={true} />
          <Body>Intesa San Paolo</Body>
        </View>
        {renderToggle(graphicalState, b => props.updateValue(props.hPan, b))}
      </View>
    </>
  );
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  loadActualValue: (hPan: HPan) =>
    dispatch(bpdPaymentMethodActivation.request(hPan)),
  updateValue: (hPan: HPan, value: boolean) =>
    dispatch(bpdUpdatePaymentMethodActivation.request({ hPan, value }))
});

const mapStateToProps = (state: GlobalState, props: OwnProps) => ({
  bpdPotActivation: bpdPaymentMethodValueSelector(state, props.hPan)
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PaymentMethodBpdToggle);
