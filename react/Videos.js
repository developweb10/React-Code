import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import {
  Image,
  Progress,
  Segment,
  Dimmer,
  Header,
  Button
} from "semantic-ui-react";
import { Player, ControlBar } from "video-react";
import "video-react/dist/video-react.css";
import Axios from "axios";
import config from "../../../config";
import "../../../style.css";

const ShowPlayer = props => (
  <div>
    <p>You must watch until the end of video to get profit</p>
    {/* TODO check if not working? then redirect */}
    <Player autoPlay id="videoP">
      <source
        src={`http://${config.SERVER}:${config.PORT}/api/stream/video/${props
          .videoList[props.index].id +
          "." +
          props.videoList[props.index].fileType}`}
      />
      <ControlBar
        autoHide={true}
        disableCompletely={true}
        disableDefaultControls={true}
        className="my-class"
      />
    </Player>
  </div>
);

class AdsGalleryVideos extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentVideoId: "",
      userHistories: []
    };
  }

  async componentWillMount() {
    const {
      setIsLoading,
      setErrorMsg,
      setcurrentPageTitle,
      closeMenu,
      token,
      setVideoList
    } = this.props;
    setcurrentPageTitle("Click on Video to Watch");
    closeMenu(false);
    let texts = null;
    let login = JSON.parse(localStorage.getItem("login"));
    let userId = login.userId;
    try {
      texts = await Axios.get(
        `http://${config.SERVER}:${config.PORT}/api/history/watchedMedia/${userId}`,
        {
          headers: {
            "x-auth-token": token
          }
        }
      ).catch(error => {
        throw error;
      });
      texts = texts.data;
      this.setState({ userHistories: texts });
    } catch (e) {}
    let videos = null;
    setIsLoading(true);
    try {
      videos = await Axios.get(
        `http://${config.SERVER}:${config.PORT}/api/campagin/byType/video`,
        {
          headers: {
            "x-auth-token": token
          }
        }
      ).catch(error => {
        throw error;
      });
      videos = videos.data;
    } catch (e) {
      setErrorMsg(e.response.data);
      setTimeout(() => setErrorMsg(false), 7000);
      setIsLoading(false);
      return;
    }
    console.log("this.state.userHistories", this.state.userHistories);
    // Check if video is already watched
    videos = videos.map(v => {
      let isWatched = false;
      for (let index = 0; index < this.state.userHistories.length; index++) {
        const element = this.state.userHistories[index];
        if (element.campaignId === v._id) {
          isWatched = true;
          break;
        }
      }
      return {
        id: v._id,
        coverfileType: v.coverfileType,
        fileType: v.fileType,
        isWatched: isWatched
      };
    });
    //check for Unwatched Videos(i.e atleast one Video should be Unwatched) & set VideosList accordingly
    console.log(
      "videos.filter(item => !item.isWatched)",
      videos.filter(item => !item.isWatched)
    );
    console.log(
      "videos.filter(item => !item.isWatched).length",
      videos.filter(item => !item.isWatched).length
    );
    console.log("videos", videos);
    console.log(
      "videos.filter(v => v.isWatched)",
      videos.filter(v => v.isWatched)
    );
    videos.filter(item => !item.isWatched).length === 0
      ? setVideoList(false)
      : setVideoList(videos);
    setIsLoading(false);
  }

  componentDidUpdate() {
    if (this.props.isPlayerShow) {
      const video = document.querySelector("video");
      video.addEventListener("ended", this.videoEnded);
    }
  }

  videoEnded = async e => {
    this.props.setIsWatched(this.props.isPlayerShow);
    this.props.setIsPlayerShow(false);
    let login = JSON.parse(localStorage.getItem("login"));
    let userId = login.userId;
    let campId = this.state.currentVideoId;
    try {
      const { token, planType } = this.props;
      const form1 = new FormData();
      form1.append("campaignId", campId);
      form1.append("userId", userId);
      form1.append("planType", planType);
      form1.append("redeemFlag", false);
      response = await Axios.post(
        `http://${config.SERVER}:${config.PORT}/api/history`,
        form1,
        {
          headers: {
            "x-auth-token": token
          }
        }
      ).catch(error => {
        throw error;
      });
    } catch (e) {
      console.log(e.response.data);
    }
  };

  handleClick = e => {
    const { videoList } = this.props;
    this.props.setIsPlayerShow(e.target.parentElement.id);
    this.setState({ currentVideoId: videoList[e.target.parentElement.id].id });
  };

  closepopup = e => {
    this.props.setIsPlayerShow(false);
  };

  render() {
    const limit = 4;
    const { videoList, isPlayerShow } = this.props;
    let watched = 0;
    //check if videoList exists i.e atleast one Video should be Unwatched
    if (videoList) {
      //get total length of videoList
      let videoListLength = videoList.length;
      console.log("videoListLength", videoListLength);
      //get length of Watched videos
      let watchedVideosLength = videoList.filter(v => v.isWatched).length;
      console.log("watchedVideosLength", watchedVideosLength);
      //get length of Unwatched videos
      let unwatchedVideosLength = videoList.filter(v => !v.isWatched).length;
      console.log("unwatchedVideosLength", unwatchedVideosLength);
      //check if there are any Unwatched videos remaining after dividing total Watched videos by Limit for this category
      console.log("watchedVideosLength%limit", watchedVideosLength % limit);
      watched = watchedVideosLength % limit;
    }

    return (
      <div align="center">
        {isPlayerShow ? (
          <Dimmer active={isPlayerShow} page>
            <Segment basic>
              <div className="popup-wrapper">
                <div className="close-popup" onClick={this.closepopup}>
                  X
                </div>
                <ShowPlayer videoList={videoList} index={isPlayerShow} />
              </div>
            </Segment>
          </Dimmer>
        ) : (
          ""
        )}
        {videoList &&
        watched < videoList.filter(item => !item.isWatched).length ? (
          <div>
            <h3>
              {watched}/{limit} videos watched
            </h3>
            <Segment align="left" basic>
              <Progress color="blue" percent={(watched / limit) * 100} active />
            </Segment>
            <Image.Group size="small">
              {videoList.map((v, i) => (
                <Image
                  onClick={
                    videoList[i].isWatched ? undefined : this.handleClick
                  }
                  id={i}
                  key={i}
                  src={`http://${config.SERVER}:${config.PORT}/covers/${videoList[i].id}.${videoList[i].coverfileType}`}
                  label={
                    videoList[i].isWatched
                      ? {
                          as: "a",
                          color: "blue",
                          content: "Watched",
                          ribbon: true
                        }
                      : false
                  }
                />
              ))}
            </Image.Group>
          </div>
        ) : (
          <div align="center">
            <br />
            <h3>You have already watched all the Banners!</h3>
            <br />
            <Segment basic>
              <Link to="/Regular/DataPlans">
                <Button
                  size="large"
                  fluid
                  color="green"
                  style={{ backgroundColor: "#7E00FC" }}
                >
                  Get More Free Data
                </Button>
              </Link>
            </Segment>
            <Segment basic>
              <Link to="/Regular/MyPrograms">
                <Button
                  size="large"
                  fluid
                  color="green"
                  style={{ backgroundColor: "#7E00FC" }}
                >
                  View Your Account
                </Button>
              </Link>
            </Segment>
          </div>
        )}
        <Dimmer active={watched === limit} page>
          <Header as="h2" inverted>
            You completed watching all the ads - WELL DONE!!
          </Header>
          <Segment basic>
            <Link to="/Regular/DataPlans">
              <Button
                size="large"
                fluid
                color="green"
                style={{ backgroundColor: "#7E00FC" }}
              >
                Get More Free Data
              </Button>
            </Link>
          </Segment>
          <Segment basic>
            <Link to="/Regular/MyPrograms">
              <Button
                size="large"
                fluid
                color="green"
                style={{ backgroundColor: "#7E00FC" }}
              >
                View Your Account
              </Button>
            </Link>
          </Segment>
        </Dimmer>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    currentPageTitle: state.currentPageTitle,
    isPlayerShow: state.isPlayerShow,
    videoList: state.videoList,
    token: state.token,
    planType: state.planType
  };
};

const mapDispatchToProps = dispatch => {
  return {
    setcurrentPageTitle: data => dispatch({ type: "CURRENT_PAGE", data: data }),
    setIsLoading: data => dispatch({ type: "SET_LOADING", data: data }),
    closeMenu: data => dispatch({ type: "MENU_VISIBLE", data: data }),
    setIsPlayerShow: data =>
      dispatch({ type: "SET_IS_PLAYER_SHOW", data: data }),
    setVideoList: data => dispatch({ type: "SET_VIDEO_LIST", data: data }),
    setIsWatched: data => dispatch({ type: "SET_WATCHED", data: data }),
    setErrorMsg: data => dispatch({ type: "SET_ERROR_MSG", data: data })
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AdsGalleryVideos);
