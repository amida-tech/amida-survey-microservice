import React, { Component } from 'react';
import './index.scss';

class Form extends Component {
  render() {

    const renderInputField = (id, type, placeholder, label) => (
      <div className="form-group">
        <label htmlFor={id}>{label}</label>
        <input className="form-control" id={id} type={type} value={this.props.data[id]} onChange={this.props.changeForm} />
      </div>
    );

    const renderSelectField = (id, defaultValue, label, options) => (
      <div className="form-group">
        <label htmlFor="gender">{label}</label>
        <select onChange={this.props.changeForm} value={defaultValue} className="form-control" id={id}>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    );

    const renderCheckbox = (surveyId, questionId, choiceId, label) => (
      <div className="checkbox">
        <label><input type="checkbox"
                      name={surveyId + '.' + questionId + '.' + choiceId}
                      id={surveyId + '.' + questionId + '.' + choiceId}
                      onChange={this.props.changeChoice}
                      value={surveyId + '.' + questionId + '.' + choiceId}/> {label}</label>
      </div>
    );

    return(
      <form className="" onSubmit={this.props.onSubmit}>
        <div className="form__error-wrapper">
          <p className="form__error form__error--username-taken">Sorry, but this username is already taken.</p>
          <p className="form__error form__error--username-not-registered">This username does not exist.</p>
          <p className="form__error form__error--wrong-password">Wrong password.</p>
          <p className="form__error form__error--field-missing">Please fill out the entire form.</p>
          <p className="form__error form__error--failed">Something went wrong, please try again!</p>
        </div>

        <div className="col-sm-6">
          <div className="login-info">
            {renderInputField("username", "text", "admin", "Username")}
            {renderInputField("password", "password", "••••••••••", "Password")}
          </div>

          <div className="personal-info">
            {renderInputField("email", "email", "someone@domain.tld", "Email")}
            {renderInputField("zip", "text", "", "Zip")}
          </div>

          <div className="demographic-info">

            {renderInputField("dob", "text", "mm/dd/yyyy", "Date of birth")}

            {renderSelectField("gender", this.props.data.gender, "Gender", this.props.availableGenders)}
            {renderSelectField("ethnicity", this.props.data.ethnicity, "Ethnicity", this.props.availableEthnicities)}

          </div>
        </div>

        <div className="col-sm-6">
          <div className="registry-specific">
            {this.props.survey.questions.map(question => {
              switch (question.type) {
                case 'choices':
                  return question.choices.map(choice => {
                    return renderCheckbox(this.props.survey.id, question.id, choice.id, choice.text);
                  })
                // case 'bool':
                  // return renderCheckbox(this.props.survey.id, question.id, '-1', question.text);
              }
            })}

            {/*{renderSelectField("familyHistory", this.props.data.familyHistory, "Family history", [{key:"memoryDisorders", label:"Memory disorders"}, {key:"dementia", label:"Dementia"}, {key:"ad", label:"AD"}])}
            <div className="form-group">
              <label>How did you hear about us?</label>
              {renderCheckbox("tv", "TV")}
              {renderCheckbox("radio", "Radio")}
              {renderCheckbox("newspaper", "Newspaper")}
              {renderCheckbox("internetAd", "Facebook/Google Ad/Other internet")}
              {renderCheckbox("physician", "Physician/nurse/healthcare professional")}
              {renderCheckbox("caregiver", "Caregiver")}
              {renderCheckbox("friendsAndFamily", "Friend/Family member")}
              {renderCheckbox("event", "Community event")}
            </div>

            <div className="form-group">
              <label>Are you interested in receiving info on</label>
              {renderCheckbox("brainHealth", "Brain Health")}
              {renderCheckbox("clinicalTrials", "Clinical Trials on Brain Health")}
            </div>


            {renderCheckbox("volunteer", "Are you interested in volunteering in clinical research?")}*/}
          </div>
        </div>



        <div className="form__submit-btn-wrapper">
          <button className="form__submit-btn" type="submit">{this.props.btnText}</button>
        </div>
      </form>
    );

  }
}

Form.propTypes = {
  onSubmit: React.PropTypes.func.isRequired,
  btnText: React.PropTypes.string.isRequired,
  changeForm: React.PropTypes.func.isRequired,
  data: React.PropTypes.object.isRequired,
  changeChoice: React.PropTypes.func.isRequired
}

export default Form;