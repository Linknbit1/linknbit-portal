import { useMutation } from '@tanstack/react-query'
import { useAuthContext } from '../context/AuthContext'
import { sendOtp, verifyOtp, updatePassword, sendPasswordResetEmail } from '../api/auth'

export { useAuthContext as useSession }

export function useSignIn() {
  const { signIn } = useAuthContext()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  })
}

export function useSignOut() {
  const { signOut } = useAuthContext()
  return useMutation({ mutationFn: () => signOut() })
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

export function useSendPasswordReset() {
  return useMutation({ mutationFn: (email: string) => sendPasswordResetEmail(email) })
}
