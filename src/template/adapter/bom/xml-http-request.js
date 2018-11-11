const load = require('../index')

// TODO：上传、cookie、302 等

const EventTarget = load('EventTarget')

const SUPPORT_METHOD = ['OPTIONS', 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT']
const STATUS_TEXT_MAP = {
  100: 'Continue',
  101: 'Switching protocols',

  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',

  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',

  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Requested Range Not Suitable',
  417: 'Expectation Failed',

  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
}

class XMLHttpRequest extends EventTarget {
  constructor(window) {
    super()

    this._window = window
    this._method = ''
    this._url = ''
    this._data = null
    this._status = 0
    this._statusText = ''
    this._readyState = XMLHttpRequest.UNSENT
    this._onreadystatechange = null
    this._header = {
      Accept: '*/*'
    }
    this._responseType = ''
    this._resHeader = null
    this._response = null
    this._timeout = 0
    this._startTime = null

    this._requestTask = null
    this._requestSuccess = this._requestSuccess.bind(this)
    this._requestFail = this._requestFail.bind(this)
    this._requestComplete = this._requestComplete.bind(this)
  }

  /**
   * readyState 变化
   */
  _callReadyStateChange(readyState) {
    const func = this._onreadystatechange
    const hasChange = readyState !== this._readyState

    this._readyState = readyState

    if (typeof func === 'function' && hasChange) func.call(null)
  }

  /**
   * 执行请求
   */
  _callRequest() {
    if (this._timeout) {
      this._startTime = +new Date()

      setTimeout(() => {
        if (!this._status && this._readyState !== XMLHttpRequest.DONE) {
          // 超时
          if (this._requestTask) this._requestTask.abort()
          this._callReadyStateChange(XMLHttpRequest.DONE)
          this._$trigger('timeout')
        }
      }, this._timeout)
    }

    // 重置各种状态
    this._status = 0
    this._statusText = ''
    this._readyState = XMLHttpRequest.OPENED
    this._resHeader = null
    this._response = null

    // 头信息
    const header = Object.assign({}, this._header)
    if (this._window) {
      header.cookie = this._window.document.cookie
    }

    this._requestTask = wx.request({
      url: this._url,
      data: this._data,
      header,
      method: this._method,
      dataType: this._responseType === 'json' ? 'json' : 'text',
      responseType: this._responseType === 'arraybuffer' ? 'arraybuffer' : 'text',
      success: this._requestSuccess,
      fail: this._requestFail,
      complete: this._requestComplete,
    })
  }

  /**
   * 请求成功
   */
  _requestSuccess({data, statusCode, header}) {
    this._status = statusCode
    this._resHeader = header

    this._callReadyStateChange(XMLHttpRequest.HEADERS_RECEIVED)

    // 处理 set-cookie
    if (this._window) {
      const setCookie = header['Set-Cookie']

      if (setCookie && typeof setCookie === 'string') {
        let start = 0
        let startSplit = 0
        let nextSplit = setCookie.indexOf(',', startSplit)
        const cookies = []

        while (nextSplit >= 0) {
          const lastSplitStr = setCookie.substring(start, nextSplit)
          const splitStr = setCookie.substr(nextSplit)

          // eslint-disable-next-line no-control-regex
          if (/^,\s*([^,=;\x00-\x1F]+)=([^;\n\r\0\x00-\x1F]*).*/.test(splitStr)) {
            // 分割成功，则上一片是完整 cookie
            cookies.push(lastSplitStr)
            start = nextSplit + 1
          }

          startSplit = nextSplit + 1
          nextSplit = setCookie.indexOf(',', startSplit)
        }

        // 塞入最后一片 cookie
        cookies.push(setCookie.substr(start))

        cookies.forEach(cookie => this._window.document.cookie = cookie)
      }
    }

    // 处理返回数据
    if (data) {
      this._callReadyStateChange(XMLHttpRequest.LOADING)
      this._$trigger('loadstart')
      this._response = data
      this._$trigger('loadend')
    }
  }

  /**
   * 请求失败
   */
  _requestFail({errMsg}) {
    this._status = 0
    this._statusText = errMsg

    this._$trigger('error')
  }

  /**
   * 请求完成
   */
  _requestComplete() {
    this._startTime = null
    this._requestTask = null
    this._callReadyStateChange(XMLHttpRequest.DONE)

    if (this._status) {
      this._$trigger('load')
    }
  }

  /**
   * 对外属性和方法
   */
  get timeout() {
    return this._timeout
  }

  set timeout(timeout) {
    if (typeof timeout !== 'number' || !isFinite(timeout) || timeout <= 0) return

    this._timeout = timeout
  }

  get status() {
    return this._status
  }

  get statusText() {
    if (this._readyState === XMLHttpRequest.UNSENT || this._readyState === XMLHttpRequest.OPENED) return ''

    return STATUS_TEXT_MAP[this._status + ''] || this._statusText || ''
  }

  get readyState() {
    return this._readyState
  }

  get onreadystatechange() {
    return this._onreadystatechange
  }

  set onreadystatechange(func) {
    if (typeof func === 'function') this._onreadystatechange = func
  }

  get responseType() {
    return this._responseType
  }

  set responseType(value) {
    if (typeof value !== 'string') return

    this._responseType = value
  }

  get responseText() {
    if (!this._responseType || this._responseType === 'text') {
      return this._response
    }

    return null
  }

  get response() {
    return this._response
  }

  abort() {
    if (this._requestTask) {
      this._requestTask.abort()
      this._$trigger('abort')
    }
  }

  getAllResponseHeaders() {
    if (this._readyState === XMLHttpRequest.UNSENT || this._readyState === XMLHttpRequest.OPENED || !this._resHeader) return ''

    return Object.keys(this._resHeader)
      .map(key => `${key}: ${this._resHeader[key]}`)
      .join('\r\n')
  }

  getResponseHeader(name) {
    if (this._readyState === XMLHttpRequest.UNSENT || this._readyState === XMLHttpRequest.OPENED || !this._resHeader) return null

    const value = this._resHeader[name]

    return typeof value === 'string' ? value : null
  }

  open(method, url) {
    if (typeof method === 'string') method = method.toUpperCase()

    if (SUPPORT_METHOD.indexOf(method) < 0) return
    if (!url || typeof url !== 'string') return

    this._method = method
    this._url = url

    this._callReadyStateChange(XMLHttpRequest.OPENED)
  }

  setRequestHeader(header, value) {
    if (typeof header === 'string' && typeof value === 'string') {
      this._header[header] = value
    }
  }

  send(data) {
    if (this._readyState !== XMLHttpRequest.OPENED) return

    this._data = data

    this._callRequest()
  }
}

XMLHttpRequest.UNSENT = 0
XMLHttpRequest.OPENED = 1
XMLHttpRequest.HEADERS_RECEIVED = 2
XMLHttpRequest.LOADING = 3
XMLHttpRequest.DONE = 4

module.exports = XMLHttpRequest
