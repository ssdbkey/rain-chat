/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Picker } from 'emoji-mart';
import { connect } from 'react-redux';
import Fuse from 'fuse.js';
import { Button, Row, Mentions } from 'antd';
import upload from '../../utils/qiniu';
import request from '../../utils/request';
import './style.scss';
import notification from '../Notification';
import debounce from '../../utils/debounce';
import { shareAction } from '../../redux/actions/shareAction';
import store from '../../redux/store';
import { showAds } from '../../utils/ads';
import { enableVitaePost, disableVitaePost } from '../../redux/actions/enableVitaePost';

const { Option } = Mentions;

function getPlaceholder() {
  return 'Write messages...';
}

class InputArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputMsg: '',
      showEmojiPicker: false,
      relatedMembers: [],
    };
    this._uploadToken = null;
    this._onPaste = debounce(this._paste, 2000, true);
    this._placeHolder = getPlaceholder();
  }

  async _showStaticAds(cb) {
    try {
      const res = await request.axios('get', `/api/v1/campaign/static`);
      const duration = res.duration;
      if (res && res.success) {
        showAds(res.ads, duration, true);
        setTimeout(cb, duration);
      } else {
        cb();
      }
    } catch (error) {
      // console.log(error);
      cb();
    }
  }

  _sendMessage = ({ attachments = [], message }) => {
    const { sendMessage } = this.props;
    const { inputMsg } = this.state;
    const { userInfo } = this.props;
    const { role } = userInfo;
    const _this = this;

    if (role === 'FREE') {
      this._showStaticAds(() => {
        if (window.location.href.includes('vitae-rain-group')) {
          _this._postMessage();
        } else {
          // console.log(message, inputMsg);
          sendMessage(message || inputMsg, attachments);

          // _this.state.inputMsg = '';
          _this.setState({ inputMsg: '' });
          if (_this.nameInput) {
            _this.nameInput.focus();
          }
        }
      });
    } else {
      sendMessage(message || inputMsg, attachments);
      this.setState({ inputMsg: '' });
      if (this.nameInput) {
        this.nameInput.focus();
      }
    }
  };

  _postMessage = () => {
    // console.log('_postMessage');
    const { sendMessage } = this.props;
    sendMessage('I love Vitae. :heart:', []);
    this.props.disableVitaePost();
  };

  _selectSomeOneOrNot = () => {
    const { inputMsg } = this.state;
    const shouldPrompt = /\S*@$|\S*@\S+$/.test(inputMsg);
    if (!shouldPrompt) {
      this.setState({ relatedMembers: [] });
      return;
    }
    const groupMembers = this.props.groupMembers;
    if (groupMembers && groupMembers.length > 1) {
      const fuse = new Fuse(groupMembers, this.filterOptions);
      const filterText = /@\S*$/.exec(inputMsg)[0].slice(1);
      const relatedMembers = filterText ? fuse.search(filterText) : groupMembers;
      this.setState({ relatedMembers });
    }
  };

  _inputMsgChange = value => {
    // console.log('_inputMsgChange');
    this.setState(
      {
        inputMsg: value,
      },
      // () => {
      //   this._selectSomeOneOrNot();
      // },
    );
  };

  _inputMsgChangeForEvent = e => {
    this.setState(
      {
        inputMsg: e.target.value,
      },
      // () => {
      //   this._selectSomeOneOrNot();
      // },
    );
  };

  _clickShowEmojiPicker = () => {
    const { showEmojiPicker } = this.state;
    this.setState({ showEmojiPicker: !showEmojiPicker });
  };

  _selectEmoji = emoji => {
    this.setState(state => ({ inputMsg: `${state.inputMsg} ${emoji.colons}` }));
    this._clickShowEmojiPicker();
    if (this.nameInput) {
      this.nameInput.focus();
    }
  };

  componentDidMount() {
    if (this.props.shareData) {
      this._sendMessage({ message: `::share::${JSON.stringify(this.props.shareData)}` });
      store.dispatch(shareAction(null));
    }
    if (this.nameInput) {
      this.nameInput.focus();
    }
  }

  _fetchUpLoadToken = async () => {
    if (!this._uploadToken) {
      this._uploadToken = await request.socketEmitAndGetResponse('getQiniuToken');
    }
  };

  _onSelectFile = e => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async event => {
      const limitSize = 1000 * 1024 * 2; // 2 MB
      if (file.size > limitSize) {
        notification('The file you send cannot exceed 2MB!', 'warn', 2);
        return;
      }
      if (event.target.readyState === FileReader.DONE) {
        await this._fetchUpLoadToken();
        upload(file, this._uploadToken, fileUrl => {
          const type = file.type.split('/')[0];
          const attachments = [{ fileUrl, type, name: file.name }];
          this._sendMessage({ attachments });
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  //  displayContents = (contents) => {
  //    // console.log('contents', contents);
  //    //  this.setState({
  //    //    inputMsg: contents
  //    //  });
  //    const element = document.getElementById('textarea');
  //    element.textContent = contents;
  //  }

  _keyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      this._sendMessage({ attachments: [] });
      e.preventDefault();
    }
  };

  get filterOptions() {
    const options = {
      shouldSort: true,
      threshold: 0.3,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: ['name'],
    };
    return options;
  }

  _clickSomeOneSelected = name => {
    this.setState(
      state => {
        const newInputMsg = state.inputMsg.replace(/@\S*$/, `@${name} `);
        return { inputMsg: newInputMsg, relatedMembers: [] };
      },
      () => {
        if (this.nameInput) {
          this.nameInput.focus();
        }
      },
    );
  };

  filterMembersRender = () => {
    const { relatedMembers } = this.state;
    return (
      <ul className="filterMembers">
        {relatedMembers &&
          relatedMembers.length > 0 &&
          relatedMembers.map((e, index) => (
            <li key={index} onClick={() => this._clickSomeOneSelected(e.name)}>
              {e.name}
            </li>
          ))}
      </ul>
    );
  };

  _paste = async e => {
    const clipboardData = e.clipboardData || e.originalEvent.clipboardData;
    const items = clipboardData && clipboardData.items;
    if (!items) return;
    const len = items.length;
    for (let i = 0; i < len; i += 1) {
      if (items[i].kind === 'file') {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) {
          return;
        }
        const limitSize = 1000 * 1024 * 2; // 2 MB
        if (file.size > limitSize) {
          notification('The file you send cannot exceed 2MB!', 'warn', 2);
          return;
        }
        await this._fetchUpLoadToken();
        upload(file, this._uploadToken, fileUrl => {
          const type = file.type.split('/')[0];
          const attachments = [{ fileUrl, type, name: file.name }];
          this._sendMessage({ attachments });
        });
      }
    }
  };

  onSelectUsername = () => {};

  render() {
    const { inputMsg, showEmojiPicker, relatedMembers } = this.state;
    const buttonClass = inputMsg ? 'btn btnActive' : 'btn';
    const { userInfo } = this.props;
    const { role } = userInfo;
    const { vitaePostEnabled } = this.props;

    // console.log('\n\n --- InputArea --- \n\n', this);

    return role === 'FREE' && window.location.href.includes('vitae-rain-group') ? (
      <div className="input-msg">
        <Row justify="space-around" style={{ width: '100%' }}>
          {userInfo.ban === 0 &&
            (vitaePostEnabled ? (
              <Button type="primary" onClick={this._sendMessage}>
                Post
              </Button>
            ) : (
              <Button type="primary" disabled>
                Post Disabled
              </Button>
            ))}
          {userInfo.ban > 0 && (
            <Button type="primary" disabled>
              You are banned
            </Button>
          )}
        </Row>
      </div>
    ) : (
      <div className="input-msg">
        {showEmojiPicker && <div onClick={this._clickShowEmojiPicker} className="mask" />}
        {showEmojiPicker && (
          <Picker
            onSelect={this._selectEmoji}
            backgroundImageFn={() => 'https://cdn.aermin.top/emojione.png'}
            showPreview={false}
          />
        )}
        <div className="left">
          <svg onClick={this._clickShowEmojiPicker} className="icon emoji" aria-hidden="true">
            <use xlinkHref="#icon-smile" />
          </svg>
          {/* <label className="file">
            <svg className="icon" aria-hidden="true">
              <use xlinkHref="#icon-file" />
            </svg>
            <input type="file" className="file-input" onChange={this._onSelectFile} />
          </label> */}
        </div>
        {/* {relatedMembers && relatedMembers.length > 0 && this.filterMembersRender()} */}
        {/* <textarea
          ref={input => {
            this.nameInput = input;
          }}
          value={inputMsg}
          onChange={this._inputMsgChangeForEvent}
          placeholder={this._placeHolder}
          onPaste={this._onPaste}
          onKeyPressCapture={this._keyPress}
        /> */}
        <Mentions
          style={{ width: '100%' }}
          value={inputMsg}
          onChange={this._inputMsgChange}
          onSelect={this.onSelectUsername}
          onKeyPressCapture={this._keyPress}
          placeholder={this._placeHolder}
          onPaste={this._onPaste}
        >
          {(this.props.groupMembers || []).map(member => (
            <Option value={member.username}>{member.username}</Option>
          ))}
          {/* <Option value="afc163">afc163</Option>
          <Option value="zombieJ">zombieJ</Option>
          <Option value="yesmeck">yesmeck</Option> */}
        </Mentions>
        {/* <pre id="textarea" /> */}
        <p className={buttonClass} onClick={this._sendMessage}>
          Send
        </p>
      </div>
    );
  }
}

InputArea.propTypes = {
  sendMessage: PropTypes.func,
  shareData: PropTypes.object,
};

InputArea.defaultProps = {
  sendMessage: undefined,
  shareData: undefined,
};

const mapStateToProps = state => ({
  vitaePostEnabled: state.vitaePostEnabled,
  userInfo: state.user.userInfo,
});

const mapDispatchToProps = dispatch => ({
  enableVitaePost(arg) {
    dispatch(enableVitaePost(arg));
  },
  disableVitaePost(arg) {
    dispatch(disableVitaePost(arg));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(InputArea);
