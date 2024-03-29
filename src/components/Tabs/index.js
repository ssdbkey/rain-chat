/* eslint-disable react/no-unused-prop-types */
import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './style.scss';
import {
  SettingFilled,
  SettingOutlined,
  MessageFilled,
  MessageOutlined,
  LikeFilled,
  LikeOutlined,
  DashboardFilled,
  DashboardOutlined,
} from '@ant-design/icons';
import MyInfo from '../MyInfo';
import { initAppOnce } from './help';

class Tabs extends Component {
  constructor(props) {
    super(props);
    this._userInfo = JSON.parse(localStorage.getItem('userInfo'));
    initAppOnce(props);
  }

  render() {
    const { pathname } = this.props.location;
    return (
      <div className="tabs-wrapper">
        <MyInfo />
        <div className="tab">
          <Link to="/">
            {pathname === '/' ? (
              <MessageFilled className="icon" />
            ) : (
              <MessageOutlined className="icon" />
            )}
          </Link>
        </div>
        <div className="tab">
          <Link to="/setting">
            {pathname === '/setting' ? (
              <SettingFilled className="icon" />
            ) : (
              <SettingOutlined className="icon" />
            )}
          </Link>
        </div>
        <div className="tab">
          <Link to="/ads">
            {pathname === '/ads' ? (
              <LikeFilled className="icon" />
            ) : (
              <LikeOutlined className="icon" />
            )}
          </Link>
        </div>
        {this._userInfo && this._userInfo.role && this._userInfo.role === 'OWNER' ? (
          <div className="tab">
            <Link to="/admin">
              {pathname === '/admin' ? (
                <DashboardFilled className="icon" />
              ) : (
                <DashboardOutlined className="icon" />
              )}
            </Link>
          </div>
        ) : null}
      </div>
    );
  }
}

export default withRouter(Tabs);

Tabs.propTypes = {
  location: PropTypes.object,
  initializedApp: PropTypes.bool,
  initApp: PropTypes.func,
};

Tabs.defaultProps = {
  location: { pathname: '/' },
  initializedApp: false,
  initApp() {},
};
