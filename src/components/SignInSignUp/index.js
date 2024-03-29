import React, { Component } from 'react';
import './index.scss';
import PropTypes from 'prop-types';
import Spinner from '../Spinner';
import UserAvatar from '../UserAvatar';

export default class SignInSignUp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      email: '',
      username: '',
      password: '',
      showSpinner: true,
    };
  }

  handleChange = event => {
    const { target } = event;
    this.setState({ [target.name]: target.value });
  };

  componentDidMount() {
    this.setState({ showSpinner: false });
  }

  handleClick = () => {
    this.props.setValue(this.state);
  };

  get clientId() {
    return '8c694af835d62f8fd490';
  }

  render() {
    const { isLogin } = this.props;
    const { name, email, username, password } = this.state;

    const buttonName = isLogin ? 'Log in' : 'Register';
    return (
      <div className="formContent fadeInDown">
        {this.state.showSpinner && <Spinner />}
        <div className="userAvatarWrapper">
          <UserAvatar name={username || 'U'} size="100" color="#44C97D" />
        </div>
        {!isLogin && (
          <div className="center">
            <div className="center">
              <input
                type="text"
                name="name"
                value={name}
                onChange={this.handleChange}
                placeholder="Full Name"
              />
            </div>
            <div className="center">
              <input
                type="text"
                name="email"
                value={email}
                onChange={this.handleChange}
                placeholder="Email"
              />
            </div>
          </div>
        )}
        <div className="center">
          <input
            type="text"
            name="username"
            value={username}
            onChange={this.handleChange}
            placeholder="Username"
          />
        </div>
        <div className="center">
          <input
            type="password"
            name="password"
            value={password}
            onChange={this.handleChange}
            placeholder="Password"
          />
        </div>
        <div className="center">
          <input type="button" onClick={this.handleClick} value={buttonName} />
        </div>
      </div>
    );
  }
}

SignInSignUp.propTypes = {
  setValue: PropTypes.func,
  isLogin: PropTypes.bool,
};

SignInSignUp.defaultProps = {
  setValue() {},
  isLogin: false,
};
