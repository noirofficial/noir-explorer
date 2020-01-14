
import PropTypes from 'prop-types';
import React from 'react';

import Card from './Card';
import Select from '../../component/Select';
import Icon from '../Icon';

export default class CardPoSCalc extends React.Component {
  constructor(props) {
    super(props);
    this.fromInputField = null;
    this.toInputField = null;

    this.state = {
      inputFrom: 1500.0,
      inputTo: 3000.0,
      date: (60 * 60 * 24 * 31).toString(), // Last Month
      restakeOnly: true
    };
  };

  handleClick = () => {
    const inputFrom = this.state.inputFrom;
    const isInputFromValid = !!inputFrom && !isNaN(inputFrom) && inputFrom > 0;

    const inputTo = this.state.inputTo;
    const isInputToValid = !!inputTo && !isNaN(inputTo) && inputTo > 0;

    if (!isInputFromValid) {
      this.fromInputField.focus();
    } else if (!isInputToValid) {
      this.toInputField.focus();
    } else {
      document.location.href = `/#/pos/${inputFrom}/${inputTo}/${this.state.date}/${this.state.restakeOnly ? '1' : '0'}`;
    }
  };

  handleKeyPressFrom = (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.handleClick();
    } else {
      this.setState({
        inputFrom: ev.target.value.trim()
      });
    }
  };
  handleKeyPressTo = (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.handleClick();
    } else {
      this.setState({
        inputTo: ev.target.value.trim()
      });
    }
  };

  handleDate = date => this.setState({ date });

  render() {

    const getDateDropdown = () => {
      // Caver movement types
      const sortOptions = [
        //{ label: 'Since Genesis', value: '0' },

        { label: 'Past Hour', value: (60 * 60).toString() },
        { label: 'Past 2 Hours', value: (60 * 60 * 2).toString() },
        { label: 'Past 4 Hours', value: (60 * 60 * 4).toString() },
        { label: 'Past 8 Hours', value: (60 * 60 * 8).toString() },
        { label: 'Past 24 Hours', value: (60 * 60 * 24).toString() },
        { label: 'Past 48 Hours', value: (60 * 60 * 24 * 2).toString() },
        { label: 'Past Week', value: (60 * 60 * 24 * 7).toString() },
        { label: 'Past Month', value: (60 * 60 * 24 * 31).toString() },
        { label: 'Past 3 Months', value: (60 * 60 * 24 * 31 * 3).toString() },
        { label: 'Past 6 Months', value: (60 * 60 * 24 * 31 * 6).toString() },
        { label: 'Past Year', value: (60 * 60 * 24 * 365).toString() },
        //{ label: 'Last 2 Years', value: (60 * 60 * 24 * 365 * 2).toString() },
      ];
      return <label className="mb-0 d-block">
        Date Range
          <Select
          onChange={value => this.handleDate(value)}
          selectedValue={this.state.date}
          options={sortOptions} />
      </label>
    }

    const getCarverIcon = () => {
      return <img src="/img/footerlogo.svg" width="16" height="16" className="align-middle"></img>
    }
    return (
      <Card title="Staking ROI% Calculator" titleClassName="mb-3">
        <div className="row">
          <div className="col-sm-12 col-md-6">
            <label>
              Input Size (From)
              <input
                className="px-2"
                onKeyPress={this.handleKeyPressFrom}
                onChange={ev => this.setState({ inputFrom: ev.target.value.trim() })}
                ref={input => this.fromInputField = input}
                style={{ width: '100%' }}
                type="text"
                value={this.state.inputFrom} />
            </label>
          </div>
          <div className="col-sm-12 col-md-6">
            <label>
              Input Size (To)
              <input
                className="px-2"
                onKeyPress={this.handleKeyPressTo}
                onChange={ev => this.setState({ inputTo: ev.target.value.trim() })}
                ref={input => this.toInputField = input}
                style={{ width: '100%' }}
                type="text"
                value={this.state.inputTo} />
            </label>

          </div>
          <div className="col-sm-6 text-left">
            <div>
              {getDateDropdown()}
            </div>

          </div>
          <div className="col-sm-6 text-left">
            <label className="pt-4 mb-0"><input type="checkbox" className="align-middle" checked={this.state.restakeOnly} onChange={ev => this.setState({ restakeOnly: ev.target.checked })} /> Re-Staking Only</label>
          </div>
          <div className="col-sm-12 small text-secondary text-center">
            <div>
              <button onClick={this.handleClick} className="mb-1">
                Estimate Stake ROI%
            </button>
            </div>
            <div className="mt-2 text-left">
              {getCarverIcon()} Based on realtime, per-block blockchain rewards data
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-12 text-gray">
          </div>
        </div>
      </Card>
    );
  };
}
