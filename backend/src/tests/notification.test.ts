import { TelegramNotificationService, createNotificationService } from '../services/notification'

// Mock fetch globally
global.fetch = jest.fn()

describe('TelegramNotificationService', () => {
  let service: TelegramNotificationService
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockClear()
    service = new TelegramNotificationService('test-token', [123456789, 987654321])
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('sendAppCreationNotification', () => {
    it('should send notification to all chat IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const result = await service.sendAppCreationNotification('Test App', 'Test Description', 1, 10)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Check first call
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://api.telegram.org/bottest-token/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 123456789,
          text: '🆕 New App Created!\n\n📱 *Test App* (ID: 1)\n\nTest Description\n\n📊 Total Apps: *10*',
          parse_mode: 'Markdown',
        }),
      })

      // Check second call
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://api.telegram.org/bottest-token/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 987654321,
          text: '🆕 New App Created!\n\n📱 *Test App* (ID: 1)\n\nTest Description\n\n📊 Total Apps: *10*',
          parse_mode: 'Markdown',
        }),
      })
    })

    it('should return true if at least one message succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'OK',
        } as Response)

      const result = await service.sendAppCreationNotification('Test App', 'Test Description', 1, 10)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return false if all messages fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Error',
      } as Response)

      const result = await service.sendAppCreationNotification('Test App', 'Test Description', 1, 10)

      expect(result).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('sendTemplateCreationNotification', () => {
    it('should send notification to all chat IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const result = await service.sendTemplateCreationNotification('Test Template', 'Test Description', 1, 5)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Verify the messages contain the expected template information
      const call1 = mockFetch.mock.calls[0]
      const call2 = mockFetch.mock.calls[1]

      expect(call1[1]?.body).toContain('Test Template')
      expect(call1[1]?.body).toContain('ID: 1')
      expect(call2[1]?.body).toContain('Test Template')
      expect(call2[1]?.body).toContain('ID: 1')
    })
  })

  describe('sendUserRegistrationNotification', () => {
    it('should send notification to all chat IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const result = await service.sendUserRegistrationNotification('0x123456789', 100)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      // Verify the messages contain the expected user information
      const call1 = mockFetch.mock.calls[0]
      const call2 = mockFetch.mock.calls[1]

      expect(call1[1]?.body).toContain('0x123456789')
      expect(call1[1]?.body).toContain('100')
      expect(call2[1]?.body).toContain('0x123456789')
      expect(call2[1]?.body).toContain('100')
    })
  })

  describe('sendFeedbackNotification', () => {
    it('should send notification to all chat IDs with email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const result = await service.sendFeedbackNotification('Great app!', 'test@example.com')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Great app!'),
        }),
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('test@example.com'),
        }),
      )
    })

    it('should send notification to all chat IDs without email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const result = await service.sendFeedbackNotification('Great app!')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Not provided'),
        }),
      )
    })

    it('should truncate long feedback', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => 'OK',
      } as Response)

      const longFeedback = 'a'.repeat(2100) // Longer than MAX_FEEDBACK_LENGTH
      const result = await service.sendFeedbackNotification(longFeedback)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('... (truncated)'),
        }),
      )
    })
  })
})

describe('createNotificationService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create TelegramNotificationService with single chat ID', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_CHAT_ID = '123456789'

    const service = createNotificationService()
    expect(service).toBeInstanceOf(TelegramNotificationService)
  })

  it('should create TelegramNotificationService with multiple chat IDs', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_CHAT_ID = '123456789,987654321,555666777'

    const service = createNotificationService()
    expect(service).toBeInstanceOf(TelegramNotificationService)
  })

  it('should create mock service when bot token is missing', () => {
    process.env.TELEGRAM_CHAT_ID = '123456789'
    delete process.env.TELEGRAM_BOT_TOKEN

    const service = createNotificationService()
    expect(service).not.toBeInstanceOf(TelegramNotificationService)
  })

  it('should create mock service when chat ID is missing', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    delete process.env.TELEGRAM_CHAT_ID

    const service = createNotificationService()
    expect(service).not.toBeInstanceOf(TelegramNotificationService)
  })

  it('should create mock service when chat ID is empty', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_CHAT_ID = ''

    const service = createNotificationService()
    expect(service).not.toBeInstanceOf(TelegramNotificationService)
  })

  it('should create mock service when chat ID contains only invalid values', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_CHAT_ID = 'invalid,not-a-number,,,   '

    const service = createNotificationService()
    expect(service).not.toBeInstanceOf(TelegramNotificationService)
  })
})
