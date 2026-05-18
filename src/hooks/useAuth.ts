import { useMutation } from '@tanstack/react-query'
import { useAuthContext } from '../context/AuthContext'
import {
  signInWithPassword,
  signOut,
  sendOtp,
  verifyOtp,
  updatePassword,
} from '../api/auth'

export { useAuthContext as useSession }

export function useSignIn() {
  return useMutation({ mutationFn: ({ email, password }: { email: string; password: string }) =>
    signInWithPassword(email, password) })
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut })
}

export function useSendOtp() {
  return useMutation({ mutationFn: (email: string) => sendOtp(email) })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ email, token }: { email: string; token: string }) => verifyOtp(email, token),
  })
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: (newPassword: string) => updatePassword(newPassword) })
}
