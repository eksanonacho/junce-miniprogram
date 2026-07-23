import { BASE_URL } from '../config/index.js'
import { useUserStore } from '../stores/user.js'

const TIMEOUT = 15000
let isRedirecting = false

/**
 * 核心请求函数
 * - 自动拼接 BASE_URL
 * - 自动带 Authorization header（skipAuth 时跳过）
 * - 统一处理状态码 + toast
 * - GET 请求的 data 参数由 uni.request 自动拼成 query string
 *
 * 注意：useUserStore() 在函数体内调用而非模块顶层，
 * 确保 Pinia 已通过 main.js 的 app.use(pinia) 激活。
 */
function request({ url, method = 'GET', data = {}, skipAuth = false }) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }

    // 非登录接口自动带 token
    if (!skipAuth) {
      const userStore = useUserStore()
      const token = userStore.token
      if (token) {
        header['Authorization'] = `Bearer ${token}`
      }
    }

    uni.request({
      url: BASE_URL + url,
      method,
      header,
      data,
      timeout: TIMEOUT,
      success: (res) => {
        const { statusCode, data: resData } = res
        if (statusCode === 200 || statusCode === 201) {
          resolve(resData)
        } else if (statusCode === 400) {
          uni.showToast({ title: resData.message || '请求参数错误', icon: 'none' })
          reject(new Error(resData.message || '请求参数错误'))
        } else if (statusCode === 401) {
          if (skipAuth) {
            // 认证类接口 401：账号密码错误，不清登录态，显示后端返回的 message
            uni.showToast({ title: resData.message || '登录失败', icon: 'none' })
          } else {
            // 业务类接口 401：token 失效或未登录，清登录态
            const userStore = useUserStore()
            userStore.clearLoginInfo()
            uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
            // 防重复跳转：isRedirecting 锁 + reLaunch complete 自动解锁
            if (!skipAuth && !isRedirecting) {
              isRedirecting = true
              uni.reLaunch({
                url: '/pages/login/login',
                complete: () => {
                  isRedirecting = false
                }
              })
            }
          }
          reject(new Error(resData.message || '未认证'))
        } else if (statusCode === 403) {
          uni.showToast({ title: '无权限', icon: 'none' })
          reject(new Error('无权限'))
        } else if (statusCode === 409) {
          uni.showToast({ title: resData.message || '请求失败', icon: 'none' })
          reject(new Error(resData.message || '请求失败'))
        } else if (statusCode === 500) {
          uni.showToast({ title: '服务器异常，请稍后重试', icon: 'none' })
          reject(new Error('服务器异常'))
        } else {
          uni.showToast({ title: '请求失败', icon: 'none' })
          reject(new Error('请求失败'))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络连接失败，请检查网络', icon: 'none' })
        reject(err)
      }
    })
  })
}

/**
 * GET 请求
 * @param {string} url  相对路径，如 '/customers'
 * @param {object} params  查询参数对象，如 { tier: 'VIP' }
 *                         uni.request 发现 method=GET 时自动将 data 拼为 query string
 */
export function get(url, params) {
  return request({ url, method: 'GET', data: params })
}

/**
 * POST 请求
 * @param {string} url
 * @param {object} data  请求体
 * @param {object} opts  可选配置，如 { skipAuth: true }
 */
export function post(url, data, opts = {}) {
  return request({ url, method: 'POST', data, ...opts })
}

/**
 * PATCH 请求
 * @param {string} url
 * @param {object} data  只传要修改的字段
 */
export function patch(url, data) {
  return request({ url, method: 'PATCH', data })
}

/**
 * PUT 请求
 * @param {string} url
 * @param {object} data  请求体
 */
export function put(url, data) {
  return request({ url, method: 'PUT', data })
}
