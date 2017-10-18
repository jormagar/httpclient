/**
 * @file httpclient.js
 * @author (c) 2015 Jorge Macías García
 * @version 3.0.1
 * @since 3.0.1 - Cambia función reset no anulando los callbacks
 */

'use strict';

function HttpClient() {
  this.attempts = null;
  this.callbacks = {
    success: null,
    error: null
  };
  this.httpClient = null;
  this.params = null;
  this.isInitialized = false;
}

/**
 * init
 * @param {object} params
 * @param {String} params.method
 * @param {String} params.url
 * @param {Object} params.success
 * @param {Object} params.error
 * @param {Number} params.attempts
 * @param {Number} params.timeout
 * @param {Object} params.headers {'header_1':'value_1', 'header_n':'value_n'}
 * @param {Object} params.data JSON Object as {'key_1':'value_1',
 * 'key_n':'value_n'}
 * @returns {Boolean}
 */
HttpClient.prototype.init = function (params) {
  var config;

  if (this.isInitialized || !this.validateParams(params)) {
    return false;
  }

  this.attempts = (params.attempts > 0) ? params.attempts : 1;

  this.callbacks.success = params.success;
  this.callbacks.error = params.error;

  this.isInitialized = true;

  //Establecemos timeout y callbacks
  config = {
    onload: this.successCallback.bind(this),
    onerror: this.errorCallback.bind(this),
    onreadystatechange: this.onReadyStateChange.bind(this),
    timeout: params.timeout || 3000
  };

  //Establecemos credenciales de
  //usuario si los necesitamos
  if (params.withCredentials) {
    config.withCredentials = true;
    config.username = params.credentials.username;
    config.password = params.credentials.password;
  }

  if (Object(params).hasOwnProperty('autoEncodeUrl')) {
    config.autoEncodeUrl = params.autoEncodeUrl;
  }

  this.params = params;

  //Instanciamos el cliente http con la configuración
  this.httpClient = Ti.Network.createHTTPClient(config);

  return true;
};

/**
 * validateParams
 * @param {Object} params
 * @param {String} params.method
 * @param {String} params.url
 * @param {Object} params.success
 * @param {Object} params.error
 * @param {Number} params.attempts
 * @param {Number} params.timeout
 * @param {Object} params.headers {'header_1':'value_1', 'header_n':'value_n'}
 * @param {Object} params.data JSON Object as {'key_1':'value_1',
 * 'key_n':'value_n'}
 * @returns {Boolean}
 */
HttpClient.prototype.validateParams = function (params) {
  var regExp,
    isValid;

  isValid = true;

  if (Object(params).hasOwnProperty('method') && Object(params).hasOwnProperty('url') && Object(params).hasOwnProperty('success') && Object(params).hasOwnProperty('error')) {

    if (params.method !== 'GET' && params.method !== 'POST' && params.method !== 'PUT' && params.method !== 'DELETE') {
      isValid = false;
    }

    regExp = /^(https?:\/\/){1}/;
    //Comprobamos que empiece por http o https (faltaría hacer una regexp
    // mucho más compleja)
    if (!regExp.test(params.url)) {
      isValid = false;
    }

    if (typeof params.success !== 'function' || typeof params.error !== 'function') {
      isValid = false;
    }

  } else {
    isValid = false;
  }

  return isValid;
};

/**
 * doRequest
 * @description Realiza la petición
 */
HttpClient.prototype.doRequest = function () {
  var header;

  if (!this.isInitialized) {
    console.log('HTTPCLIENT LIB: HTTP CLIENT NOT INITIALIZED');
  } else {

    this.httpClient.abort();

    if (OS_IOS) {
      this.httpClient.setCache(false);
    }

    //Abrimos la conexión
    this.httpClient.open(this.params.method, this.params.url);

    //Establecemos cabeceras
    for (header in this.params.headers) {
      if (Object.prototype.hasOwnProperty.call(this.params.headers, header)) {
        this.httpClient.setRequestHeader(header, this.params.headers[header]);
      }
    }

    this.attempts--;

    //Si la petición lleva datos
    if (this.params.data) {
      this.httpClient.send(this.params.data);
    } else {
      this.httpClient.send();
    }
  }
};

/**
 * successCallback
 * @description Callback de éxito
 * @param {object} _event
 */
HttpClient.prototype.successCallback = function (_event) {
  this.reset();
  this.callbacks.success && this.callbacks.success(_event.source);
};

/**
 * errorCallback
 * @description Callback de éxito
 * @param {object} _event
 */
HttpClient.prototype.errorCallback = function (_event) {
  if (this.attempts === 0) {
    this.reset();
    this.callbacks.error && this.callbacks.error(_event.source);
  } else {
    this.doRequest();
  }
};

/**
 * reset
 * @description Restablece la clase a su estado inicial
 */
HttpClient.prototype.reset = function () {
  this.attempts = null;
  this.httpClient = null;
  this.params = null;
  this.isInitialized = false;
};

HttpClient.prototype.onReadyStateChange = function (_event) {
  var readyState = _event.source.readyState;
  switch (readyState) {
    case 0:
      // after HTTPClient declared, prior to open()
      // though Ti won't actually report on this readyState
      Ti.API.info('case 0, readyState = ' + readyState);
      break;
    case 1:
      // open() has been called, now is the time to set headers
      Ti.API.info('case 1, readyState = ' + readyState);
      break;
    case 2:
      // headers received, xhr.status should be available now
      Ti.API.info('case 2, readyState = ' + readyState);
      break;
    case 3:
      // data is being received, onsendstream/ondatastream being called now
      Ti.API.info('case 3, readyState = ' + readyState);
      break;
    case 4:
      // done, onload or onerror should be called now
      Ti.API.info('case 4, readyState = ' + readyState);
      break;
    default:
      break;
  }
};

HttpClient.prototype.release = function () {
  if (this.httpClient) {
    this.httpClient.onload = null;
    this.httpClient.onerror = null;
    this.httpClient.abort();
  }
  this.callbacks = null;
  this.reset();
};

module.exports = HttpClient;
