import React, { Component } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  LayoutAnimation,
  I18nManager,
  AsyncStorage
} from "react-native";
import PropTypes from "prop-types";
import { Styles, Languages, Color, withTheme, Theme, Config } from "@common";
import { toast, error, Validate } from "@app/Omni";
import Button from "@components/Button";
import WPUserAPI from "@services/WPUserAPI";
import { Spinner, ButtonIndex } from "@components";
import { TextInputMask } from "react-native-masked-text";
import { connect } from "react-redux";
const isDark = Config.Theme.isDark;

class SignUpScreen extends Component {
  constructor(props) {
    super(props);
    let state = {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      useGeneratePass: false,
      isLoading: false,
      isChecked: false,
      mobileNumber: "",
      OTPNumber: "",
      otp: "",
      isOTP: false,
      userId: "",
      fcmToken: ""
    };

    const params = props.params;
    if (params && params.user) {
      state = { ...state, ...params.user, useGeneratePass: true };
    }

    this.state = state;
    this.onMobileEditHandle = mobileNumber => this.setState({ mobileNumber });
    this.onOTPEditHandle = otp => this.setState({ otp });
    this.onFirstNameEditHandle = firstName => this.setState({ firstName });
    this.onLastNameEditHandle = lastName => this.setState({ lastName });
    this.onUsernameEditHandle = username => this.setState({ username });
    this.onEmailEditHandle = email => this.setState({ email });
    this.onPasswordEditHandle = password => this.setState({ password });
    this.onPasswordSwitchHandle = () =>
      this.setState({ useGeneratePass: !this.state.useGeneratePass });
    this.focusLastName = () => this.lastName && this.lastName.focus();
    this.focusUsername = () => this.username && this.username.focus();
    this.focusEmail = () => this.email && this.email.focus();
    this.focusPassword = () =>
      !this.state.useGeneratePass && this.password && this.password.focus();
  }

  // fetch token from Async Storage
  async componentDidMount() {
    let fcm = await AsyncStorage.getItem("fcmtoken");
    this.setState({ fcmToken: fcm });
  }

  static propTypes = {
    navigation: PropTypes.object.isRequired
  };

  shouldComponentUpdate() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    return true;
  }

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
      const customer = await WPUserAPI.getCustomer(userId);
      alert(JSON.stringify(customer));
      if (customer.status == 1) {
        login(customer.user);
      } else {
        toast("Can't register user, please try again.");
      }
    } else {
      this.stopAndToast(Languages.GetOTPError);
    }
  };

  onSignUpHandle = async () => {
    const { login, netInfo } = this.props;
    if (!netInfo.isConnected) return toast(Languages.noConnection);
    const { mobileNumber, fcmToken, isLoading } = this.state;
    if (isLoading) return;
    this.setState({ isLoading: true });
    const _error = this.validateForm();
    if (_error) return this.stopAndToast(_error);
    const json = await WPUserAPI.mobilesignup(mobileNumber, fcmToken);
    alert(JSON.stringify(json));
    if (json === undefined) {
      return this.stopAndToast("Server don't response correctly");
    } else if (json.error) {
      return this.stopAndToast(json.error);
    }
    if (json.status == 1) {
      var otp_number = this.generateRandomNumber(6);
      const result = await WPUserAPI.sendOTP(mobileNumber, otp_number);
      alert(JSON.stringify(result));
      if (result.status == 1) {
        this.setState({
          isLoading: false,
          isOTP: true,
          OTPNumber: otp_number,
          userId: json.userId
        });
      } else {
        return this.stopAndToast("Unable to send OTP Number");
      }
    }
  };

  _onCheck = () => {
    this.setState({ isChecked: !this.state.isChecked });
  };

  validateForm = () => {
    const { mobileNumber } = this.state;
    // check form
    if (Validate.isEmpty(mobileNumber)) {
      return "Please complete the form";
    }
    return undefined;
  };

  stopAndToast = msg => {
    toast(msg);
    error(msg);
    this.setState({ isLoading: false });
  };

  render() {
    const { isLoading, mobileNumber, isOTP, OTPNumber, otp } = this.state;
    const {
      theme: {
        colors: { background, text }
      }
    } = this.props;
    return (
      <ScrollView style={[styles.container, { backgroundColor: background }]}>
        {isOTP ? (
          <View style={styles.formContainer}>
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
          <View style={styles.formContainer}>
            <Text style={[styles.label, { color: text }]}>
              {Languages.EnterMobile}
            </Text>
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
            <Button
              containerStyle={styles.signUpButton}
              text={Languages.signup}
              onPress={this.onSignUpHandle}
            />
          </View>
        )}
        {isLoading ? <Spinner mode="overlay" /> : null}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Color.background
  },
  formContainer: {
    padding: Styles.width * 0.1
  },
  label: {
    fontWeight: "bold",
    fontSize: Styles.FontSize.medium,
    color: Color.blackTextPrimary,
    marginTop: 20
  },
  input: {
    borderBottomWidth: 1,
    borderColor: Color.blackTextDisable,
    height: 40,
    marginTop: 10,
    padding: 0,
    margin: 0,
    textAlign: I18nManager.isRTL ? "right" : "left",
    color: isDark ? Theme.dark.colors.text : Theme.light.colors.text
  },
  signUpButton: {
    marginTop: 20,
    backgroundColor: Color.primary,
    borderRadius: 5,
    elevation: 1
  },
  switchWrap: {
    ...Styles.Common.RowCenterLeft,
    marginTop: 10
  },
  text: {
    marginLeft: 10,
    color: Color.blackTextSecondary
  }
});

const commonInputProps = {
  style: styles.input,
  underlineColorAndroid: "transparent",
  placeholderTextColor: Color.blackTextSecondary
};

const mapStateToProps = state => {
  return {
    netInfo: state.netInfo
  };
};

const mapDispatchToProps = dispatch => {
  const { actions } = require("@redux/UserRedux");
  return {
    login: (user, token) => dispatch(actions.login(user, token))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withTheme(SignUpScreen));
