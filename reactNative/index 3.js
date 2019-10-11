import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import {
  Text,
  TouchableOpacity,
  ScrollView,
  View,
  Animated,
  Image,
  Share,
  TextInput,
  Keyboard,
  AsyncStorage
} from "react-native";
import { connect } from "react-redux";
import { Timer, getProductImage, currencyFormatter, toast } from "@app/Omni";
import {
  Button,
  AdMob,
  WebView,
  ProductRelated,
  VendorInfo,
  ButtonIndex,
  Spinner
} from "@components";
import Swiper from "react-native-swiper";
import {
  Styles,
  Languages,
  Color,
  Config,
  Constants,
  Events,
  withTheme,
  Images,
  AppConfig
} from "@common";
import Modal from "react-native-modalbox";
import { find, filter } from "lodash";
import * as Animatable from "react-native-animatable";
import { AnimatedHeader } from "@components";
import styles from "./ProductDetail_Style";
import WPUserAPI from "@services/WPUserAPI";

const PRODUCT_IMAGE_HEIGHT = 300;
const NAVI_HEIGHT = 64;

@withTheme
class Detail extends PureComponent {
  static propTypes = {
    product: PropTypes.any,
    getProductVariations: PropTypes.func,
    productVariations: PropTypes.any,
    onViewCart: PropTypes.func,
    addCartItem: PropTypes.func,
    removeWishListItem: PropTypes.func,
    addWishListItem: PropTypes.func,
    cartItems: PropTypes.any,
    navigation: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      scrollY: new Animated.Value(0),
      tabIndex: 0,
      selectedAttribute: [],
      selectedColor: 0,
      selectVariation: null,
      sellerMsg: "",
      productAuthor: {},
      isLoading: false,
      isModal: false,
      configData: ""
    };
    this.productInfoHeight = PRODUCT_IMAGE_HEIGHT;
    this.inCartTotal = 0;
    this.isInWishList = false;
    this.onMessageEditHandle = sellerMsg => this.setState({ sellerMsg });
  }

  componentDidMount() {
    this.getCartTotal(this.props);
    this.getWishList(this.props);
    this.getProductAttribute(this.props.product);
    if (
      typeof this.props.product.store != "undefined" &&
      !AppConfig.WooCommerce.useWCV
    ) {
      this.props.fetchVendor(this.props.product.store.id);
    }
    this.getProductAuthor();
  }

  getProductAuthor = async () => {
    const getSeller = await WPUserAPI.getProductAuthor(this.props.product.id);
    if (getSeller.status == 1) {
      const getProductAuthor = getSeller.data.userData;
      this.setState({ productAuthor: getProductAuthor });
      AsyncStorage.setItem("productAuthor", JSON.stringify(getProductAuthor));
      AsyncStorage.setItem("productid", JSON.stringify(this.props.product.id));
    }
  };

  componentWillReceiveProps(nextProps) {
    this.getCartTotal(nextProps, true);
    this.getWishList(nextProps, true);
    // it's important to update the variations from the product as the Life cycle will not run again !!!
    if (this.props.product.id != nextProps.product.id) {
      this.props.getProductVariations(nextProps.product);
      this.getProductAttribute(nextProps.product);
      this.forceUpdate();
    }
    if (this.props.productVariations !== nextProps.productVariations) {
      this.updateSelectedVariant(nextProps.productVariations);
    }
  }

  getProductAttribute = product => {
    this.productAttributes = product.attributes;
    const defaultAttribute = product.default_attributes;
    if (typeof this.productAttributes !== "undefined") {
      this.productAttributes.map(attribute => {
        const selectedAttribute = defaultAttribute.find(
          item => item.name === attribute.name
        );
        attribute.selectedOption =
          typeof selectedAttribute !== "undefined"
            ? selectedAttribute.option.toLowerCase()
            : "";
      });
    }
  };

  closePhoto = () => {
    this._modalPhoto.close();
  };

  openPhoto = () => {
    this._modalPhoto.open();
  };

  closeSellerMessage = () => {
    this.setState({ isModal: false });
    this.setState({ sellerMsg: "" });
    this.setState({ isLoading: false });
  };

  sendSellerMessage = async () => {
    this.setState({ isLoading: true });
    if (this.state.sellerMsg != "") {
      const data = {};
      data["message"] = this.state.sellerMsg;
      data["send_to"] = this.state.productAuthor.user_login;
      data["send_from"] = this.props.userData.user_login;
      if (data["send_to"] == "admin") {
        this.setState({ isLoading: false });
        this.setState({ isModal: false });
        this.setState({ sellerMsg: "" });
        toast("Unable to Contact Buyer");
        this.setState({ isLoading: false });
      }
      Keyboard.dismiss();
      const sendMessage = await WPUserAPI.sendMessageToSeller(data);
      this.setState({ isLoading: false });
      if (sendMessage.status == 1) {
        this.setState({ isModal: false });
        this.setState({ sellerMsg: "" });
        this.setState({ isLoading: false });
        toast("Message Send Successfully");
      }
    } else {
      this.setState({ isLoading: false });
      toast("Enter a Message");
    }
  };

  openSellerMessage = () => {
    this.setState({ isLoading: true });
    const { userData, onLogin } = this.props;
    if (userData) {
      this.setState({ isModal: true });
      this.setState({ isLoading: false });
    } else {
      onLogin();
      this.setState({ isLoading: false });
    }
  };

  handleClickTab(tabIndex) {
    this.setState({ tabIndex });
    Timer.setTimeout(() => this.state.scrollY.setValue(0), 50);
  }

  getColor = value => {
    const color = value.toLowerCase();
    if (typeof Color.attributes[color] !== "undefined") {
      return Color.attributes[color];
    }
    return "#333";
  };

  share = () => {
    Share.share({
      message: this.props.product.description.replace(/(<([^>]+)>)/gi, ""),
      url: this.props.product.permalink,
      title: this.props.product.name
    });
  };

  addToCart = (go = false) => {
    const { addCartItem, product, onViewCart } = this.props;
    if (this.inCartTotal < Constants.LimitAddToCart) {
      addCartItem(product, this.state.selectVariation);
    } else {
      alert(Languages.ProductLimitWaring);
    }
    if (go) onViewCart();
  };

  addToWishList = isAddWishList => {
    if (isAddWishList) {
      this.props.removeWishListItem(this.props.product);
    } else this.props.addWishListItem(this.props.product);
  };

  getCartTotal = (props, check = false) => {
    const { cartItems } = props;
    if (cartItems != null) {
      if (check === true && props.cartItems === this.props.cartItems) {
        return;
      }
      this.inCartTotal = cartItems.reduce((accumulator, currentValue) => {
        if (currentValue.product.id == this.props.product.id) {
          return accumulator + currentValue.quantity;
        }
        return 0;
      }, 0);
      const sum = cartItems.reduce(
        (accumulator, currentValue) => accumulator + currentValue.quantity,
        0
      );
      const params = this.props.navigation.state.params;
      params.cartTotal = sum;
      this.props.navigation.setParams(params);
    }
  };

  getWishList = (props, check = false) => {
    const { product, navigation, wishListItems } = props;
    if (props.hasOwnProperty("wishListItems")) {
      if (check == true && props.wishListItems == this.props.wishListItems) {
        return;
      }
      this.isInWishList =
        find(props.wishListItems, item => item.product.id == product.id) !=
        "undefined";
      const sum = wishListItems.length;
      const params = navigation.state.params;
      params.wistListTotal = sum;
      this.props.navigation.setParams(params);
    }
  };

  onSelectAttribute = (attributeName, option) => {
    const selectedAttribute = this.productAttributes.find(
      item => item.name === attributeName
    );
    selectedAttribute.selectedOption = option.toLowerCase();
    this.updateSelectedVariant(this.props.productVariations);
  };

  updateSelectedVariant = productVariations => {
    const selectedAttribute = filter(
      this.productAttributes,
      item => typeof item.selectedOption !== "undefined"
    );
    productVariations &&
      productVariations.map(variant => {
        let matchCount = 0;
        selectedAttribute.map(selectAttribute => {
          const isMatch = find(
            variant.attributes,
            item =>
              item.name === selectAttribute.name &&
              item.option.toLowerCase() ===
                selectAttribute.selectedOption.toLowerCase()
          );
          if (isMatch !== undefined) {
            matchCount += 1;
          }
        });
        if (matchCount === selectedAttribute.length) {
          this.setState({ selectVariation: variant });
        }
      });
    this.forceUpdate();
  };

  /**
   * render Image top
   */
  _renderImages = () => {
    const imageScale = this.state.scrollY.interpolate({
      inputRange: [-300, 0, NAVI_HEIGHT, this.productInfoHeight / 2],
      outputRange: [2, 1, 1, 0.7],
      extrapolate: "clamp"
    });
    return (
      <ScrollView
        style={{ height: PRODUCT_IMAGE_HEIGHT, width: Constants.Window.width }}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        horizontal
      >
        {this.props.product.images.map((image, index) => (
          <TouchableOpacity
            activeOpacity={1}
            key={`image${index}`}
            onPress={this.openPhoto.bind(this)}
          >
            <Animated.Image
              source={{ uri: getProductImage(image.src) }}
              style={[
                styles.imageProduct,
                { transform: [{ scale: imageScale }] }
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  /**
   * Render tabview detail
   */
  _renderTabView = () => {
    const {
      theme: {
        colors: { background, text, lineColor }
      }
    } = this.props;
    const isShowVendor = Config.Categories.showVendorTab;
    return (
      <View style={[styles.tabView, { backgroundColor: background }]}>
        <View
          style={[
            styles.tabButton,
            { backgroundColor: lineColor },
            { borderTopColor: lineColor },
            { borderBottomColor: lineColor },
            Constants.RTL && { flexDirection: "row-reverse" }
          ]}
        >
          <View style={[styles.tabItem, { backgroundColor: lineColor }]}>
            <Button
              type="tab"
              textStyle={[styles.textTab, { color: text }]}
              selectedStyle={{ color: text }}
              text={Languages.AdditionalInformation}
              onPress={() => this.handleClickTab(0)}
              selected={this.state.tabIndex == 0}
            />
          </View>
          {isShowVendor && (
            <View style={[styles.tabItem, { backgroundColor: lineColor }]}>
              <Button
                type="tab"
                textStyle={[styles.textTab, { color: text }]}
                selectedStyle={{ color: text }}
                text={Languages.vendorTitle}
                onPress={() => this.handleClickTab(1)}
                selected={this.state.tabIndex == 1}
              />
            </View>
          )}
        </View>
        {this.state.tabIndex === 0 && (
          <View style={[styles.description, { backgroundColor: lineColor }]}>
            <WebView
              textColor={text}
              html={`<p>${this.props.product.description}</p>`}
            />
          </View>
        )}
        {this.state.tabIndex === 1 && (
          <VendorInfo
            vendor={this.props.product.store}
            viewVendor={() => this._viewVendor(this.props.product)}
          />
        )}
      </View>
    );
  };

  _writeReview = () => {
    const { product, userData, onLogin } = this.props;
    if (userData) {
      Events.openModalReview(product);
    } else {
      onLogin();
    }
  };

  _writeSeller = () => {
    const { product, userData, onLogin } = this.props;
    if (userData) {
      Events.openModalSeller(product);
    } else {
      onLogin();
    }
  };

  _viewVendor = product => {
    const store = product.store;
    this.props.onViewVendor(store);
  };

  getShopName = () => {
    const { product } = this.props;
    let shopName = "";
    if (
      typeof product.store !== "undefined" &&
      typeof product.store.shop_name !== "undefined" &&
      product.store.shop_name != ""
    ) {
      shopName = product.store.shop_name;
    } else if (
      typeof product.store.pv_shop_name !== "undefined" &&
      product.store.pv_shop_name != ""
    ) {
      shopName = product.store.pv_shop_name;
    } else {
      shopName = product.store.store_name;
    }
    return shopName != "" && typeof shopName !== "undefined"
      ? shopName.toUpperCase()
      : shopName;
  };

  render() {
    const { selectVariation, sellerMsg } = this.state;
    const {
      onViewProductScreen,
      product,
      onChat,
      navigation,
      theme: {
        colors: { background, text, link }
      }
    } = this.props;
    const { isLoading, isModal } = this.state;
    const productRegularPrice = currencyFormatter(
      selectVariation ? selectVariation.regular_price : product.regular_price
    );
    const isOnSale = selectVariation
      ? selectVariation.on_sale
      : product.on_sale;
    const renderButtons = () => (
      <View style={styles.sellerView}>
        <TouchableOpacity
          style={styles.chatButtons}
          onPress={this.openSellerMessage.bind(this)}
        >
          <Text style={styles.sellerText}>{Languages.SMSTOSeller}</Text>
        </TouchableOpacity>
        {this.props.userData != null &&
        this.state.productAuthor.ID == this.props.userData.ID ? (
          <TouchableOpacity
            style={styles.chatButtons}
            onPress={() => this.props.navigation.navigate("ChatList")}
          >
            <Text style={styles.sellerText}>{Languages.viewChat} </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.chatButtons} onPress={() => onChat()}>
            <Text style={styles.sellerText}>{Languages.chatWithUs}</Text>
          </TouchableOpacity>
        )}
      </View>
    );

    const renderTitle = () => (
      <View style={{ justifyContent: "center", marginTop: 6, marginBottom: 8 }}>
        <Text style={[styles.productName, { color: text }]}>
          {product.name}
        </Text>
        {typeof product.store !== "undefined" && (
          <TouchableOpacity onPress={() => this._viewVendor(product)}>
            <Text
              style={[styles.productName, styles.vendorName, { color: link }]}
            >
              {this.getShopName()}
            </Text>
          </TouchableOpacity>
        )}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 2,
            marginBottom: 4
          }}
        >
          <Animatable.Text
            animation="fadeInDown"
            style={[styles.productPrice, { color: text }]}
          >
            {productPrice}
          </Animatable.Text>
          {isOnSale && (
            <Animatable.Text
              animation="fadeInDown"
              style={[styles.sale_price, { color: text }]}
            >
              {productRegularPrice}
            </Animatable.Text>
          )}
        </View>
      </View>
    );

    const renderAttributes = () => (
      <View style={{ flexDirection: "row" }}>
        <View style={{ marginRight: 10 }}>
          {typeof this.productAttributes !== "undefined" &&
            this.productAttributes.map((attribute, attrIndex) => (
              <Text style={{ margin: 2 }}>{attribute.name.toUpperCase()}</Text>
            ))}
        </View>
        <View style={{ marginLeft: 10 }}>
          {typeof this.productAttributes !== "undefined" &&
            this.productAttributes.map((attribute, attrIndex) => (
              <View style={{ flexDirection: "row" }}>
                {attribute.name !== "undefined" &&
                  attribute.options.map((option, index) => (
                    <Text style={{ margin: 2 }}>{option}</Text>
                  ))}
              </View>
            ))}
        </View>
      </View>
    );

    const renderProductRelated = () => (
      <ProductRelated
        onViewProductScreen={product => {
          this.list.getNode().scrollTo({ x: 0, y: 0, animated: true });
          onViewProductScreen(product);
        }}
        product={product}
      />
    );

    const renderChatBtn = () => {
      <Button
        text="chat"
        type="image"
        source={Images.icons.iconMessage}
        imageStyle={styles.imageButtonChat}
        buttonStyle={styles.buttonChat}
        onPress={() => onChat(product.store)}
      />;
    };

    return (
      <View style={[styles.container, { backgroundColor: background }]}>
        {isModal ? (
          <View style={[styles.container, { backgroundColor: background }]}>
            <View style={styles.inputWrap}>
              <Text style={styles.messageheading}>
                {Languages.messageToSeller}
              </Text>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.descinput}
                underlineColorAndroid="transparent"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                placeholderTextColor="#707070"
                placeholder={Languages.typeAmessage}
                multiline
                value={sellerMsg}
                onChangeText={this.onMessageEditHandle}
              />
            </View>
            <ButtonIndex
              text={Languages.sendMessage}
              style={styles.button}
              containerStyle={styles.sendButton}
              textStyle={styles.textLogin}
              onPress={this.sendSellerMessage.bind(this)}
            />
            <TouchableOpacity
              style={styles.iconZoom}
              onPress={this.closeSellerMessage.bind(this)}
            >
              <Text style={styles.textClose}>{Languages.close}</Text>
            </TouchableOpacity>
            {isLoading ? <Spinner mode="overlay" /> : null}
          </View>
        ) : (
          <View style={[styles.container, { backgroundColor: background }]}>
            <AnimatedHeader navigation={navigation} />
            <Animated.ScrollView
              ref={c => (this.list = c)}
              style={styles.listContainer}
              scrollEventThrottle={1}
              onScroll={event => {
                this.state.scrollY.setValue(event.nativeEvent.contentOffset.y);
              }}
            >
              <View
                style={[styles.productInfo, { backgroundColor: background }]}
                onLayout={event =>
                  (this.productInfoHeight = event.nativeEvent.layout.height)
                }
              >
                {this._renderImages()}
                {renderAttributes()}
                {renderTitle()}
                <WebView
                  textColor={text}
                  html={`<p>${product.short_description}</p>`}
                />
              </View>
              {this._renderTabView()}
              {renderProductRelated()}
            </Animated.ScrollView>
            {Config.showAdmobAds && <AdMob />}
            {renderButtons()}
            {renderChatBtn()}
            <Modal
              ref={com => (this._modalPhoto = com)}
              swipeToClose={false}
              animationDuration={200}
              style={styles.modalBoxWrap}
            >
              <Swiper
                height={Constants.Window.height - 40}
                activeDotStyle={styles.dotActive}
                dotStyle={styles.dot}
                paginationStyle={{ zIndex: 9999, bottom: -15 }}
              >
                {product.images.map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: getProductImage(image.src, Styles.width) }}
                    style={styles.imageProductFull}
                  />
                ))}
              </Swiper>
              <TouchableOpacity
                style={styles.iconZoom}
                onPress={this.closePhoto.bind(this)}
              >
                <Text style={styles.textClose}>{Languages.close}</Text>
              </TouchableOpacity>
            </Modal>
            {isLoading ? <Spinner mode="overlay" /> : null}
          </View>
        )}
      </View>
    );
  }
}

const mapStateToProps = state => {
  return {
    cartItems: state.carts.cartItems,
    wishListItems: state.wishList.wishListItems,
    productVariations: state.products.productVariations,
    userData: state.user.user
  };
};

function mergeProps(stateProps, dispatchProps, ownProps) {
  const { dispatch } = dispatchProps;
  const CartRedux = require("@redux/CartRedux");
  const WishListRedux = require("@redux/WishListRedux");
  const ProductRedux = require("@redux/ProductRedux");
  const Vendor = require("@redux/VendorRedux");
  return {
    ...ownProps,
    ...stateProps,
    addCartItem: (product, variation) => {
      CartRedux.actions.addCartItem(dispatch, product, variation);
    },
    addWishListItem: product => {
      WishListRedux.actions.addWishListItem(dispatch, product);
    },
    removeWishListItem: product => {
      WishListRedux.actions.removeWishListItem(dispatch, product);
    },
    getProductVariations: product => {
      ProductRedux.actions.getProductVariations(dispatch, product);
    },
    fetchVendor: vendorId => {
      return Vendor.actions.fetchVendor(dispatch, vendorId);
    }
  };
}

export default connect(
  mapStateToProps,
  undefined,
  mergeProps
)(Detail);
