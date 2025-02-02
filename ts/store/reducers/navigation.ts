import { index } from "fp-ts/lib/Array";
import { none, Option } from "fp-ts/lib/Option";
import {
  NavigationActions,
  NavigationState,
  StackActions,
  SwitchActions
} from "react-navigation";
import { createSelector } from "reselect";
import { getType } from "typesafe-actions";
import AppNavigator from "../../navigation/AppNavigator";
import { getRouteName } from "../../utils/navigation";
import { navigationRestore } from "../actions/navigation";
import { Action } from "../actions/types";
import { GlobalState } from "./types";

const INITIAL_STATE: NavigationState = AppNavigator.router.getStateForAction(
  NavigationActions.init()
);

// Selectors
export const navigationStateSelector = (state: GlobalState): NavigationState =>
  state.nav;

/**
 * If some, it returns the name of the current route.
 * Don't use this as conditional param to update the rendering of a component or to compute
 * another selector because return always a different {@link Option} each time the state is updated
 * @param state
 */
export const navigationCurrentRouteSelector = (
  state: GlobalState
): Option<string> =>
  index(state.nav.index, [...state.nav.routes]).fold(none, ln =>
    "routes" in ln && "index" in ln
      ? getRouteName(ln.routes[ln.index])
      : getRouteName(ln)
  );

// Return a string that represent the current route
export const plainNavigationCurrentRouteSelector = createSelector(
  navigationCurrentRouteSelector,
  maybeRoute => maybeRoute.getOrElse("")
);

function nextState(state: NavigationState, action: Action): NavigationState {
  switch (action.type) {
    /**
     * The getStateForAction method only accepts NavigationActions so we need to
     * check the action type.
     */
    case NavigationActions.INIT:
    case NavigationActions.NAVIGATE:
    case NavigationActions.SET_PARAMS:
    case StackActions.RESET:
    case StackActions.REPLACE:
    case StackActions.POP_TO_TOP:
    case StackActions.COMPLETE_TRANSITION:
    case SwitchActions.JUMP_TO:
      return AppNavigator.router.getStateForAction(action, state);

    // Used to restore a saved navigation state
    case getType(navigationRestore):
      return { ...action.payload };

    default:
      return state;
  }
}

const reducer = (
  state: NavigationState = INITIAL_STATE,
  action: Action
): NavigationState => nextState(state, action) || state;

export default reducer;
