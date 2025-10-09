import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production'
    ? process.env.GOOGLE_REDIRECT_URI_PROD
    : process.env.GOOGLE_REDIRECT_URI
)

// Basic scopes for signup/login
export const GOOGLE_BASIC_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

// Calendar scopes for calendar integration
export const GOOGLE_CALENDAR_SCOPES = [
  ...GOOGLE_BASIC_SCOPES,
  'https://www.googleapis.com/auth/calendar.events',
]

export function getGoogleAuthUrl(state?: string) {
  // Use basic scopes for signup, full scopes for calendar connection
  const scopes = state === 'connect_calendar'
    ? GOOGLE_CALENDAR_SCOPES
    : GOOGLE_BASIC_SCOPES

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force refresh token
    state: state || 'signup', // 'signup' or 'connect_calendar'
  })
}

export async function getGoogleTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getGoogleUserInfo(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken })
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  return data
}

export function getOAuth2Client(accessToken: string, refreshToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return client
}
