import React, { Component } from "react";
import { connect } from "react-redux";
import { Segment, Button } from "semantic-ui-react";
import { Link } from "react-router-dom";

export class AirTimePlans extends Component {
  async componentWillMount() {
    this.props.setcurrentPageTitle("Choose Your Airtime Plan");
    this.props.closeMenu(false);
  }

  render() {
    const { setPlanType } = this.props;
    return (
      <Segment basic align="center">
        <h4>
          Earn and redeem airtime by clicking the airtime and watching ads
        </h4>
        <Segment basic>
          <Segment basic onClick={async () => await setPlanType("Airtime")}>
            <div
              style={{
                boxShadow: "rgba(136, 136, 136, 0.8) 3px 4px 11px 1px",
                borderRadius: ".28571429rem",
                backgroundColor: "#FC9B00"
              }}
            >
              <Link to="/Regular/AdsGallery/Videos">
                <Button
                  style={{ paddingRight: "0px", paddingLeft: "0px" }}
                  fluid
                  basic
                  color="black"
                  size="big"
                >
                  <div style={{ width: "50%", display: "inline-block" }}>
                    60 min
                  </div>
                  <div style={{ width: "50%", display: "inline-block" }}>
                    4 Videos
                  </div>
                </Button>
              </Link>
            </div>
          </Segment>
          <Segment basic onClick={async () => await setPlanType("Airtime")}>
            <div
              style={{
                boxShadow: "rgba(136, 136, 136, 0.8) 3px 4px 11px 1px",
                borderRadius: ".28571429rem",
                backgroundColor: "#FC9B00"
              }}
            >
              <Link to="/Regular/AdsGallery/Banners">
                <Button
                  style={{ paddingRight: "2px", paddingLeft: "0px" }}
                  fluid
                  basic
                  color="black"
                  size="big"
                >
                  <div
                    style={{
                      width: "50%",
                      display: "inline-block"
                    }}
                  >
                    20 min
                  </div>
                  <div style={{ width: "50%", display: "inline-block" }}>
                    10 Banner Ads
                  </div>
                </Button>
              </Link>
            </div>
          </Segment>
          <Segment basic onClick={async () => await setPlanType("Airtime")}>
            <div
              style={{
                boxShadow: "rgba(136, 136, 136, 0.8) 3px 4px 11px 1px",
                borderRadius: ".28571429rem",
                backgroundColor: "#FC9B00"
              }}
            >
              <Link to="/Regular/AdsGallery/TextAds">
                <Button
                  style={{ paddingRight: "0px", paddingLeft: "0px" }}
                  fluid
                  basic
                  color="black"
                  size="big"
                >
                  <div style={{ width: "50%", display: "inline-block" }}>
                    10 min
                  </div>
                  <div style={{ width: "50%", display: "inline-block" }}>
                    20 Text Ads
                  </div>
                </Button>
              </Link>
            </div>
          </Segment>
        </Segment>
      </Segment>
    );
  }
}

const mapStateToProps = state => {
  return {
    currentPageTitle: state.currentPageTitle,
    token: state.token
  };
};

const mapDispatchToProps = dispatch => {
  return {
    setcurrentPageTitle: data => dispatch({ type: "CURRENT_PAGE", data: data }),
    closeMenu: data => dispatch({ type: "MENU_VISIBLE", data: data }),
    setPlanType: data => dispatch({ type: "SET_PLAN_TYPE", data: data })
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AirTimePlans);
