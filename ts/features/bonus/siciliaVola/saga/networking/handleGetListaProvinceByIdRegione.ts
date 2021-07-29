import { BackendSiciliaVolaClient } from "../../api/backendSiciliaVola";
import { call, put } from "redux-saga/effects";
import { getGenericError, getNetworkError } from "../../../../../utils/errors";
import { svGenerateVoucherAvailableProvince } from "../../store/actions/voucherGeneration";
import { SagaCallReturnType } from "../../../../../types/utils";
import { Province } from "../../types/SvVoucherRequest";
import { isDefined } from "../../../../../utils/guards";
import { ActionType } from "typesafe-actions";
import { ProvinciaBeanList } from "../../../../../../definitions/api_sicilia_vola/ProvinciaBeanList";

// TODO: add the mapping when the swagger will be fixed
const mapKinds: Record<number, string> = {};

// convert a success response to the logical app representation of it
const convertSuccess = (
  listaProvince: ProvinciaBeanList
): ReadonlyArray<Province> => {
  return listaProvince
    .map(p =>
      p.sigla && p.descrizione
        ? {
            id: p.sigla,
            name: p.descrizione
          }
        : undefined
    )
    .filter(isDefined);
};

export function* handleGetListaProvinceByIdRegione(
  getListaProvince: ReturnType<
    typeof BackendSiciliaVolaClient
  >["getListaProvinceByIdRegione"],
  action: ActionType<typeof svGenerateVoucherAvailableProvince.request>
) {
  try {
    const getListaProvinceResult: SagaCallReturnType<typeof getListaProvince> = yield call(
      getListaProvince,
      { idRegione: action.payload }
    );

    if (getListaProvinceResult.isRight()) {
      if (getListaProvinceResult.value.status === 200) {
        yield put(
          svGenerateVoucherAvailableProvince.success(
            convertSuccess(getListaProvinceResult.value.value)
          )
        );
      }
      if (mapKinds[getListaProvinceResult.value.status] !== undefined) {
        yield put(
          svGenerateVoucherAvailableProvince.failure({
            ...getGenericError(
              new Error(mapKinds[getListaProvinceResult.value.status])
            )
          })
        );
      }
    } else {
      // cannot decode response
      yield put(
        svGenerateVoucherAvailableProvince.failure({
          ...getGenericError(new Error("Generic Error"))
        })
      );
    }
  } catch (e) {
    yield put(
      svGenerateVoucherAvailableProvince.failure({ ...getNetworkError(e) })
    );
  }
}