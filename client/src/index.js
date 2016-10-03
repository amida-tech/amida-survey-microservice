import App from './app'
import routes from './routes'
import Layout from './layout/index'
import login from './login'
import register from './register'
import profile from './profile'
import surveyBuilder from './surveyBuilder'
import surveys from './surveys'
import { browserHistory } from 'react-router'


export const initialState = {
  title: "GAP",
  login: {
    formState: {
      hasErrors: false,
      username: '',
      password: ''
    },
    user: localStorage.user ? JSON.parse(localStorage.user) : {
      username: "",
      role: "",
      id: ""
    }
  },
  register: {
    formState: {
      username: '',
      password: '',
      ethnicity: 'Caucasion',
      gender: 'male'
    },
    availableEthnicities: [
      "Caucasion",
      "Hispanic",
      "African",
      "Asian"
    ],
    availableGenders: [
      "male",
      "female",
      "other"
    ],
    survey: {
      questions: []
    },
    surveyResult: {
      answers: []
    }
  },
  loggedIn: localStorage.token ? localStorage.token : false,
  profile: {
    user: {
      name: ""
    },
    survey: {
      questions: []
    }
  },
  surveyBuilder: {
    survey: {
      name: '',
      questions: [],
      released: true
    }
  },
  surveys: []
};

export const reducers = {
  [login.constants.NAME]: login.reducer,
  [register.constants.NAME]: register.reducer,
  [profile.constants.NAME]: profile.reducer,
  [surveyBuilder.constants.NAME]: surveyBuilder.reducer,
  [surveys.constants.NAME]: surveys.reducer,
  loggedIn: (state = initialState, action) => {
    switch (action.type) {
      case "LOGIN_SUCCESS":
        browserHistory.push('/')
        localStorage.setItem("token", action.data.token)
        return action.data.token
      case "LOGOUT":
        browserHistory.push('/login')
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        return false
      default:
        return state
    }
  },
  title: (state = initialState) => state
};

import './styles/main.scss'

App({ reducers, initialState, Layout, routes }).render()
