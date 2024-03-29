import { connect } from 'react-redux';
import HomePageList from '../../components/HomePageList';
import { showCallMeTipAction } from './homePageListAction';

const mapStateToProps = state => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const homePageListStorage =
    userInfo &&
    userInfo.userId &&
    JSON.parse(localStorage.getItem(`homePageList-${userInfo.userId}`));
  return {
    homePageList: homePageListStorage || state.homePageListState,
    allGroupChats: state.allGroupChatsState,
    allPrivateChats: state.allPrivateChatsState,
    initializedApp: state.initAppState,
  };
};

const mapDispatchToProps = dispatch => ({
  showCallMeTip(arg = {}) {
    dispatch(showCallMeTipAction({ ...arg }));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(HomePageList);
