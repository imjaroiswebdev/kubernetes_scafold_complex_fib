import React, { Component } from 'react';
import axios from 'axios';

class Fib extends Component {
  constructor () {
    super();
    this.state = {
      seenIndexes: [],
      values: {},
      index: '',
      resultMessage: ''
    };

    this.notificationSource = new EventSource('/api/notify');
  }

  componentDidMount () {
    this.fetchValues();
    this.fetchIndexes();
    this.subscribeToNotification();
  }

  async fetchValues () {
    const values = await axios.get('/api/values/current');
    this.setState({ values: values.data });
  }

  async fetchIndexes () {
    const seenIndexes = await axios.get('/api/values/all');
    this.setState({
      seenIndexes: seenIndexes.data
    });
  }

  subscribeToNotification () {
    this.notificationSource.addEventListener('calc_complete', message => {
      this.handleNewNotification(JSON.parse(message.data));
    })
  }

  handleNewNotification (notification) {
    console.log(notification);

    this.setState({
      resultMessage: `Calculation of index ${notification.index} resulted in ${notification.result} just now ::> ${Date().toLocaleString()}`
    }, function () {
      this.fetchValues();
      this.fetchIndexes();
    })
  }

  handleSubmit = async event => {
    event.preventDefault();

    if (!this.state.index || parseInt(this.state.index, 10) > 40) {
      return
    }

    await axios.post('/api/values', {
      index: this.state.index
    });
    this.setState({ index: '' });
  };

  renderSeenIndexes () {
    return this.state.seenIndexes.map(({ number }) => number).join(', ');
  }

  renderValues () {
    const entries = [];

    for (let key in this.state.values) {
      entries.push(
        <div key={key}>
          For index {key} I calculated {this.state.values[key]}
        </div>
      );
    }

    return entries;
  }

  render () {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <br />
          <label>Enter your index:</label>
          <input
            value={this.state.index}
            onChange={event => this.setState({ index: event.target.value })}
          />
          <button>Submit</button>
        </form>

        <br />
        <h4 style={{ color: 'red' }}>{this.state.resultMessage}</h4>
        <br />

        <h3>Indexes I have seen:</h3>
        {this.renderSeenIndexes()}

        <h3>Calculated Values:</h3>
        {this.renderValues()}
      </div>
    );
  }
}

export default Fib;
