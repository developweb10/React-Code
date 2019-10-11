import React, { Component } from "react";
import { connect } from "react-redux";
import { Segment, Form, Button, Divider } from "semantic-ui-react";
import { Redirect } from "react-router";
import config from "../../config";
import Axios from "axios";

class EditMyAccount extends Component {
  componentWillMount() {
    this.props.setcurrentPageTitle("My Account - Edit");
    this.props.closeMenu(false);
  }

  handleEdit = async e => {
    const {
      FullName,
      Mobile,
      Email,
      setIsLoading,
      setErrorMsg,
      token,
      setRedirect
    } = this.props;
    setIsLoading(true);
    function isEmpty() {
      var args = arguments;
      for (var i = 0; i < args.length; i++) {
        if (!args[i] || args[i].length < 1) {
          // eslint-disable-next-line
          setIsLoading(false);
          throw { response: { data: "Please fill-in all the fields" } };
        }
      }
    }
    try {
      isEmpty(FullName, Email, Mobile);
      const form = new FormData();
      form.append("name", FullName);
      form.append("email", Email);
      form.append("mobile", Mobile);
      await Axios.post(
        `http://${config.SERVER}:${config.PORT}/api/User/update`,
        form,
        {
          headers: {
            "x-auth-token": token
          }
        }
      ).catch(error => {
        throw error;
      });
    } catch (e) {
      setErrorMsg(e.response.data);
      setTimeout(() => setErrorMsg(false), 7000);
      return;
    }
    setRedirect(true);
    setTimeout(() => setRedirect(false), 1000);
    setIsLoading(false);
  };

  render() {
    const { FullName, Mobile, Email, handleChange, redirect } = this.props;
    return redirect ? (
      <Redirect to="/Regular/MyAccount" />
    ) : (
      <div align="left">
        <Form onSubmit={this.handleEdit}>
          <Form.Input
            transparent
            label="Full Name:"
            placeholder="Full Name.."
            name="FullName"
            value={FullName || ""}
            onChange={handleChange}
          />
          <Divider />
          <Form.Input
            transparent
            label="Mobile:"
            placeholder="+91 1234567899"
            name="Mobile"
            value={Mobile || ""}
            onChange={handleChange}
          />
          <Divider clearing />
          <Form.Input
            transparent
            label="Email:"
            type="email"
            placeholder="Email@mail.com.."
            name="Email"
            value={Email || ""}
            onChange={handleChange}
          />
          <Divider clearing />
          <Segment basic>
            <Button size="huge" fluid color="green" type="submit">
              Save Changes
            </Button>
          </Segment>
        </Form>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    currentPageTitle: state.currentPageTitle,
    isUserConnected: state.isUserConnected,
    FullName: state.FullName,
    Mobile: state.Mobile,
    Email: state.Email,
    token: state.token,
    PassWord: state.PassWord,
    ConfirmPassWord: state.ConfirmPassWord,
    redirect: state.redirect
  };
};

const dispatchActions = dispatch => {
  return {
    setcurrentPageTitle: data => dispatch({ type: "CURRENT_PAGE", data: data }),
    closeMenu: data => dispatch({ type: "MENU_VISIBLE", data: data }),
    handleChange: (e, data) => dispatch({ type: "INPUT_CHANGE", data: data }),
    setRedirect: data => dispatch({ type: "REDIRECT", data: data }),
    setIsLoading: data => dispatch({ type: "SET_LOADING", data: data }),
    setErrorMsg: data => dispatch({ type: "SET_ERROR_MSG", data: data })
  };
};

export default connect(
  mapStateToProps,
  dispatchActions
)(EditMyAccount);
