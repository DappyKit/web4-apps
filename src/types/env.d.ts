declare namespace NodeJS {
  interface ProcessEnv {
    GITHUB_CLIENT_ID: string
    // Add any other environment variables used in the application
    NODE_ENV: 'development' | 'production' | 'test'
    VITE_APP_API_URL?: string
  }
}

export {}
