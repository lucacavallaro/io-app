import * as React from "react";
import { useContext, useEffect } from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { ActivityIndicator, FlatList, SafeAreaView } from "react-native";
import BaseScreenComponent from "../../../../components/screens/BaseScreenComponent";
import { emptyContextualHelp } from "../../../../utils/emptyContextualHelp";
import { IOStyles } from "../../../../components/core/variables/IOStyles";
import { H1 } from "../../../../components/core/typography/H1";
import { GlobalState } from "../../../../store/reducers/types";
import I18n from "../../../../i18n";
import {
  BottomTopAnimation,
  LightModalContext
} from "../../../../components/ui/LightModal";
import SvVoucherListFilters from "../components/SvVoucherListFilters";
import {
  svPossibleVoucherStateGet,
  svResetFilter,
  svVoucherListGet
} from "../store/actions/voucherList";
import ListItemComponent from "../../../../components/screens/ListItemComponent";
import ItemSeparatorComponent from "../../../../components/ItemSeparatorComponent";
import { svVouchersSelector } from "../store/reducers/voucherList/vouchers";
import { toArray } from "../../../../store/helpers/indexer";
import { formatDateAsLocal } from "../../../../utils/dates";
import { View } from "native-base";
import {
  FilterState,
  svFiltersSelector
} from "../store/reducers/voucherList/filters";
import { VoucherPreview } from "../types/SvVoucherResponse";
import {
  svRequiredDataLoadedSelector,
  svVouchersListUiSelector
} from "../store/reducers/voucherList/ui";
import { isLoading, isReady } from "../../bpd/model/RemoteValue";
import { svGenerateVoucherStart } from "../store/actions/voucherGeneration";
import { useIODispatch } from "../../../../store/hooks";
import { confirmButtonProps } from "../../bonusVacanze/components/buttons/ButtonConfigurations";
import FooterWithButtons from "../../../../components/ui/FooterWithButtons";
import { renderInfoRasterImage } from "../../../../components/infoScreen/imageRendering";
import image from "../../../../../img/messages/empty-message-list-icon.png";
import { InfoScreenComponent } from "../../../../components/infoScreen/InfoScreenComponent";

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
        image={renderInfoRasterImage(image)}
        title={I18n.t("bonus.cgn.activation.ineligible.title")}
        body={I18n.t("bonus.cgn.activation.ineligible.body")}
      />
      <FooterWithButtons
        type={"SingleButton"}
        leftButton={confirmButtonProps(
          () => dispatch(svGenerateVoucherStart()),
          "Genera un nuovo codice"
        )}
      />
    </>
  );
};

const VoucherListScreen = (props: Props): React.ReactElement => {
  const { showAnimatedModal, hideModal } = useContext(LightModalContext);

  const vouchers = toArray(props.indexedVouchers);

  useEffect(() => {
    props.requestVoucherState();
    props.resetFilter();
  }, []);

  useEffect(() => {
    props.requestVoucherPage(props.filters);
  }, [props.filters]);

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
      isSearchAvailable={{ enabled: true, onSearchTap: openFiltersModal }}
    >
      <SafeAreaView style={IOStyles.flex} testID={"VoucherListScreen"}>
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
      </SafeAreaView>
    </BaseScreenComponent>
  );
};
const mapDispatchToProps = (dispatch: Dispatch) => ({
  requestVoucherState: () => dispatch(svPossibleVoucherStateGet.request()),
  resetFilter: () => dispatch(svResetFilter({})),
  requestVoucherPage: (filters: FilterState) =>
    dispatch(svVoucherListGet.request(filters)),
  start: () => dispatch(svGenerateVoucherStart())
});
const mapStateToProps = (state: GlobalState) => ({
  indexedVouchers: svVouchersSelector(state),
  filters: svFiltersSelector(state),
  requiredDataLoaded: svRequiredDataLoadedSelector(state),
  uiParameters: svVouchersListUiSelector(state)
});

export default connect(mapStateToProps, mapDispatchToProps)(VoucherListScreen);
