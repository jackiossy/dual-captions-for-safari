import React from 'react';
import { sendMessageToActiveTab } from '../utils/chrome';
import config from '../config';

class TranslationRequest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLanguage: 'en' // Default to English
    };

    this.onClickSubmitButton = this.onClickSubmitButton.bind(this);
    this.onLanguageSelectChanged = this.onLanguageSelectChanged.bind(this);
  }

  onClickSubmitButton() {
    this.props.onLanguageSelected(this.props.text, this.state.selectedLanguage);
  }

  onLanguageSelectChanged(e) {
    const selectedLanguage = e.target.value;
    this.setState({
      selectedLanguage
    });
  }

  render() {
    const secondLanguagesKeys = Object.keys(config.secondLanguages);
    const secondLanguages = secondLanguagesKeys.map(language => (
      <option
        key={language}
        value={language}>
        {config.secondLanguages[language]}
      </option>
    ));
    const captionAsHtml = { __html: this.props.text };
    return (
      <div className='translation-request'>
        <div className='translation-request-inner'>
          <div>Trying to load captions...</div>
          <div>What language is this?</div>
          <div dangerouslySetInnerHTML={captionAsHtml}/>
          <select
            value={this.state.selectedLanguage}
            onChange={this.onLanguageSelectChanged}>
            { secondLanguages }
          </select>
          <button onClick={this.onClickSubmitButton}>Submit</button>
        </div>
      </div>
    )
  }
}

class TranslationQueue extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      queue: []
      // TODO - Add "currentTranslationRequest"
    }
    this.getQueue = this.getQueue.bind(this);

    // For stubbing support via sinon.stub() - TODO - Still need?
    this.sendMessageToActiveTab = sendMessageToActiveTab;
  }

  componentDidMount() {
    this.getQueue();
    window.setInterval(this.getQueue, 3 * 1000); // Request queue every 3 seconds
  }

  getQueue() {
    this.sendMessageToActiveTab({
      type: 'get-queue'
    }).then(response => {
      if (response && response.ok) {
        this.setState({
          queue: response.payload
        });
      }
    }).catch(err => {
      // No-op
    });
  }

  resolveTranslation(text, language) {
    this.sendMessageToActiveTab({
      type: 'resolve-translation',
      payload: {
        text: text,
        language: language
      }
    }).then(response => {
      if (response.ok) {
        // Should come with up-to-date queue in response
        const queue = response.payload;
        this.setState({
          queue
        });
      } else {
        console.error(response.error)
        // TODO - ?
      }
    });
  }

  render() {
    const hasUnresolvedRequests = this.state.queue.some(i => !i.isResolved);
    if (hasUnresolvedRequests) {
      const requestModals = this.state.queue.map((request, index) => {
        if (request.isResolved) {
          return null;
        } else {
          return (
            <TranslationRequest
              text={request.text}
              key={request.text}
              index={index}
              onLanguageSelected={this.resolveTranslation.bind(this)}
            />
          );
        }
      });
      return (
        <div className='translation-queue'>
          { requestModals }
        </div>
      );
    } else {
      return null;
    }
  }
}

export default TranslationQueue;
