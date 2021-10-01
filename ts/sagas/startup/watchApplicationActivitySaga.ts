import { Task } from "redux-saga";
import {
  call,
  cancel,
  Effect,
  fork,
  put,
  select,
  takeEvery
} from "redux-saga/effects";
import { ActionType, getType } from "typesafe-actions";
import { backgroundActivityTimeout } from "../../config";
import {
  applicationChangeState,
  ApplicationState
} from "../../store/actions/application";
import { identificationRequest } from "../../store/actions/identification";
import { navSelector } from "../../store/reducers/navigationHistory";
import { getCurrentRouteName } from "../../utils/navigation";
import { startTimer } from "../../utils/timer";
import { watchNotificationSaga } from "./watchNotificationSaga";

/**
 * Listen to APP_STATE_CHANGE_ACTION and:
 * - if needed, force the user to identify
 * - if a notification is pressed, redirect to the related message
 */
export function* watchApplicationActivitySaga(): IterableIterator<Effect> {
  // eslint-disable-next-line
  let lastState: ApplicationState = "active";
  // eslint-disable-next-line
  let identificationBackgroundTimer: Task | undefined;
  yield takeEvery(
    getType(applicationChangeState),
    function* (action: ActionType<typeof applicationChangeState>) {
      // Listen for changes in application state
      const newApplicationState: ApplicationState = action.payload;
      // eslint-disable-next-line

      const backgroundActivityTimeoutMillis = backgroundActivityTimeout * 1000;
      if (lastState !== "background" && newApplicationState === "background") {
        // Screens requiring identification when the app pass from background/inactive to active state
        const whiteList: ReadonlyArray<string> = [];

        const nav: ReturnType<typeof navSelector> = yield select(navSelector);
        const currentRoute = getCurrentRouteName(nav);
        const isSecuredRoute =
          // eslint-disable-next-line sonarjs/no-empty-collection
          currentRoute && whiteList.indexOf(currentRoute) !== -1;
        if (isSecuredRoute) {
          /**
           * Request always identification to display again screens included in the witheList.
           * It is done on status change from active/inactive to background to avoid secured
           * screen being displayed for a while before the IdentificationScreen when the user
           * focuses again on the app
           */
          yield put(identificationRequest());
        }
        // Start the background timer
        identificationBackgroundTimer = yield fork(function* () {
          // Start and wait the timer to fire
          yield call(startTimer, backgroundActivityTimeoutMillis);
          identificationBackgroundTimer = undefined;
          // Timer fired we need to identify the user again
          yield put(identificationRequest());
        });
      } else if (
        identificationBackgroundTimer &&
        lastState !== "active" &&
        newApplicationState === "active"
      ) {
        // Cancel the background timer if running
        yield cancel(identificationBackgroundTimer);
        identificationBackgroundTimer = undefined;
      }
      yield fork(watchNotificationSaga, lastState, newApplicationState);

      // Update the last state
      lastState = newApplicationState;
    }
  );
}
