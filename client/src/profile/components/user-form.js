import React, { Component } from 'react';

class UserForm extends Component {
  render() {

    const {user} = this.props

    const renderSelectField = (id, defaultValue, label, options) => (
      <div className="form-group">
        <label htmlFor="gender">{label}</label>
        <select required onChange={this.props.changeProfile} defaultValue={defaultValue} className="form-control" id={id}>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    );

    return(
      <div>
    { user.username ? (
      <form onSubmit={this.props.onSubmit}>
        <h2>{user.username}</h2>
        <div>

          <div className="form-group">
            <label htmlFor="password">{this.props.vocab.get('NEW_PASSWORD')}</label>
            <input className="form-control" id="password" type="password" onChange={this.props.changeProfile}/>
          </div>

          <div className="form-group">
            <label>{this.props.vocab.get('EMAIL')}</label>
            <input className="form-control" type="text" id="email" defaultValue={user.email}
                   onChange={this.props.changeProfile}/>
          </div>

          <div className="form-group">
            <label>{this.props.vocab.get('ZIP')}</label>
            <input className="form-control" type="text" id="zip" defaultValue={user.zip}
                   onChange={this.props.changeProfile}/>
          </div>

          {renderSelectField("gender", user.gender, this.props.vocab.get('GENDER'), this.props.availableGenders)}

          {renderSelectField("ethnicity", user.ethnicity, this.props.vocab.get('ETHNICITY'), this.props.availableEthnicities)}

          <p>{this.props.profileSaved ? "Save profile" : ""}</p>

          <button disabled={!this.props.hasChanges} className="form__submit-btn" type="submit">{this.props.vocab.get('SAVE_PROFILE')} </button>
        </div>
      </form>) : (<div></div>)
    }
    </div>
    )
  }
}

UserForm.propTypes = {
  user: React.PropTypes.object,
  changeProfile: React.PropTypes.func.isRequired,
  availableGenders: React.PropTypes.object.isRequired,
  availableEthnicities: React.PropTypes.object.isRequired,
}

export default UserForm;
