import * as React from "react";
import { useContext, useEffect } from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { ActivityIndicator, FlatList, SafeAreaView } from "react-native";
import { View } from "native-base";
import BaseScreenComponent from "../../../../../components/screens/BaseScreenComponent";
import { emptyContextualHelp } from "../../../../../utils/emptyContextualHelp";
import { IOStyles } from "../../../../../components/core/variables/IOStyles";
import { H1 } from "../../../../../components/core/typography/H1";
import { GlobalState } from "../../../../../store/reducers/types";
import I18n from "../../../../../i18n";
import {
  BottomTopAnimation,
  LightModalContext
} from "../../../../../components/ui/LightModal";
import SvVoucherListFilters from "../../components/SvVoucherListFilters";
import {
  svPossibleVoucherStateGet,
  svSetFilter,
  svVoucherListGet
} from "../../store/actions/voucherList";
import ListItemComponent from "../../../../../components/screens/ListItemComponent";
import ItemSeparatorComponent from "../../../../../components/ItemSeparatorComponent";
import { svVouchersSelector } from "../../store/reducers/voucherList/vouchers";
import { toArray } from "../../../../../store/helpers/indexer";
import { formatDateAsLocal } from "../../../../../utils/dates";
import {
  FilterState,
  svFiltersSelector
} from "../../store/reducers/voucherList/filters";
import { VoucherPreview } from "../../types/SvVoucherResponse";
import {
  svRequiredDataLoadedSelector,
  svVouchersListUiSelector
} from "../../store/reducers/voucherList/ui";
import {
  isError,
  isLoading,
  isReady,
  isUndefined
} from "../../../bpd/model/RemoteValue";
import { svGenerateVoucherStart } from "../../store/actions/voucherGeneration";
import { useIODispatch } from "../../../../../store/hooks";
import { confirmButtonProps } from "../../../bonusVacanze/components/buttons/ButtonConfigurations";
import FooterWithButtons from "../../../../../components/ui/FooterWithButtons";
import EmptyListImage from "../../../../../../img/bonus/siciliaVola/emptyVoucherList.svg";
import { InfoScreenComponent } from "../../../../../components/infoScreen/InfoScreenComponent";
import { LoadingErrorComponent } from "../../../bonusVacanze/components/loadingErrorScreen/LoadingErrorComponent";
import { possibleVoucherStateSelector } from "../../store/reducers/voucherList/possibleVoucherState";
import { showToast } from "../../../../../utils/showToast";

type Props = ReturnType<typeof mapDispatchToProps> &
  ReturnType<typeof mapStateToProps>;

const RenderItemBase = (voucher: VoucherPreview): React.ReactElement | null => (
  <ListItemComponent
    title={voucher.destination}
    subTitle={formatDateAsLocal(voucher.departureDate, true, true)}
    onPress={() => true}
  />
);

/**
 * In order to optimize the rendering of the item, we use the keyId as unique identifier to avoid to redraw the component.
 * The trx data cannot change while consulting the list and we use this information to avoid a deep comparison
 */
export const RenderItem = React.memo(
  RenderItemBase,
  (prev: VoucherPreview, curr: VoucherPreview) =>
    prev.idVoucher !== curr.idVoucher
);

/**
 * Loading item, placed in the footer during the loading of the next page
 * @constructor
 */
const FooterLoading = () => (
  <>
    <View spacer={true} />
    <ActivityIndicator
      color={"black"}
      accessible={false}
      importantForAccessibility={"no-hide-descendants"}
      accessibilityElementsHidden={true}
      testID={"activityIndicator"}
    />
  </>
);

const EmptyVoucherList = () => {
  const dispatch = useIODispatch();

  return (
    <>
      <InfoScreenComponent
        image={<EmptyListImage width={104} height={104} />}
        title={I18n.t("bonus.sv.voucherList.emptyList.title")}
        body={I18n.t("bonus.sv.voucherList.emptyList.subtitle")}
      />
      <FooterWithButtons
        type={"SingleButton"}
        leftButton={confirmButtonProps(
          () => dispatch(svGenerateVoucherStart()),
          I18n.t("bonus.sv.voucherList.emptyList.cta")
        )}
      />
    </>
  );
};

const VoucherListScreen = (props: Props): React.ReactElement => {
  const { showAnimatedModal, hideModal } = useContext(LightModalContext);

  const vouchers = toArray(props.indexedVouchers);
  const isDataLoadedUndefined = isUndefined(props.requiredDataLoaded);
  const isDataLoadedError = isError(props.requiredDataLoaded);

  useEffect(() => {
    props.requestVoucherState();
    props.resetFilter();
  }, []);

  useEffect(() => {
    if (isDataLoadedUndefined) {
      props.requestVoucherPage(props.filters);
    }
  }, [props.filters, isDataLoadedUndefined]);

  useEffect(() => {
    if (isDataLoadedError) {
      showToast(I18n.t("bonus.sv.voucherList.error"), "danger");
    }
  }, [isDataLoadedError]);

  const openFiltersModal = () =>
    showAnimatedModal(
      <SvVoucherListFilters onClose={hideModal} onConfirm={hideModal} />,
      BottomTopAnimation
    );

  return (
    <BaseScreenComponent
      goBack={true}
      contextualHelp={emptyContextualHelp}
      headerTitle={I18n.t("bonus.sv.headerTitle")}
      isSearchAvailable={
        isReady(props.possibleVoucherState)
          ? {
              enabled: true,
              onSearchTap: openFiltersModal
            }
          : undefined
      }
    >
      <SafeAreaView style={IOStyles.flex} testID={"VoucherListScreen"}>
        {!isReady(props.possibleVoucherState) ? (
          <LoadingErrorComponent
            isLoading={isLoading(props.possibleVoucherState)}
            loadingCaption={I18n.t("bonus.sv.voucherList.loading")}
            onRetry={props.requestVoucherState}
          />
        ) : (
          <>
            <H1 style={IOStyles.horizontalContentPadding}>
              {I18n.t("bonus.sv.voucherList.title")}
            </H1>
            <View spacer />

            {isReady(props.requiredDataLoaded) && vouchers.length === 0 ? (
              <EmptyVoucherList />
            ) : (
              <FlatList
                style={[IOStyles.horizontalContentPadding]}
                data={vouchers}
                ListFooterComponent={
                  isLoading(props.requiredDataLoaded) && <FooterLoading />
                }
                keyExtractor={v => v.idVoucher.toString()}
                ItemSeparatorComponent={() => (
                  <ItemSeparatorComponent noPadded={true} />
                )}
                onEndReached={() => {
                  if (props.uiParameters.nextPage !== undefined) {
                    props.requestVoucherPage(props.filters);
                  }
                }}
                onEndReachedThreshold={0.5}
                renderItem={v => (
                  <RenderItem
                    idVoucher={v.item.idVoucher}
                    departureDate={v.item.departureDate}
                    destination={v.item.destination}
                  />
                )}
                scrollEnabled={true}
                keyboardShouldPersistTaps={"handled"}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </BaseScreenComponent>
  );
};
const mapDispatchToProps = (dispatch: Dispatch) => ({
  requestVoucherState: () => dispatch(svPossibleVoucherStateGet.request()),
  resetFilter: () => dispatch(svSetFilter({})),
  requestVoucherPage: (filters: FilterState) =>
    dispatch(svVoucherListGet.request(filters)),
  start: () => dispatch(svGenerateVoucherStart())
});
const mapStateToProps = (state: GlobalState) => ({
  indexedVouchers: svVouchersSelector(state),
  filters: svFiltersSelector(state),
  requiredDataLoaded: svRequiredDataLoadedSelector(state),
  uiParameters: svVouchersListUiSelector(state),
  possibleVoucherState: possibleVoucherStateSelector(state)
});

export default connect(mapStateToProps, mapDispatchToProps)(VoucherListScreen);
