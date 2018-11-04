const load = require('../index')

const Event = load('Event')

class SessionStorage {
  constructor(pageId, window) {
    this._keys = []
    this._map = {}
    this._window = window
  }

  /**
   * 触发 window 的 storage 事件
   */
  _triggerStorage(key, newValue, oldValue, force) {
    if (!force && newValue === oldValue) return

    this._window._$trigger('storage', {
      event: new Event({
        name: 'storage',
        target: this._window,
        _$extra: {
          key,
          newValue,
          oldValue,
          storageArea: this,
          url: this._window.location.href,
        }
      })
    })
  }

  /**
   * 对外属性和方法
   */
  get length() {
    return this._keys.length
  }

  key(num) {
    if (typeof num !== 'number' || !isFinite(num) || num < 0) return null

    const key = this._keys[num]

    if (!key) return null

    return this._map[key] || null
  }

  getItem(key) {
    if (!key || typeof key !== 'string') return null

    return this._map[key] || null
  }

  setItem(key, data) {
    if (!key || typeof key !== 'string' || typeof data !== 'string') return

    const oldValue = this._map[key] || null

    this._map[key] = data

    // 调整顺序
    const index = this._keys.indexOf(key)
    if (index >= 0) this._keys.splice(index, 1)
    this._keys.push(key)

    this._triggerStorage(key, data, oldValue)
  }

  removeItem(key) {
    if (!key || typeof key !== 'string') return

    const oldValue = this._map[key] || null

    delete this._map[key]

    // 删除 key
    const index = this._keys.indexOf(key)
    if (index >= 0) this._keys.splice(index, 1)

    this._triggerStorage(key, null, oldValue)
  }

  clear() {
    this._keys.forEach(key => {
      delete this._map[key]
    })

    this._keys.length = 0

    this._triggerStorage(null, null, null, true)
  }
}

module.exports = SessionStorage
