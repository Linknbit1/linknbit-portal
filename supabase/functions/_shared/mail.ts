// Shared invite/recovery email sender (used by invite-user and resend-invite).
// Best-effort: returns whether Resend accepted the send; callers always have the
// link as a fallback. No-op (returns false) when RESEND_API_KEY isn't configured.

export async function sendInviteEmail(to: string, name: string, link: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey || !link) return false

  const from = Deno.env.get('RESEND_FROM') ?? 'Linknbit <onboarding@resend.dev>'
  const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>You've been invited to the Linknbit Operations Portal</h2>
        <p>Hi ${name}, an administrator has created an account for you.</p>
        <p>Click below to set your password and sign in:</p>
        <p><a href="${link}" style="display:inline-block;background:#EE2737;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Accept invite</a></p>
        <p style="color:#888;font-size:12px">If the button doesn't work, copy this link:<br>${link}</p>
      </div>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: 'Your Linknbit Portal invitation', html }),
    })
    return res.ok
  } catch {
    return false
  }
}
