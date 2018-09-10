import { delay } from 'redux-saga';
import { put } from 'redux-saga/effects';
import axios from 'axios';

import * as actions from '../actions/index';

export function* logoutSaga(action) {
    //* makes this function a generator
    //generators are functions which can be executed incrementally, so they dont run from start to end immediatly, and you can pause the execution (for example to wait for async action to finish).

    //using yield will define step that doesnt need to finish before it execution can continue
    //yield is not spesific to redux saga! it next generation javascript!
    
    // yield call([localStorage, 'removeItem'], 'token') THIS CAN BE MOCKED, EASIER TO TEST!
    // if you want to test generators, you should use call!
    yield localStorage.removeItem('token');
    yield localStorage.removeItem('expirationDate');
    yield localStorage.removeItem('userId');

    // put functions will just dispatch a new action
    // action is received from th eaction creator
    yield put(actions.logoutSucceed());
}

export function* checkAuthTimeoutSaga(action) {
    yield delay(action.expirationTime * 1000);
    yield put(actions.logout());
}

export function* authUserSaga(action) {
    yield put(actions.authStart());
    const authData = {
        email: action.email,
        password: action.password,
        returnSecureToken: true
    };

    let url = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyDkRBhbSKrdTcwok2gFWn6IxCzpH3Tu6Kw';
    if (!action.isSignup) {
        url = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=AIzaSyDkRBhbSKrdTcwok2gFWn6IxCzpH3Tu6Kw';
    }

    // yield will wait for post response!
    // execution will pause until post response returns!
    try {
        const response = yield axios.post(url, authData);

        const expirationDate = yield new Date(new Date().getTime() + response.data.expiresIn * 1000);
        // yield is not neseccary for synchronous actions, but you can usit for consitensy
        yield localStorage.setItem('token', response.data.idToken);
        yield localStorage.setItem('expirationDate', expirationDate);
        yield localStorage.setItem('userId', response.data.localId);
        yield put(actions.authSuccess(response.data.idToken, response.data.localId));
        yield put(actions.checkAuthTimeout(response.data.expiresIn));
    } catch (err) {
        console.log(err);
        yield put(actions.authFail(err.response.data.error));
    }
}

export function* authCheckStateSaga(action) {
    const token = yield localStorage.getItem('token');
    if (!token) {
        yield put(actions.logout());
    } else {
        const expirationDate = yield new Date(localStorage.getItem('expirationDate'));
        if (expirationDate > new Date()) {
            const userId = yield localStorage.getItem('userId');
            yield put(actions.authSuccess(token, userId));
            yield put(actions.checkAuthTimeout((expirationDate.getTime() - new Date().getTime()) / 1000));
        } else {
            yield put(actions.logout());
        }
    }
}