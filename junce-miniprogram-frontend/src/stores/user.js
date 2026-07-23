import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'accessToken'
const USER_KEY = 'user'

export const useUserStore = defineStore('user', () => {
  // ========== state ==========
  const token = ref(uni.getStorageSync(TOKEN_KEY) || '')
  const user = ref(loadUserFromStorage())

  // ========== getters ==========
  const isLoggedIn = computed(() => !!token.value)

  // ========== actions ==========
  function setLoginInfo(accessToken, userObj) {
    token.value = accessToken
    user.value = userObj
    uni.setStorageSync(TOKEN_KEY, accessToken)
    uni.setStorageSync(USER_KEY, JSON.stringify(userObj))
  }

  function clearLoginInfo() {
    token.value = ''
    user.value = null
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(USER_KEY)
  }

  // ========== 内部辅助 ==========
  function loadUserFromStorage() {
    const raw = uni.getStorageSync(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  return { token, user, isLoggedIn, setLoginInfo, clearLoginInfo }
})
