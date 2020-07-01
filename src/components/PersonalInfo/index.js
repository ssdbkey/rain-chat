/* eslint-disable react/prefer-stateless-function */
/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { Drawer, Row, Col, Button } from 'antd';
import './styles.scss';
import notification from '../Notification';

class PersonalInfo extends Component {
  goToChat = () => {
    this.props.history.push(`/private_chat/${this.props.userInfo.userId}`);
    this.props.hide();
  };

  deleteContact = () => {
    const myInfo = JSON.parse(localStorage.getItem('userInfo'));
    const {
      userInfo,
      deleteHomePageList,
      homePageList,
      deletePrivateChat,
      allPrivateChats,
    } = this.props;
    window.socket.emit(
      'deleteContact',
      {
        fromUser: myInfo.userId,
        toUser: userInfo.userId,
      },
      res => {
        if (res.code === 200) {
          deleteHomePageList({ homePageList, chatId: userInfo.userId });
          deletePrivateChat({ allPrivateChats, chatId: userInfo.userId });
          this.props.hide();
          notification('Successfully deleted contact', 'success', 2);
        }
      },
    );
  };

  kickMember = () => {
    const { userInfo, groupInfo } = this.props;
    window.socket.emit(
      'kickMember',
      {
        userId: userInfo.userId,
        groupId: groupInfo.groupId,
      },
      res => {
        if (res.code === 200) {
          this.props.hide();
        }
      },
    );
  };

  get isContact() {
    return (
      this.props.homePageList &&
      this.props.homePageList.find(e => e.userId === this.props.userInfo.userId)
    );
  }

  get isCreator() {
    const myInfo = JSON.parse(localStorage.getItem('userInfo'));
    return myInfo.userId === this.props.groupInfo.creatorId;
  }

  get isInGroup() {
    const { userInfo, groupInfo } = this.props;
    const members = groupInfo.members.filter(member => member.userId === userInfo.userId);
    return members.length !== 0;
  }

  render() {
    const {
      userInfo,
      modalVisible,
      hide,
      showContactButton,
      showShareIcon,
      showShareModal,
    } = this.props;
    console.log(this.props);

    const { username, name, intro, email, role } = userInfo;
    return (
      <Drawer title={name} visible={modalVisible} onClose={hide} className="user-info-drawer">
        <Row gutter={[0, 20]}>
          {intro && (
            <Col span={24}>
              <p>{intro}</p>
            </Col>
          )}
          {username && (
            <Col span={24}>
              <p>Username</p>
              <h3>@{username}</h3>
            </Col>
          )}
          {email && (
            <Col span={24}>
              <p>Email</p>
              <h3>{email}</h3>
            </Col>
          )}
          {role && (
            <Col span={24}>
              <p>Role</p>
              <h3>{role}</h3>
            </Col>
          )}
          {showContactButton && (
            <Col span={24}>
              {showContactButton && (
                <Button
                  type="primary"
                  onClick={this.goToChat}
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  Send Message
                </Button>
              )}

              {this.isContact && (
                <Button
                  type="primary"
                  danger
                  onClick={this.deleteContact}
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  Remove from contact
                </Button>
              )}

              {this.isCreator && this.isInGroup && (
                <Button
                  type="primary"
                  onClick={this.kickMember}
                  style={{ width: '100%', background: 'grey', borderColor: 'grey' }}
                >
                  Kick member
                </Button>
              )}
            </Col>
          )}
          {showShareIcon && (
            <Col span={24}>
              <svg onClick={showShareModal} className="icon shareIcon" aria-hidden="true">
                <use xlinkHref="#icon-share" />
              </svg>
            </Col>
          )}
        </Row>
      </Drawer>
    );
  }
}

PersonalInfo.propTypes = {
  groupInfo: PropTypes.object,
  userInfo: PropTypes.object,
  hide: PropTypes.func,
  modalVisible: PropTypes.bool,
  homePageList: PropTypes.array,
  deleteHomePageList: PropTypes.func,
  deletePrivateChat: PropTypes.func,
  allPrivateChats: PropTypes.instanceOf(Map),
  showContactButton: PropTypes.bool,
  showShareIcon: PropTypes.bool,
  showShareModal: PropTypes.func,
};

PersonalInfo.defaultProps = {
  groupInfo: {},
  userInfo: {},
  hide() {},
  modalVisible: false,
  homePageList: undefined,
  deleteHomePageList() {},
  deletePrivateChat() {},
  allPrivateChats: new Map(),
  showContactButton: true,
  showShareIcon: false,
  showShareModal() {},
};

export default withRouter(PersonalInfo);
