import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import {
  View,
  ScrollView,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  AsyncStorage
} from "react-native";
import { NavigationActions } from "react-navigation";
import { connect } from "react-redux";
import { Icons, Languages, Styles, Config, withTheme, Theme } from "@common";
import { Icon, toast, FacebookAPI } from "@app/Omni";
import { Spinner, ButtonIndex } from "@components";
import { WooWorker } from "api-ecommerce";
import WPUserAPI from "@services/WPUserAPI";
import styles from "./styles";
import { TextInputMask } from "react-native-masked-text";

const isDark = Config.Theme.isDark;

class LoginScreen extends PureComponent {
  static propTypes = {
    user: PropTypes.object,
    isLogout: PropTypes.bool,
    onViewCartScreen: PropTypes.func,
    onViewHomeScreen: PropTypes.func,
    onViewSignUp: PropTypes.func,
    logout: PropTypes.func,
    navigation: PropTypes.object,
    onBack: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      username: "",
      password: "",
      isLoading: false,
      logInFB: false,
      isOTP: false,
      mobileNumber: "",
      otp: "",
      OTPNumber: "",
      userData: {},
      userId: "",
      fcmToken: ""
    };

    this.onMobileEditHandle = mobileNumber => this.setState({ mobileNumber });
    this.onUsernameEditHandle = username => this.setState({ username });
    this.onPasswordEditHandle = password => this.setState({ password });
    this.onOTPEditHandle = otp => this.setState({ otp });
    this.focusPassword = () => this.password && this.password.focus();
  }

  async componentDidMount() {
    AsyncStorage.setItem("userid", this.state.userId);
    const { user, isLogout } = this.props;
    let fcm = await AsyncStorage.getItem("fcmtoken");
    this.setState({ fcmToken: fcm });
    // check case after logout
    if (user && isLogout) {
      this._handleLogout();
    }
  }

  // handle the logout screen and navigate to cart page if the new user login object exist
  componentWillReceiveProps(nextProps) {
    const { onViewCartScreen, user: oldUser, onViewHomeScreen } = this.props;
    const { user } = nextProps.user;
    const { params } = nextProps.navigation.state;
    // check case after logout
    if (user) {
      if (nextProps.isLogout) {
        this._handleLogout();
      } else if (!oldUser.user) {
        // check case after login
        this.setState({ isLoading: false });
        if (params && typeof params.onCart !== "undefined") {
          onViewCartScreen();
        } else {
          onViewHomeScreen();
        }
        this.props.initAddresses(user);
      }
    }
  }

  _handleLogout = () => {
    const { logout, onViewHomeScreen } = this.props;
    logout();
    if (this.state.logInFB) {
      if (FacebookAPI.getAccessToken()) {
        FacebookAPI.logout();
      }
    }
    onViewHomeScreen();
  };

  _onBack = () => {
    const { onBack, goBack } = this.props;
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  generateRandomNumber(length) {
    var text = "";
    var possible = "123456789";
    for (var i = 0; i < length; i++) {
      var sup = Math.floor(Math.random() * possible.length);
      text += i > 0 && sup == i ? "0" : possible.charAt(sup);
    }
    return Number(text);
  }

  onOTPPressHandle = async () => {
    const { otp, OTPNumber, userId } = this.state;
    this.setState({ isLoading: true });
    if (otp == OTPNumber) {
      const { login, netInfo } = this.props;
      if (!netInfo.isConnected) {
        return toast(Languages.noConnection);
      }
      this.setState({ isLoading: true });
      const customer = await WPUserAPI.getCustomer(userId);
      if (customer.status == 1) {
        login(customer.user);
      } else {
        toast("Can't login, please try again.");
      }
    } else {
      this.stopAndToast(Languages.GetOTPError);
    }
  };

  onLoginPressHandle = async () => {
    const { netInfo } = this.props;
    if (!netInfo.isConnected) {
      return toast(Languages.noConnection);
    }
    const { mobileNumber, fcmToken, isLoading } = this.state;
    if (isLoading) return;
    const userlogin = mobileNumber.substr(1);
    this.setState({ isLoading: true });
    const json = await WPUserAPI.mobilelogin(userlogin, fcmToken);
    if (json === undefined) {
      return this.stopAndToast("Server don't response correctly");
    } else if (json.error) {
      return this.stopAndToast(json.error);
    }
    if (json.status == 1) {
      var otp_number = this.generateRandomNumber(6);
      const result = await WPUserAPI.sendOTP(mobileNumber, otp_number);
      if (result.status == 1) {
        this.setState({
          isLoading: false,
          isOTP: true,
          OTPNumber: otp_number,
          userId: json.user.userId
        });
      } else {
        return this.stopAndToast("Unable to send OTP Number");
      }
    }
    if (json.status == 0) {
      return this.stopAndToast(json.message);
    }
  };

  onFBLoginPressHandle = () => {
    const { login } = this.props;
    this.setState({ isLoading: true });
    FacebookAPI.login()
      .then(async token => {
        if (token) {
          const json = await WPUserAPI.loginFacebook(token);
          if (json === undefined) {
            this.stopAndToast(Languages.GetDataError);
          } else if (json.error) {
            this.stopAndToast(json.error);
          } else {
            let customers = await WooWorker.getCustomerById(json.wp_user_id);
            customers = { ...customers, token, picture: json.user.picture };
            this._onBack();
            this.setState({ isLoading: false }, () => {
              login(customers, json.cookie);
            });
          }
        }
      })
      .catch(err => {
        console.log(err);
        this.setState({ isLoading: false });
      });
  };

  onSignUpHandle = () => {
    this.props.onViewSignUp();
  };

  checkConnection = () => {
    const { netInfo } = this.props;
    if (!netInfo.isConnected) toast(Languages.noConnection);
    return netInfo.isConnected;
  };

  stopAndToast = msg => {
    toast(msg);
    this.setState({ isLoading: false });
  };

  render() {
    const { mobileNumber, isLoading, isOTP, otp } = this.state;
    const {
      theme: {
        colors: { background, text }
      }
    } = this.props;
    return (
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={styles.container}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.logoWrap}>
            <Image
              source={Config.LogoWithText}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {isOTP ? (
            <View style={styles.subContain}>
              <View style={styles.loginForm}>
                <Text style={styles.separatorText}>{Languages.OTPDisplay}</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    {...commonInputProps}
                    ref={comp => (this.otp = comp)}
                    placeholder={Languages.OTP}
                    onChangeText={this.onOTPEditHandle}
                    returnKeyType="next"
                    value={otp}
                    keyboardType="numeric"
                  />
                </View>
                <ButtonIndex
                  text={Languages.SubmitOtp.toUpperCase()}
                  containerStyle={styles.loginButton}
                  textStyle={styles.textLogin}
                  onPress={this.onOTPPressHandle}
                  textColor={text}
                />
              </View>
            </View>
          ) : (
            <View style={styles.subContain}>
              <View style={styles.loginForm}>
                <View style={styles.inputWrap}>
                  <Icon
                    name={Icons.MaterialCommunityIcons.Mobile}
                    size={Styles.IconSize.TextInput}
                    color={text}
                  />
                  <TextInputMask
                    {...commonInputProps}
                    ref={comp => (this.mobileNumber = comp)}
                    value={mobileNumber}
                    onChangeText={this.onMobileEditHandle}
                    type={"cel-phone"}
                    options={{
                      maskType: "INTERNATIONAL"
                    }}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
                <ButtonIndex
                  text={Languages.Login.toUpperCase()}
                  containerStyle={styles.loginButton}
                  textStyle={styles.textLogin}
                  onPress={this.onLoginPressHandle}
                  textColor={text}
                />
              </View>
              <TouchableOpacity
                style={Styles.Common.ColumnCenter}
                onPress={this.onSignUpHandle}
              >
                <Text style={[styles.signUp, { color: text }]}>
                  {Languages.DontHaveAccount}{" "}
                  <Text style={styles.highlight}>{Languages.signup}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
        {isLoading ? <Spinner mode="overlay" /> : null}
      </ScrollView>
    );
  }
}

const commonInputProps = {
  style: styles.input,
  underlineColorAndroid: "transparent",
  placeholderTextColor: isDark
    ? Theme.dark.colors.text
    : Theme.light.colors.text
};

LoginScreen.propTypes = {
  netInfo: PropTypes.object,
  login: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired
};

const mapStateToProps = ({ netInfo, user }) => ({ netInfo, user });

const mapDispatchToProps = dispatch => {
  const { actions } = require("@redux/UserRedux");
  const AddressRedux = require("@redux/AddressRedux");
  return {
    login: (user, token) => dispatch(actions.login(user, token)),
    logout: () => dispatch(actions.logout()),
    initAddresses: customerInfo => {
      AddressRedux.actions.initAddresses(dispatch, customerInfo);
    }
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withTheme(LoginScreen));
